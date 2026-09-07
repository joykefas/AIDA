import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { SendWeeklyReportProcessor } from './processors/send-weekly-report.processor';
import { QUEUE_SEND_WEEKLY_REPORT } from '../queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_SEND_WEEKLY_REPORT })],
  controllers: [ProgressController],
  providers: [ProgressService, SendWeeklyReportProcessor],
  exports: [ProgressService],
})
export class ProgressModule implements OnModuleInit {
  constructor(@InjectQueue(QUEUE_SEND_WEEKLY_REPORT) private queue: Queue) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'weekly-report-every-monday',
      { pattern: '0 8 * * 1' },
      {
        name: 'weekly',
        data: {},
      },
    );
  }
}
