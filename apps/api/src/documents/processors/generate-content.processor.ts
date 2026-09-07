import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { IngestionService } from '../ingestion.service';
import {
  QUEUE_GENERATE_CONTENT,
  DocumentJobData,
} from '../../queue/queue.constants';

@Processor(QUEUE_GENERATE_CONTENT)
export class GenerateContentProcessor extends WorkerHost {
  constructor(private ingestion: IngestionService) {
    super();
  }

  async process(job: Job<DocumentJobData>) {
    const { documentId } = job.data;
    try {
      await this.ingestion.generateContentForDocument(documentId);
    } catch (err) {
      await this.ingestion.markFailed(documentId, (err as Error).message);
    }
  }
}
