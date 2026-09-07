import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class StartExamDto {
  @IsString()
  topicId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(180)
  durationMinutes?: number;
}
