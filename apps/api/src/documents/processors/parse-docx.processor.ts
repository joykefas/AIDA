import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as mammoth from 'mammoth';
import { StorageProvider } from '../../providers/storage.provider';
import { PrismaService } from '../../prisma/prisma.service';
import { IngestionService } from '../ingestion.service';
import {
  QUEUE_PARSE_DOCX,
  DocumentJobData,
} from '../../queue/queue.constants';

@Processor(QUEUE_PARSE_DOCX)
export class ParseDocxProcessor extends WorkerHost {
  constructor(
    private storage: StorageProvider,
    private prisma: PrismaService,
    private ingestion: IngestionService,
  ) {
    super();
  }

  async process(job: Job<DocumentJobData>) {
    const { documentId } = job.data;
    try {
      await this.ingestion.markProcessing(documentId);

      const document = await this.prisma.document.findUniqueOrThrow({
        where: { id: documentId },
      });

      if (!document.storageKey) {
        throw new Error('Document has no storage file to parse');
      }

      const fileBuffer = await this.storage.download(document.storageKey);
      
      const { value: text } = await mammoth.extractRawText({ buffer: fileBuffer });
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from DOCX');
      }

      await this.ingestion.setExtractedTextAndAdvance(documentId, text);
    } catch (err) {
      await this.ingestion.markFailed(documentId, (err as Error).message);
    }
  }
}
