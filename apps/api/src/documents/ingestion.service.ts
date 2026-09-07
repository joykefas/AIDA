import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ProcessingStatus } from '@aida/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LlmProvider } from '../providers/llm.provider';
import { EmbeddingProvider } from '../providers/embedding.provider';
import { ReviewService } from '../review/review.service';
import {
  QUEUE_GENERATE_EMBEDDINGS,
  QUEUE_GENERATE_CONTENT,
} from '../queue/queue.constants';
import { chunkText, toVectorLiteral } from './embeddings.util';

const CHUNK_SIZE = 500;

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LlmProvider,
    private embeddingProvider: EmbeddingProvider,
    private reviewService: ReviewService,
    @InjectQueue(QUEUE_GENERATE_EMBEDDINGS) private embeddingsQueue: Queue,
    @InjectQueue(QUEUE_GENERATE_CONTENT) private contentQueue: Queue,
  ) {}

  async markProcessing(documentId: string) {
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: ProcessingStatus.PROCESSING },
    });
  }

  async markFailed(documentId: string, reason: string) {
    this.logger.error(`Document ${documentId} failed: ${reason}`);
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: ProcessingStatus.FAILED, failureReason: reason },
    });
  }

  /** Called by parse-pdf / transcribe-audio / fetch-youtube-transcript once raw text is extracted. */
  async setExtractedTextAndAdvance(documentId: string, text: string) {
    await this.prisma.document.update({
      where: { id: documentId },
      data: { extractedText: text },
    });
    await this.embeddingsQueue.add('embed', { documentId });
  }

  /** generate-embeddings stage: chunk extracted text, store embedding rows, advance to content generation. */
  async generateEmbeddingsForDocument(documentId: string) {
    const document = await this.prisma.document.findUniqueOrThrow({
      where: { id: documentId },
    });
    const text = document.extractedText ?? document.title;

    // A placeholder Topic must exist before embeddings can attach to it —
    // full content gets filled in by the generate-content stage.
    const topic = await this.prisma.topic.upsert({
      where: { id: `${documentId}-primary` },
      create: {
        id: `${documentId}-primary`,
        documentId,
        title: document.title,
      },
      update: {},
    });

    const chunks = chunkText(text, CHUNK_SIZE);
    await this.prisma.embedding.deleteMany({ where: { topicId: topic.id } });
    const vectors = await this.embeddingProvider.embedBatch(chunks);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const vector = vectors[i];
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "Embedding" (id, "topicId", chunk, vector) VALUES (gen_random_uuid(), $1, $2, $3::vector)`,
        topic.id,
        chunk,
        toVectorLiteral(vector),
      );
    }

    await this.contentQueue.add('generate', { documentId });
  }

  /** generate-content stage: LlmProvider turns extracted text into summary/notes/mindmap/quiz, then the document goes READY. */
  async generateContentForDocument(documentId: string) {
    const document = await this.prisma.document.findUniqueOrThrow({
      where: { id: documentId },
    });
    const text = document.extractedText ?? document.title;

    const generated = await this.llm.generateContent({
      title: document.title,
      rawText: text,
    });

    const topic = await this.prisma.topic.upsert({
      where: { id: `${documentId}-primary` },
      create: {
        id: `${documentId}-primary`,
        documentId,
        title: document.title,
      },
      update: {},
    });

    await this.prisma.topic.update({
      where: { id: topic.id },
      data: {
        summary: generated.summary,
        notes: generated.notes as any,
        mindMapJson: generated.mindMap as any,
      },
    });

    await this.prisma.quizQuestion.deleteMany({ where: { topicId: topic.id } });
    for (const q of generated.quizQuestions) {
      await this.prisma.quizQuestion.create({
        data: {
          topicId: topic.id,
          type: q.type,
          prompt: q.prompt,
          options: q.options as any,
          correctAnswer: q.correctAnswer,
        },
      });
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: ProcessingStatus.READY },
    });

    await this.reviewService.ensureScheduled(topic.id);
  }
}
