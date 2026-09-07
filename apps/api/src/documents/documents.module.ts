import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReviewModule } from '../review/review.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { IngestionService } from './ingestion.service';
import { ParsePdfProcessor } from './processors/parse-pdf.processor';
import { TranscribeAudioProcessor } from './processors/transcribe-audio.processor';
import { FetchYoutubeTranscriptProcessor } from './processors/fetch-youtube-transcript.processor';
import { GenerateEmbeddingsProcessor } from './processors/generate-embeddings.processor';
import { GenerateContentProcessor } from './processors/generate-content.processor';
import {
  QUEUE_PARSE_PDF,
  QUEUE_TRANSCRIBE_AUDIO,
  QUEUE_FETCH_YOUTUBE_TRANSCRIPT,
  QUEUE_GENERATE_EMBEDDINGS,
  QUEUE_GENERATE_CONTENT,
} from '../queue/queue.constants';

@Module({
  imports: [
    ReviewModule,
    BullModule.registerQueue(
      { name: QUEUE_PARSE_PDF },
      { name: QUEUE_TRANSCRIBE_AUDIO },
      { name: QUEUE_FETCH_YOUTUBE_TRANSCRIPT },
      { name: QUEUE_GENERATE_EMBEDDINGS },
      { name: QUEUE_GENERATE_CONTENT },
    ),
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    IngestionService,
    ParsePdfProcessor,
    TranscribeAudioProcessor,
    FetchYoutubeTranscriptProcessor,
    GenerateEmbeddingsProcessor,
    GenerateContentProcessor,
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
