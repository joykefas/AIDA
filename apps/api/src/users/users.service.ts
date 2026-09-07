import { Injectable, NotFoundException } from '@nestjs/common';
import { UserProfile, LearningStyle, UserDataExport } from '@aida/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StorageProvider } from '../providers/storage.provider';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageProvider,
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      learningStyle: user.learningStyle as LearningStyle | null,
      isMinor: user.isMinor,
      role: user.role as UserProfile['role'],
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined
          ? { displayName: dto.displayName }
          : {}),
        ...(dto.learningStyle !== undefined
          ? { learningStyle: dto.learningStyle }
          : {}),
      },
    });

    return this.getProfile(userId);
  }

  async setLearningStyle(
    userId: string,
    learningStyle: LearningStyle,
  ): Promise<UserProfile> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { learningStyle },
    });
    return this.getProfile(userId);
  }

  async exportUserData(userId: string): Promise<UserDataExport> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        documents: {
          include: {
            topics: true,
          },
        },
        quizAttempts: {
          include: {
            question: true,
          },
        },
        tutorMessages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found.');

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'USER_DATA_EXPORT',
        targetUserId: userId,
        metadata: { exportedAt: new Date().toISOString() },
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        birthdate: user.birthdate.toISOString(),
        isMinor: user.isMinor,
        parentalConsentGiven: user.parentalConsentGiven,
        learningStyle: user.learningStyle as LearningStyle | null,
        role: user.role as UserProfile['role'],
        createdAt: user.createdAt.toISOString(),
      },
      documents: user.documents.map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        topics: d.topics.map((t) => ({
          id: t.id,
          title: t.title,
          summary: t.summary,
          masteryScore: t.masteryScore,
        })),
      })),
      quizAttempts: user.quizAttempts.map((a) => ({
        id: a.id,
        questionPrompt: a.question.prompt,
        userAnswer: a.userAnswer,
        score: a.score,
        correct: a.correct,
        aiFeedback: a.aiFeedback,
        createdAt: a.createdAt.toISOString(),
      })),
      tutorMessages: user.tutorMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async deleteAccount(userId: string): Promise<{ deleted: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { documents: true },
    });
    if (!user) throw new NotFoundException('User not found.');

    // Clean up uploaded files in object storage
    for (const doc of user.documents) {
      if (doc.storageKey) {
        await this.storage.delete(doc.storageKey);
      }
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'USER_DATA_DELETION',
        targetUserId: userId,
        metadata: { email: user.email, deletedAt: new Date().toISOString() },
      },
    });

    // Cascade delete user in database
    await this.prisma.user.delete({ where: { id: userId } });

    return { deleted: true };
  }
}
