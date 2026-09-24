import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  LearningMethod,
  LearningStyle,
  UpdateProfileRequest,
} from '@aida/shared';

export class UpdateUserDto implements UpdateProfileRequest {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    }
    return value;
  })
  @ValidateIf((_, val) => val !== null && val !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string | null;

  @IsOptional()
  @IsEnum(LearningStyle)
  learningStyle?: LearningStyle;

  @IsOptional()
  @IsArray()
  @IsEnum(LearningMethod, { each: true })
  learningPreferences?: LearningMethod[];
}
