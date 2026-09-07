import { IsEmail, MaxLength, MinLength } from 'class-validator';
import { CreateContactRequest } from '@aida/shared';

export class CreateContactDto implements CreateContactRequest {
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsEmail()
  email!: string;

  @MinLength(1)
  @MaxLength(4000)
  message!: string;
}
