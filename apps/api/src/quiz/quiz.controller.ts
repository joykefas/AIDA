import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/jwt.types';
import { QuizService } from './quiz.service';
import { QuizAttemptDto } from './dto/quiz-attempt.dto';
import { DisputeQuizAttemptDto } from './dto/dispute-quiz-attempt.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class QuizController {
  constructor(private quizService: QuizService) {}

  @Get('topics/:topicId/quiz')
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Param('topicId') topicId: string,
  ) {
    return this.quizService.listForTopic(user.sub, topicId);
  }

  @Post('topics/:topicId/quiz/generate')
  generate(
    @CurrentUser() user: AccessTokenPayload,
    @Param('topicId') topicId: string,
  ) {
    return this.quizService.generateMore(user.sub, topicId);
  }

  @Post('quiz/:questionId/attempt')
  attempt(
    @CurrentUser() user: AccessTokenPayload,
    @Param('questionId') questionId: string,
    @Body() dto: QuizAttemptDto,
  ) {
    return this.quizService.attempt(user.sub, questionId, dto.answer);
  }

  @Post('quiz/attempts/:id/dispute')
  dispute(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: DisputeQuizAttemptDto,
  ) {
    return this.quizService.disputeAttempt(user.sub, id, dto.disputeReason);
  }
}
