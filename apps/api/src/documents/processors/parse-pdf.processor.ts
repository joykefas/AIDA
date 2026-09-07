import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PDFParse } from 'pdf-parse';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageProvider } from '../../providers/storage.provider';
import { IngestionService } from '../ingestion.service';
import { QUEUE_PARSE_PDF, DocumentJobData } from '../../queue/queue.constants';

@Processor(QUEUE_PARSE_PDF)
export class ParsePdfProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private storage: StorageProvider,
    private ingestion: IngestionService,
  ) {
    super();
  }

  async process(job: Job<DocumentJobData>) {
    const { documentId } = job.data;
    await this.ingestion.markProcessing(documentId);
    try {
      const document = await this.prisma.document.findUniqueOrThrow({
        where: { id: documentId },
      });
      if (!document.storageKey)
        throw new Error('No file stored for this document.');
      const buffer = await this.storage.download(document.storageKey);
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      await parser.destroy();
      await this.ingestion.setExtractedTextAndAdvance(
        documentId,
        parsed.text.trim(),
      );
    } catch (err) {
      await this.ingestion.markFailed(documentId, (err as Error).message);
    }
  }
}
