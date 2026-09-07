import { Module } from '@nestjs/common';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { ReviewModule } from '../review/review.module';

@Module({
  imports: [ReviewModule],
  controllers: [ExamController],
  providers: [ExamService],
  exports: [ExamService],
})
export class ExamModule {}
