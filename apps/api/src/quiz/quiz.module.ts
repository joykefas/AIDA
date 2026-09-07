import { Module } from '@nestjs/common';
import { ReviewModule } from '../review/review.module';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';

@Module({
  imports: [ReviewModule],
  controllers: [QuizController],
  providers: [QuizService],
})
export class QuizModule {}
