import { Module } from '@nestjs/common';
import { TopicsController } from './topics.controller';
import { PresentationsController } from './presentations.controller';
import { TutorModule } from '../tutor/tutor.module';

@Module({
  imports: [TutorModule],
  controllers: [TopicsController, PresentationsController],
})
export class TopicsModule {}
