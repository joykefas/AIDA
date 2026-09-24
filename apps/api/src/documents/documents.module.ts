import { Module } from '@nestjs/common';
import { ReviewModule } from '../review/review.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { IngestionService } from './ingestion.service';

@Module({
  imports: [ReviewModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, IngestionService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
