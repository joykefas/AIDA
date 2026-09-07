import { IsEnum } from 'class-validator';
import { LearningStyle, SetLearningStyleRequest } from '@aida/shared';

export class SetLearningStyleDto implements SetLearningStyleRequest {
  @IsEnum(LearningStyle)
  learningStyle!: LearningStyle;
}
