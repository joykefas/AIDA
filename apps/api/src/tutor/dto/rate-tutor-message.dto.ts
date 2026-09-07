import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TutorMessageRating } from '@aida/shared';

export class RateTutorMessageDto {
  @IsEnum(TutorMessageRating)
  rating: TutorMessageRating;

  @IsOptional()
  @IsString()
  feedbackText?: string;
}
