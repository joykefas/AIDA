import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as argon2 from 'argon2';
import {
  AdminAuditLogItem,
  AdminDailySpendEntry,
  AdminFlaggedTutorMessage,
  AdminIngestionFailure,
  AdminOverviewStats,
  AdminQualityData,
  AdminQualitySampleItem,
  AdminUserCostOutlier,
  AdminUserListItem,
  ProcessingStatus,
  QuestionType,
  UserRole,
} from '@aida/shared';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  QUEUE_PARSE_PDF,
  QUEUE_TRANSCRIBE_AUDIO,
  QUEUE_FETCH_YOUTUBE_TRANSCRIPT,
  QUEUE_GENERATE_EMBEDDINGS,
  QUEUE_GENERATE_CONTENT,
} from '../queue/queue.constants';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    @InjectQueue(QUEUE_PARSE_PDF) private parsePdfQueue: Queue,
    @InjectQueue(QUEUE_TRANSCRIBE_AUDIO) private transcribeQueue: Queue,
    @InjectQueue(QUEUE_FETCH_YOUTUBE_TRANSCRIPT) private youtubeQueue: Queue,
    @InjectQueue(QUEUE_GENERATE_EMBEDDINGS) private embeddingsQueue: Queue,
    @InjectQueue(QUEUE_GENERATE_CONTENT) private contentQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.seedSuperAdmin();
  }

  async seedSuperAdmin(): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@aida.app';
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
    const adminName = process.env.ADMIN_NAME ?? 'Super Admin';

    try {
      const existing = await this.prisma.user.findUnique({
        where: { email: adminEmail },
      });

      if (!existing) {
        const passwordHash = await argon2.hash(adminPassword);
        const birthdate = new Date('1990-01-01');

        await this.prisma.user.create({
          data: {
            email: adminEmail,
            passwordHash,
            displayName: adminName,
            birthdate,
            isMinor: false,
            role: UserRole.ADMIN,
          },
        });
        this.logger.log(`Seeded super admin user (${adminEmail}) on API start`);
      } else {
        const updates: { role?: UserRole; passwordHash?: string } = {};
        if ((existing.role as string) !== (UserRole.ADMIN as string)) {
          updates.role = UserRole.ADMIN;
        }
        if (!existing.passwordHash) {
          updates.passwordHash = await argon2.hash(adminPassword);
        }
        if (Object.keys(updates).length > 0) {
          await this.prisma.user.update({
            where: { id: existing.id },
            data: updates,
          });
          this.logger.log(
            `Updated existing user (${adminEmail}) with ADMIN privileges`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to seed super admin on startup', error);
    }
  }

  async getOverview(): Promise<AdminOverviewStats> {
    const [
      totalUsers,
      minorUsers,
      totalDocuments,
      documentsProcessing,
      documentsReady,
      documentsFailed,
      totalQuizzesTaken,
      totalTutorMessages,
      activeDisputes,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isMinor: true } }),
      this.prisma.document.count(),
      this.prisma.document.count({
        where: {
          status: {
            in: [ProcessingStatus.PENDING, ProcessingStatus.PROCESSING],
          },
        },
      }),
      this.prisma.document.count({ where: { status: ProcessingStatus.READY } }),
      this.prisma.document.count({
        where: { status: ProcessingStatus.FAILED },
      }),
      this.prisma.quizAttempt.count(),
      this.prisma.tutorMessage.count(),
      this.prisma.quizAttempt.count({ where: { isDisputed: true } }),
    ]);

    // Live Queue Inspection
    const queues = [
      this.parsePdfQueue,
      this.transcribeQueue,
      this.youtubeQueue,
      this.embeddingsQueue,
      this.contentQueue,
    ];

    let waiting = 0;
    let active = 0;
    let failed = 0;
    let completed = 0;

    for (const q of queues) {
      try {
        const counts = await q.getJobCounts(
          'waiting',
          'active',
          'failed',
          'completed',
        );
        waiting += counts.waiting ?? 0;
        active += counts.active ?? 0;
        failed += counts.failed ?? 0;
        completed += counts.completed ?? 0;
      } catch (err) {
        this.logger.debug(
          `Could not query queue counts: ${(err as Error).message}`,
        );
      }
    }

    // Token and Spend Estimates based on activity
    const estimatedTokensUsed =
      documentsReady * 3000 +
      totalTutorMessages * 1500 +
      totalQuizzesTaken * 1000;
    const estimatedSpendUsd = Number(
      ((estimatedTokensUsed / 1_000_000) * 0.15).toFixed(4),
    );

    // ── Granular Telemetry ──────────────────────────────────────────────────

    // 1. 7-Day Daily Spend Breakdown
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const [recentDocs, recentMessages, recentQuizzes] = await Promise.all([
      this.prisma.document.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      this.prisma.tutorMessage.findMany({
        where: { createdAt: { gte: sevenDaysAgo }, role: 'assistant' },
        select: { createdAt: true },
      }),
      this.prisma.quizAttempt.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
    ]);

    const dailyMap = new Map<
      string,
      { documentCount: number; tutorMessageCount: number; quizCount: number }
    >();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - (6 - i));
      dailyMap.set(d.toISOString().slice(0, 10), {
        documentCount: 0,
        tutorMessageCount: 0,
        quizCount: 0,
      });
    }

    for (const doc of recentDocs) {
      const key = doc.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(key);
      if (entry) entry.documentCount++;
    }
    for (const msg of recentMessages) {
      const key = msg.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(key);
      if (entry) entry.tutorMessageCount++;
    }
    for (const quiz of recentQuizzes) {
      const key = quiz.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(key);
      if (entry) entry.quizCount++;
    }

    const dailySpend: AdminDailySpendEntry[] = Array.from(
      dailyMap.entries(),
    ).map(([date, v]) => {
      const tokensUsed =
        v.documentCount * 3000 +
        v.tutorMessageCount * 1500 +
        v.quizCount * 1000;
      return {
        date,
        tokensUsed,
        spendUsd: Number(((tokensUsed / 1_000_000) * 0.15).toFixed(4)),
        ...v,
      };
    });

    // 2. Top 5 Cost Outlier Users
    const topUsers = await this.prisma.user.findMany({
      take: 50,
      select: {
        id: true,
        email: true,
        _count: {
          select: {
            documents: true,
            tutorMessages: true,
            quizAttempts: true,
          },
        },
      },
    });

    const userOutliers: AdminUserCostOutlier[] = topUsers
      .map((u) => {
        const estimatedTokens =
          u._count.documents * 3000 +
          u._count.tutorMessages * 1500 +
          u._count.quizAttempts * 1000;
        return {
          userId: u.id,
          userEmail: u.email,
          estimatedTokens,
          estimatedSpendUsd: Number(
            ((estimatedTokens / 1_000_000) * 0.15).toFixed(4),
          ),
          documentCount: u._count.documents,
          messageCount: u._count.tutorMessages,
          quizCount: u._count.quizAttempts,
        };
      })
      .sort((a, b) => b.estimatedTokens - a.estimatedTokens)
      .slice(0, 5);

    // 3. Average Time-to-Ready (seconds)
    let averageTimeToReadySeconds: number | undefined;
    try {
      const readyDocs = await this.prisma.document.findMany({
        where: { status: ProcessingStatus.READY },
        select: { createdAt: true, updatedAt: true },
        take: 500,
      });
      if (readyDocs.length > 0) {
        const totalMs = readyDocs.reduce(
          (sum, d) => sum + (d.updatedAt.getTime() - d.createdAt.getTime()),
          0,
        );
        averageTimeToReadySeconds = Math.round(
          totalMs / readyDocs.length / 1000,
        );
      }
    } catch (err) {
      this.logger.debug(
        `Could not compute averageTimeToReady: ${(err as Error).message}`,
      );
    }

    // 4. Feature Usage Counts
    const [examsTaken, reviewsCompleted]: [number, number] = await Promise.all([
      this.prisma.examSession.count().catch(() => 0),
      this.prisma.topic.count({
        where: { repetitions: { gt: 0 } },
      }),
    ]);

    // 5. Spaced-Repetition Adherence Rate
    let spacedRepetitionAdherenceRate: number | undefined;
    try {
      const now = new Date();
      const [reviewedTopics, totalTopicsWithActivity] = await Promise.all([
        // Topics that have been reviewed and whose nextReviewDue was in the past at time of last update
        // (i.e. reviewed on time: updatedAt >= nextReviewDue is not feasible without raw SQL;
        //  approximate: topics with repetitions > 0 and nextReviewDue still in the future)
        this.prisma.topic.count({
          where: {
            repetitions: { gt: 0 },
            nextReviewDue: { gte: now }, // next due is in the future → review was on time
          },
        }),
        this.prisma.topic.count({ where: { repetitions: { gt: 0 } } }),
      ]);
      spacedRepetitionAdherenceRate =
        totalTopicsWithActivity > 0
          ? Math.round((reviewedTopics / totalTopicsWithActivity) * 100)
          : 100;
    } catch (err) {
      this.logger.debug(
        `Could not compute SR adherence: ${(err as Error).message}`,
      );
    }

    return {
      totalUsers,
      minorUsers,
      totalDocuments,
      documentsProcessing,
      documentsReady,
      documentsFailed,
      totalQuizzesTaken,
      totalTutorMessages,
      activeDisputes,
      queueMetrics: {
        waiting,
        active,
        failed,
        completed,
      },
      estimatedTokensUsed,
      estimatedSpendUsd,
      dailySpend,
      userOutliers,
      averageTimeToReadySeconds,
      featureUsage: {
        uploads: totalDocuments,
        tutorChats: totalTutorMessages,
        quizzesTaken: totalQuizzesTaken,
        examsTaken,
        reviewsCompleted,
      },
      spacedRepetitionAdherenceRate,
    };
  }

  async listUsers(
    search?: string,
    isMinor?: boolean,
  ): Promise<AdminUserListItem[]> {
    const where: Prisma.UserWhereInput = {};
    if (isMinor !== undefined) where.isMinor = isMinor;
    if (search && search.trim()) {
      where.OR = [
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { displayName: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        _count: {
          select: {
            documents: true,
            quizAttempts: true,
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role as UserRole,
      isMinor: u.isMinor,
      parentalConsentGiven: u.parentalConsentGiven,
      documentCount: u._count.documents,
      quizAttemptCount: u._count.quizAttempts,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async updateUser(
    adminId: string,
    targetUserId: string,
    dto: UpdateAdminUserDto,
  ): Promise<AdminUserListItem> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        _count: {
          select: { documents: true, quizAttempts: true },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found.');

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(dto.parentalConsentGiven !== undefined
          ? { parentalConsentGiven: dto.parentalConsentGiven }
          : {}),
        ...(dto.isMinor !== undefined ? { isMinor: dto.isMinor } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
      },
      include: {
        _count: {
          select: { documents: true, quizAttempts: true },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'ADMIN_USER_UPDATE',
        targetUserId,
        metadata: {
          changes: { ...dto },
          timestamp: new Date().toISOString(),
        },
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role as UserRole,
      isMinor: updated.isMinor,
      parentalConsentGiven: updated.parentalConsentGiven,
      documentCount: updated._count.documents,
      quizAttemptCount: updated._count.quizAttempts,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async getQualityData(): Promise<AdminQualityData> {
    const [disputedQuizzes, flaggedTutorMessagesRaw, ingestionFailuresRaw] =
      await Promise.all([
        this.getQualitySamples(),
        this.prisma.tutorMessage.findMany({
          where: {
            // Include all rating variants ('down' legacy + 'UNHELPFUL' current) and any with text feedback
            OR: [
              { rating: 'down' },
              { rating: 'UNHELPFUL' },
              { feedbackText: { not: null } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            user: { select: { email: true } },
          },
        }),
        this.prisma.document.findMany({
          where: { status: ProcessingStatus.FAILED },
          orderBy: { updatedAt: 'desc' },
          take: 50,
          include: {
            user: { select: { email: true } },
          },
        }),
      ]);

    const flaggedTutorMessages: AdminFlaggedTutorMessage[] =
      flaggedTutorMessagesRaw.map((m) => ({
        id: m.id,
        userId: m.userId,
        userEmail: m.user.email,
        content: m.content,
        role: m.role,
        rating: m.rating,
        feedbackText: m.feedbackText,
        createdAt: m.createdAt.toISOString(),
      }));

    const ingestionFailures: AdminIngestionFailure[] = ingestionFailuresRaw.map(
      (d) => ({
        id: d.id,
        userId: d.userId,
        userEmail: d.user.email,
        title: d.title,
        type: d.type,
        failureReason: d.failureReason,
        createdAt: d.createdAt.toISOString(),
      }),
    );

    return {
      disputedQuizzes,
      flaggedTutorMessages,
      ingestionFailures,
    };
  }

  async getQualitySamples(): Promise<AdminQualitySampleItem[]> {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: {
        question: { type: QuestionType.WRITTEN },
      },
      orderBy: [{ isDisputed: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      include: {
        user: { select: { email: true } },
        question: true,
      },
    });

    return attempts.map((a) => ({
      id: a.id,
      userId: a.userId,
      userEmail: a.user.email,
      questionPrompt: a.question.prompt,
      userAnswer: a.userAnswer,
      correctAnswer: a.question.correctAnswer,
      score: a.score,
      aiFeedback: a.aiFeedback,
      isDisputed: a.isDisputed,
      disputeReason: a.disputeReason,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  async getComplianceLogs(): Promise<AdminAuditLogItem[]> {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return logs.map((l) => ({
      id: l.id,
      actorId: l.actorId,
      action: l.action,
      targetUserId: l.targetUserId,
      metadata: (l.metadata as Prisma.JsonObject | null) ?? null,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async exportUserData(adminId: string, targetUserId: string) {
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'ADMIN_USER_EXPORT',
        targetUserId,
        metadata: {
          performedByAdmin: true,
          timestamp: new Date().toISOString(),
        },
      },
    });
    return this.usersService.exportUserData(targetUserId);
  }

  async deleteUser(adminId: string, targetUserId: string) {
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'ADMIN_USER_DELETION',
        targetUserId,
        metadata: {
          performedByAdmin: true,
          timestamp: new Date().toISOString(),
        },
      },
    });
    return this.usersService.deleteAccount(targetUserId);
  }
}
