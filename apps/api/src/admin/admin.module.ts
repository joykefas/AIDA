import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import {
  QUEUE_PARSE_PDF,
  QUEUE_TRANSCRIBE_AUDIO,
  QUEUE_FETCH_YOUTUBE_TRANSCRIPT,
  QUEUE_GENERATE_EMBEDDINGS,
  QUEUE_GENERATE_CONTENT,
  QUEUE_SEND_WEEKLY_REPORT,
} from '../queue/queue.constants';

@Module({
  imports: [
    UsersModule,
    BullModule.registerQueue(
      { name: QUEUE_PARSE_PDF },
      { name: QUEUE_TRANSCRIBE_AUDIO },
      { name: QUEUE_FETCH_YOUTUBE_TRANSCRIPT },
      { name: QUEUE_GENERATE_EMBEDDINGS },
      { name: QUEUE_GENERATE_CONTENT },
      { name: QUEUE_SEND_WEEKLY_REPORT },
    ),
    // Bull-Board: registers all queues for the /admin/queues dashboard.
    // The board is mounted on AppModule (see app.module.ts) and the route
    // is guarded by the admin JWT + roles check in AdminController.
    BullBoardModule.forFeature(
      { name: QUEUE_PARSE_PDF, adapter: BullMQAdapter },
      { name: QUEUE_TRANSCRIBE_AUDIO, adapter: BullMQAdapter },
      { name: QUEUE_FETCH_YOUTUBE_TRANSCRIPT, adapter: BullMQAdapter },
      { name: QUEUE_GENERATE_EMBEDDINGS, adapter: BullMQAdapter },
      { name: QUEUE_GENERATE_CONTENT, adapter: BullMQAdapter },
      { name: QUEUE_SEND_WEEKLY_REPORT, adapter: BullMQAdapter },
    ),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
