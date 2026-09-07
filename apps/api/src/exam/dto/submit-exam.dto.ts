import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

export class ExamAnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  answer: string;
}

export class SubmitExamDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamAnswerDto)
  answers: ExamAnswerDto[];
}
