import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as argon2 from 'argon2';
import {
  AdminAuditLogItem,
  AdminOverviewStats,
  AdminQualitySampleItem,
  AdminUserListItem,
  ProcessingStatus,
  QuestionType,
  UserRole,
} from '@aida/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
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
