import { Injectable, Logger } from '@nestjs/common';
import { DocType, ProcessingStatus, LearningStyle } from '@aida/shared';
import { Prisma } from '@prisma/client';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import { YoutubeTranscript } from 'youtube-transcript';
import { PrismaService } from '../prisma/prisma.service';
import { StorageProvider } from '../providers/storage.provider';
import { TranscriptionProvider } from '../providers/transcription.provider';
import { LlmProvider } from '../providers/llm.provider';
import { EmbeddingProvider } from '../providers/embedding.provider';
import { ReviewService } from '../review/review.service';
import { chunkText, toVectorLiteral } from './embeddings.util';

const CHUNK_SIZE = 500;

function detectAudioMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'wav':
      return 'audio/wav';
    case 'm4a':
      return 'audio/x-m4a';
    case 'ogg':
      return 'audio/ogg';
    case 'webm':
      return 'audio/webm';
    case 'flac':
      return 'audio/flac';
    case 'aac':
      return 'audio/aac';
    case 'mp3':
    default:
      return 'audio/mpeg';
  }
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageProvider,
    private transcription: TranscriptionProvider,
    private llm: LlmProvider,
    private embeddingProvider: EmbeddingProvider,
    private reviewService: ReviewService,
  ) {}

  /**
   * Dispatches document processing asynchronously on the next event loop tick
   * so that the HTTP controller can return immediately (201 Created) without blocking the user.
   */
  processDocumentAsync(documentId: string, type: DocType): void {
    setImmediate(() => {
      void this.runPipeline(documentId, type);
    });
  }

  /**
   * Executes the full 3-stage ingestion pipeline in-memory:
   * 1. Extraction (PDF / DOCX / Audio / YouTube / Text)
   * 2. Embedding Generation (Vector chunking & pgvector storage)
   * 3. AI Content Synthesis (Notes, Flashcards, Mind Map, Quizzes -> READY)
   */
  async runPipeline(documentId: string, type: DocType): Promise<void> {
    await this.markProcessing(documentId);
    try {
      if (type !== DocType.TEXT) {
        await this.extractText(documentId, type);
      }
      await this.generateEmbeddingsForDocument(documentId);
      await this.generateContentForDocument(documentId);
      this.logger.log(
        `Document ${documentId} (${type}) successfully ingested and marked READY`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.markFailed(documentId, message);
    }
  }

  async markProcessing(documentId: string): Promise<void> {
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: ProcessingStatus.PROCESSING },
    });
  }

  async markFailed(documentId: string, reason: string): Promise<void> {
    this.logger.error(`Document ${documentId} failed: ${reason}`);
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: ProcessingStatus.FAILED, failureReason: reason },
    });
  }

  /** Stage 1: Extracts text from uploaded files (S3) or external sources (YouTube). */
  private async extractText(documentId: string, type: DocType): Promise<void> {
    const document = await this.prisma.document.findUniqueOrThrow({
      where: { id: documentId },
    });

    let extractedText = '';

    switch (type) {
      case DocType.PDF: {
        if (!document.storageKey)
          throw new Error('No file stored for this document.');
        const buffer = await this.storage.download(document.storageKey);
        const parser = new PDFParse({ data: buffer });
        const parsed = await parser.getText();
        await parser.destroy();
        extractedText = parsed.text.trim();
        break;
      }
      case DocType.DOCX: {
        if (!document.storageKey)
          throw new Error('No file stored for this document.');
        const buffer = await this.storage.download(document.storageKey);
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value.trim();
        break;
      }
      case DocType.AUDIO: {
        if (!document.storageKey)
          throw new Error('No file stored for this document.');
        const buffer = await this.storage.download(document.storageKey);
        const mimeType = detectAudioMimeType(
          document.storageKey || document.title,
        );
        const { text } = await this.transcription.transcribe({
          fileBuffer: buffer,
          mimeType,
        });
        extractedText = text.trim();
        break;
      }
      case DocType.YOUTUBE: {
        if (!document.sourceUrl)
          throw new Error('No source URL provided for YouTube ingestion.');
        const items = await YoutubeTranscript.fetchTranscript(
          document.sourceUrl,
        );
        extractedText = items
          .map((i) => i.text)
          .join(' ')
          .trim();
        break;
      }
      default:
        break;
    }

    if (!extractedText) {
      throw new Error(`Failed to extract text from document of type ${type}`);
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: { extractedText },
    });
  }

  /** Stage 2: Chunks extracted text, stores pgvector embeddings, and associates with primary topic. */
  async generateEmbeddingsForDocument(documentId: string): Promise<void> {
    const document = await this.prisma.document.findUniqueOrThrow({
      where: { id: documentId },
    });
    const text = document.extractedText ?? document.title;

    const chunks = chunkText(text, CHUNK_SIZE);

    let topic = await this.prisma.topic.findFirst({
      where: { documentId, isPrimary: true },
    });
    if (!topic) {
      topic = await this.prisma.topic.create({
        data: { documentId, title: document.title, isPrimary: true },
      });
    }

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
  }

  /** Stage 3: LlmProvider turns extracted text into summary/notes/mindmap/quiz, then marks document READY. */
  async generateContentForDocument(documentId: string): Promise<void> {
    const document = await this.prisma.document.findUniqueOrThrow({
      where: { id: documentId },
      include: { user: { select: { learningStyle: true } } },
    });
    const text = document.extractedText ?? document.title;

    const generated = await this.llm.generateContent({
      title: document.title,
      rawText: text,
      learningStyle:
        (document.user?.learningStyle as LearningStyle | null) ?? null,
    });

    const topicList = generated.topics?.length
      ? generated.topics
      : [
          {
            title: document.title,
            summary: generated.summary ?? '',
            notes: generated.notes ?? [],
            mindMap: generated.mindMap ?? { nodes: [], edges: [] },
            quizQuestions: generated.quizQuestions ?? [],
          },
        ];

    const savedTopicIds: string[] = [];

    for (let i = 0; i < topicList.length; i++) {
      const t = topicList[i];
      const isPrimary = i === 0;

      let topic = isPrimary
        ? await this.prisma.topic.findFirst({
            where: { documentId, isPrimary: true },
          })
        : null;

      if (!topic) {
        topic = await this.prisma.topic.create({
          data: { documentId, title: t.title, isPrimary },
        });
      }

      await this.prisma.topic.update({
        where: { id: topic.id },
        data: {
          title: t.title,
          summary: t.summary ?? '',
          notes: (t.notes ?? []) as unknown as Prisma.InputJsonValue,
          mindMapJson: (t.mindMap ?? {
            nodes: [],
            edges: [],
          }) as unknown as Prisma.InputJsonValue,
        },
      });

      await this.prisma.quizQuestion.deleteMany({
        where: { topicId: topic.id },
      });

      const questionsToSave = Array.isArray(t.quizQuestions)
        ? t.quizQuestions
        : Array.isArray(generated.quizQuestions)
          ? generated.quizQuestions
          : [];

      for (const q of questionsToSave) {
        if (!q) continue;
        const prompt =
          typeof q.prompt === 'string' && q.prompt.trim()
            ? q.prompt.trim()
            : typeof (q as Record<string, unknown>).question === 'string'
              ? ((q as Record<string, unknown>).question as string).trim()
              : '';
        if (!prompt) continue;

        let options = q.options ?? null;
        const rawAnswers = (q as Record<string, unknown>).answers;
        if (!options && Array.isArray(rawAnswers)) {
          options = rawAnswers.map((ans: unknown, optIdx: number) => ({
            id: String.fromCharCode(97 + optIdx),
            text: typeof ans === 'string' ? ans : String(ans),
          }));
        }

        await this.prisma.quizQuestion.create({
          data: {
            topicId: topic.id,
            type: q.type === 'WRITTEN' ? 'WRITTEN' : 'MCQ',
            prompt,
            options: (options ?? null) as unknown as Prisma.InputJsonValue,
            correctAnswer: q.correctAnswer ?? '',
          },
        });
      }

      savedTopicIds.push(topic.id);
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: ProcessingStatus.READY },
    });

    for (const topicId of savedTopicIds) {
      await this.reviewService.ensureScheduled(topicId);
    }
  }
}
