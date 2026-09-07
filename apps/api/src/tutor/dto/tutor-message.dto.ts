import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { TutorMessageRequest } from '@aida/shared';

export class TutorMessageDto implements TutorMessageRequest {
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsBoolean()
  simplify?: boolean;
}
