import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocType } from '@aida/shared';

export class UploadDocumentDto {
  @IsEnum(DocType)
  type!: DocType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  textContent?: string;
}
