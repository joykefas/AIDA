import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
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

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
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
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
