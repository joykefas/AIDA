import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import * as argon2 from 'argon2';
import { UserRole } from '@aida/shared';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { ProvidersModule } from './providers/providers.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DocumentsModule } from './documents/documents.module';
import { TopicsModule } from './topics/topics.module';
import { TutorModule } from './tutor/tutor.module';
import { QuizModule } from './quiz/quiz.module';
import { ReviewModule } from './review/review.module';
import { ProgressModule } from './progress/progress.module';
import { ContactModule } from './contact/contact.module';
import { ExamModule } from './exam/exam.module';
import { AdminModule } from './admin/admin.module';

import { UserThrottlerGuard } from './auth/guards/user-throttler.guard';

const startupJobsEnabled =
  process.env.NODE_ENV === 'production' ||
  process.env.ENABLE_STARTUP_JOBS !== 'false';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    BullModule.forRoot({
      connection: {
        host: (process.env.REDIS_HOST ?? 'localhost')
          .replace(/^https?:\/\//, '')
          .replace(/^rediss?:\/\//, '')
          .replace(/\/.*$/, ''),
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        tls:
          process.env.REDIS_TLS === 'true' ||
          (process.env.REDIS_HOST &&
            process.env.REDIS_HOST.includes('upstash.io'))
            ? {}
            : undefined,
      },
    }),
    // Bull-Board dashboard at /admin/queues — gated by AdminController's JWT + role guard
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    PrismaModule,
    ProvidersModule,
    AuthModule,
    UsersModule,
    DocumentsModule,
    TopicsModule,
    TutorModule,
    QuizModule,
    ReviewModule,
    ProgressModule,
    ContactModule,
    ExamModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: UserThrottlerGuard }],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    if (!startupJobsEnabled) {
      return;
    }

    await this.seedSuperAdmin();
  }

  private async seedSuperAdmin() {
    try {
      const superAdminEmail =
        this.configService.get<string>('SUPER_ADMIN_EMAIL') ||
        this.configService.get<string>('ADMIN_EMAIL') ||
        'admin@aida.app';
      const superAdminPassword =
        this.configService.get<string>('SUPER_ADMIN_PASSWORD') ||
        this.configService.get<string>('ADMIN_PASSWORD');
      const superAdminName =
        this.configService.get<string>('ADMIN_NAME') || 'Super Administrator';

      if (!superAdminPassword) {
        this.logger.error(
          '❌ ADMIN_PASSWORD not found in environment variables',
        );
        this.logger.error('Skipping super admin creation');
        return;
      }

      const birthdate = new Date();
      birthdate.setFullYear(birthdate.getFullYear() - 30);

      // Check if super admin already exists
      const existing = await this.prisma.user.findUnique({
        where: { email: superAdminEmail },
      });

      if (existing) {
        // Ensure the role is ADMIN, but do NOT overwrite existing password
        const superAdmin = await this.prisma.user.update({
          where: { email: superAdminEmail },
          data: {
            role: UserRole.ADMIN,
            displayName: superAdminName,
          },
        });
        this.logger.log('✅ Super admin ready!');
        this.logger.log(`📧 Email: ${superAdmin.email}`);
        return;
      }

      // Create new super admin with Argon2 hashed password
      const hashedPassword = await argon2.hash(superAdminPassword);
      const superAdmin = await this.prisma.user.create({
        data: {
          email: superAdminEmail,
          passwordHash: hashedPassword,
          displayName: superAdminName,
          role: UserRole.ADMIN,
          birthdate,
          isMinor: false,
        },
      });

      this.logger.log('✅ Super admin ready!');
      this.logger.log(`📧 Email: ${superAdmin.email}`);
      this.logger.warn('⚠️  Please change this password after first login!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to seed super admin: ${message}`);
      // Don't throw error to prevent app from crashing on start
    }
  }
}
