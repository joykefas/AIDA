import {
  IsBoolean,
  IsEmail,
  IsISO8601,
  IsOptional,
  MinLength,
} from 'class-validator';
import { RegisterRequest } from '@aida/shared';

export class RegisterDto implements RegisterRequest {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @IsISO8601()
  birthdate!: string;

  @IsOptional()
  @IsBoolean()
  parentalConsentGiven?: boolean;
}
