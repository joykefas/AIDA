import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { LearningMethod, TutorMessageRequest } from '@aida/shared';

export class TutorMessageDto implements TutorMessageRequest {
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsBoolean()
  simplify?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(LearningMethod, { each: true })
  learningMethods?: LearningMethod[];
}
