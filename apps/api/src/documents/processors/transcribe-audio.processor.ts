import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageProvider } from '../../providers/storage.provider';
import { TranscriptionProvider } from '../../providers/transcription.provider';
import { IngestionService } from '../ingestion.service';
import {
  QUEUE_TRANSCRIBE_AUDIO,
  DocumentJobData,
} from '../../queue/queue.constants';

@Processor(QUEUE_TRANSCRIBE_AUDIO)
export class TranscribeAudioProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private storage: StorageProvider,
    private transcription: TranscriptionProvider,
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
      const { text } = await this.transcription.transcribe({
        fileBuffer: buffer,
        mimeType: 'audio/mpeg',
      });
      await this.ingestion.setExtractedTextAndAdvance(documentId, text);
    } catch (err) {
      await this.ingestion.markFailed(documentId, (err as Error).message);
    }
  }
}
