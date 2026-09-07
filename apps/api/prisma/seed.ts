import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { LearningStyle, UserRole } from '@aida/shared';
import { MockLlmProvider } from '../src/providers/mock/mock-llm.provider';
import {
  pseudoEmbedding,
  chunkText,
  toVectorLiteral,
} from '../src/documents/embeddings.util';
import { applySm2, initialSm2State } from '../src/review/sm2';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const llm = new MockLlmProvider();

const SAMPLE_DOCS = [
  {
    title: 'Organic Chemistry — Ch. 4: Alkenes',
    text: "Alkenes are hydrocarbons containing at least one carbon-carbon double bond. The double bond consists of one sigma bond and one pi bond, which restricts rotation and gives rise to cis-trans isomerism. Alkenes are named using the -ene suffix. Addition reactions are the most characteristic reaction of alkenes, including hydrogenation, halogenation, and hydration. Markovnikov's rule predicts the regiochemistry of addition to unsymmetrical alkenes.",
    scoreProfile: 'strong' as const,
  },
  {
    title: 'Intro Macroeconomics — Fiscal Policy',
    text: 'Fiscal policy refers to the use of government spending and taxation to influence the economy. Expansionary fiscal policy increases spending or cuts taxes to stimulate demand during a recession. Contractionary fiscal policy does the opposite to cool an overheating economy. The fiscal multiplier describes how an initial change in spending leads to a larger change in total economic output. Automatic stabilizers, like unemployment insurance, adjust without new legislation.',
    scoreProfile: 'needsReview' as const,
  },
  {
    title: 'Linear Algebra — Eigenvalues and Eigenvectors',
    text: 'An eigenvector of a square matrix A is a nonzero vector v such that Av = lambda*v for some scalar lambda, the eigenvalue. Eigenvalues are found as roots of the characteristic polynomial det(A - lambda*I) = 0. Eigenvectors corresponding to distinct eigenvalues are linearly independent. Diagonalization expresses A as PDP^-1 where D is diagonal, which simplifies computing matrix powers.',
    scoreProfile: 'dueToday' as const,
  },
];

async function main() {
  const passwordHash = await argon2.hash('password123');
  const birthdate = new Date();
  birthdate.setFullYear(birthdate.getFullYear() - 20);

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@aida.app';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  const adminPasswordHash = await argon2.hash(adminPassword);
  const adminBirthdate = new Date();
  adminBirthdate.setFullYear(adminBirthdate.getFullYear() - 30);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.ADMIN },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      birthdate: adminBirthdate,
      isMinor: false,
      role: UserRole.ADMIN,
      displayName: process.env.ADMIN_NAME ?? 'Super Admin',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'demo@aida.app' },
    update: {},
    create: {
      email: 'demo@aida.app',
      passwordHash,
      birthdate,
      isMinor: false,
      learningStyle: LearningStyle.ANALOGIES,
      role: UserRole.STUDENT,
      displayName: 'Demo Student',
    },
  });

  for (const sample of SAMPLE_DOCS) {
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type: 'TEXT',
        title: sample.title,
        extractedText: sample.text,
        status: 'READY',
      },
    });

    const generated = await llm.generateContent({
      title: sample.title,
      rawText: sample.text,
    });

    const topic = await prisma.topic.create({
      data: {
        documentId: document.id,
        title: sample.title,
        summary: generated.summary,
        notes: generated.notes as unknown as Prisma.InputJsonValue,
        mindMapJson: generated.mindMap as unknown as Prisma.InputJsonValue,
      },
    });

    for (const chunk of chunkText(sample.text, 400)) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Embedding" (id, "topicId", chunk, vector) VALUES (gen_random_uuid(), $1, $2, $3::vector)`,
        topic.id,
        chunk,
        toVectorLiteral(pseudoEmbedding(chunk)),
      );
    }

    for (const q of generated.quizQuestions) {
      await prisma.quizQuestion.create({
        data: {
          topicId: topic.id,
          type: q.type,
          prompt: q.prompt,
          options: q.options as unknown as Prisma.InputJsonValue,
          correctAnswer: q.correctAnswer,
        },
      });
    }

    // Seed a review history so the three demo topics land in each of the
    // three signal states: mastered-and-scheduled, due today, needs-review.
    let state = applySm2(initialSm2State(), 0.8);
    if (sample.scoreProfile === 'strong') {
      state = applySm2(state, 0.95);
      state = applySm2(state, 0.9);
    } else if (sample.scoreProfile === 'needsReview') {
      state = applySm2(initialSm2State(), 0.3);
      state = applySm2(state, 0.4);
    } else {
      // force due date into the past so it shows up in today's queue
      const past = new Date();
      past.setDate(past.getDate() - 1);
      state = { ...state, nextReviewDue: past };
    }

    await prisma.topic.update({
      where: { id: topic.id },
      data: {
        easeFactor: state.easeFactor,
        intervalDays: state.intervalDays,
        repetitions: state.repetitions,
        consecutiveLowScores: state.consecutiveLowScores,
        nextReviewDue: state.nextReviewDue,
        masteryScore: state.masteryScore,
      },
    });
  }

  console.log(`Seeded super admin ${admin.email} (password: ${adminPassword})`);
  console.log(
    `Seeded demo user ${user.email} (password: password123) with ${SAMPLE_DOCS.length} documents.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
