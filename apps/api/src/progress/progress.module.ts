import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { WeeklyReportService } from './weekly-report.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [ProgressController],
  providers: [ProgressService, WeeklyReportService],
  exports: [ProgressService],
})
export class ProgressModule {}
