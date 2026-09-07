import { IsString, MinLength } from 'class-validator';

export class DisputeQuizAttemptDto {
  @IsString()
  @MinLength(3)
  disputeReason: string;
}
