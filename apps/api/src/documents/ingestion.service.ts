import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ProcessingStatus, LearningStyle } from '@aida/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LlmProvider } from '../providers/llm.provider';
import { EmbeddingProvider } from '../providers/embedding.provider';
import { ReviewService } from '../review/review.service';
import {
  QUEUE_GENERATE_EMBEDDINGS,
  QUEUE_GENERATE_CONTENT,
} from '../queue/queue.constants';
import { chunkText, toVectorLiteral } from './embeddings.util';

const CHUNK_SIZE = 500;

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LlmProvider,
    private embeddingProvider: EmbeddingProvider,
    private reviewService: ReviewService,
    @InjectQueue(QUEUE_GENERATE_EMBEDDINGS) private embeddingsQueue: Queue,
    @InjectQueue(QUEUE_GENERATE_CONTENT) private contentQueue: Queue,
  ) {}

  async markProcessing(documentId: string) {
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: ProcessingStatus.PROCESSING },
    });
  }

  async markFailed(documentId: string, reason: string) {
    this.logger.error(`Document ${documentId} failed: ${reason}`);
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: ProcessingStatus.FAILED, failureReason: reason },
    });
  }

  /** Called by parse-pdf / transcribe-audio / fetch-youtube-transcript once raw text is extracted. */
  async setExtractedTextAndAdvance(documentId: string, text: string) {
    await this.prisma.document.update({
      where: { id: documentId },
      data: { extractedText: text },
    });
    await this.embeddingsQueue.add('embed', { documentId });
  }

  /** generate-embeddings stage: chunk extracted text, store embedding rows, advance to content generation. */
  async generateEmbeddingsForDocument(documentId: string) {
    const document = await this.prisma.document.findUniqueOrThrow({
      where: { id: documentId },
    });
    const text = document.extractedText ?? document.title;

    const chunks = chunkText(text, CHUNK_SIZE);

    // A placeholder Topic must exist before embeddings can attach to it —
    // full content gets filled in by the generate-content stage.
    // Uses the unique (documentId, isPrimary) constraint for idempotency.
    let topic = await this.prisma.topic.findFirst({
      where: { documentId, isPrimary: true },
    });
    if (!topic) {
      topic = await this.prisma.topic.create({
        data: { documentId, title: document.title, isPrimary: true },
      });
    }

    await this.prisma.embedding.deleteMany({ where: { topicId: topic.id } });
    const vectors = await this.embeddingProvider.embedBatch(chunks);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const vector = vectors[i];
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "Embedding" (id, "topicId", chunk, vector) VALUES (gen_random_uuid(), $1, $2, $3::vector)`,
        topic.id,
        chunk,
        toVectorLiteral(vector),
      );
    }

    await this.contentQueue.add('generate', { documentId });
  }

  /** generate-content stage: LlmProvider turns extracted text into summary/notes/mindmap/quiz, then the document goes READY. */
  async generateContentForDocument(documentId: string) {
    const document = await this.prisma.document.findUniqueOrThrow({
      where: { id: documentId },
      include: { user: { select: { learningStyle: true } } },
    });
    const text = document.extractedText ?? document.title;

    const generated = await this.llm.generateContent({
      title: document.title,
      rawText: text,
      learningStyle:
        (document.user?.learningStyle as LearningStyle | null) ?? null,
    });

    // Resolve topic list — multi-topic if `topics` present, else wrap legacy fields
    const topicList = generated.topics?.length
      ? generated.topics
      : [
          {
            title: document.title,
            summary: generated.summary ?? '',
            notes: generated.notes ?? [],
            mindMap: generated.mindMap ?? { nodes: [], edges: [] },
            quizQuestions: generated.quizQuestions ?? [],
          },
        ];

    const savedTopicIds: string[] = [];

    for (let i = 0; i < topicList.length; i++) {
      const t = topicList[i];
      const isPrimary = i === 0;

      // Find or create this topic row
      let topic = isPrimary
        ? await this.prisma.topic.findFirst({
            where: { documentId, isPrimary: true },
          })
        : null;

      if (!topic) {
        topic = await this.prisma.topic.create({
          data: { documentId, title: t.title, isPrimary },
        });
      }

      await this.prisma.topic.update({
        where: { id: topic.id },
        data: {
          title: t.title,
          summary: t.summary,
          notes: t.notes as unknown as Prisma.InputJsonValue,
          mindMapJson: t.mindMap as unknown as Prisma.InputJsonValue,
        },
      });

      await this.prisma.quizQuestion.deleteMany({
        where: { topicId: topic.id },
      });
      for (const q of t.quizQuestions) {
        await this.prisma.quizQuestion.create({
          data: {
            topicId: topic.id,
            type: q.type,
            prompt: q.prompt,
            options: (q.options ?? null) as unknown as Prisma.InputJsonValue,
            correctAnswer: q.correctAnswer,
          },
        });
      }

      savedTopicIds.push(topic.id);
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: ProcessingStatus.READY },
    });

    // Seed spaced-repetition schedule for every generated topic
    for (const topicId of savedTopicIds) {
      await this.reviewService.ensureScheduled(topicId);
    }
  }
}
