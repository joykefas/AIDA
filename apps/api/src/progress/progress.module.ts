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
    // Default: Monday 08:00 UTC. Override via WEEKLY_REPORT_CRON env var
    // (standard 5-field cron, server runs UTC). Example for 09:00 WAT (UTC+1):
    //   WEEKLY_REPORT_CRON="0 8 * * 1"
    const cronPattern = process.env.WEEKLY_REPORT_CRON ?? '0 8 * * 1';
    await this.queue.upsertJobScheduler(
      'weekly-report-every-monday',
      { pattern: cronPattern },
      {
        name: 'weekly',
        data: {},
      },
    );
  }
}
