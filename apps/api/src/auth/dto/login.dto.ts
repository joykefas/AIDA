import { IsEmail, MinLength } from 'class-validator';
import { LoginRequest } from '@aida/shared';

export class LoginDto implements LoginRequest {
  @IsEmail()
  email!: string;

  @MinLength(1)
  password!: string;
}
