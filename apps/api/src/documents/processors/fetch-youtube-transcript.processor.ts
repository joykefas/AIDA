import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { YoutubeTranscript } from 'youtube-transcript';
import { PrismaService } from '../../prisma/prisma.service';
import { IngestionService } from '../ingestion.service';
import {
  QUEUE_FETCH_YOUTUBE_TRANSCRIPT,
  DocumentJobData,
} from '../../queue/queue.constants';

@Processor(QUEUE_FETCH_YOUTUBE_TRANSCRIPT)
export class FetchYoutubeTranscriptProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
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
      if (!document.sourceUrl)
        throw new Error('No YouTube URL provided for this document.');
      const segments = await YoutubeTranscript.fetchTranscript(
        document.sourceUrl,
      );
      const text = segments.map((s) => s.text).join(' ');
      await this.ingestion.setExtractedTextAndAdvance(documentId, text);
    } catch (err) {
      await this.ingestion.markFailed(
        documentId,
        `Couldn't fetch a transcript for this video (${(err as Error).message}). Videos without captions aren't supported.`,
      );
    }
  }
}
