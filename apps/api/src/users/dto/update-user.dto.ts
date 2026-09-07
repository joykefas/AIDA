import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { LearningStyle } from '@aida/shared';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsEnum(LearningStyle)
  learningStyle?: LearningStyle;
}
