import { IsString, MinLength } from 'class-validator';
import { QuizAttemptRequest } from '@aida/shared';

export class QuizAttemptDto implements Omit<QuizAttemptRequest, 'questionId'> {
  @IsString()
  @MinLength(1)
  answer!: string;
}
