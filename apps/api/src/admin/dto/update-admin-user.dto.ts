import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@aida/shared';

export class UpdateAdminUserDto {
  @IsOptional()
  @IsBoolean()
  parentalConsentGiven?: boolean;

  @IsOptional()
  @IsBoolean()
  isMinor?: boolean;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
