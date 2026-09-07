import { Module } from '@nestjs/common';
import { TopicsController } from './topics.controller';
import { TutorModule } from '../tutor/tutor.module';

@Module({
  imports: [TutorModule],
  controllers: [TopicsController],
})
export class TopicsModule {}
