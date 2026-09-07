import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : '',
  )
  email: string;
}
