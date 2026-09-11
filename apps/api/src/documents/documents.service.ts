import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import {
  DocType,
  DocumentDetail,
  DocumentListItem,
  ProcessingStatus,
} from '@aida/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StorageProvider } from '../providers/storage.provider';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { toTopicSummary } from './topic.mapper';
import {
  QUEUE_PARSE_PDF,
  QUEUE_PARSE_DOCX,
  QUEUE_TRANSCRIBE_AUDIO,
  QUEUE_FETCH_YOUTUBE_TRANSCRIPT,
  QUEUE_GENERATE_EMBEDDINGS,
} from '../queue/queue.constants';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageProvider,
    @InjectQueue(QUEUE_PARSE_PDF) private parsePdfQueue: Queue,
    @InjectQueue(QUEUE_PARSE_DOCX) private parseDocxQueue: Queue,
    @InjectQueue(QUEUE_TRANSCRIBE_AUDIO) private transcribeQueue: Queue,
    @InjectQueue(QUEUE_FETCH_YOUTUBE_TRANSCRIPT) private youtubeQueue: Queue,
    @InjectQueue(QUEUE_GENERATE_EMBEDDINGS) private embeddingsQueue: Queue,
  ) {}

  async create(
    userId: string,
    dto: UploadDocumentDto,
    file?: Express.Multer.File,
  ) {
    const title = dto.title?.trim() || this.fallbackTitle(dto, file);

    let storageKey: string | undefined;
    if (file) {
      storageKey = `documents/${userId}/${randomUUID()}-${file.originalname}`;
      await this.storage.upload({
        key: storageKey,
        body: file.buffer,
        contentType: file.mimetype,
      });
    }

    const document = await this.prisma.document.create({
      data: {
        userId,
        type: dto.type,
        title,
        sourceUrl: dto.sourceUrl,
        storageKey,
        extractedText: dto.type === DocType.TEXT ? dto.textContent : undefined,
        status: ProcessingStatus.PENDING,
      },
    });

    await this.enqueueFirstStage(document.id, dto.type);

    return { id: document.id, status: document.status };
  }

  private async enqueueFirstStage(documentId: string, type: DocType) {
    const jobData = { documentId };
    switch (type) {
      case DocType.PDF:
        await this.parsePdfQueue.add('parse', jobData);
        break;
      case DocType.DOCX:
        await this.parseDocxQueue.add('parse', jobData);
        break;
      case DocType.AUDIO:
        await this.transcribeQueue.add('transcribe', jobData);
        break;
      case DocType.YOUTUBE:
        await this.youtubeQueue.add('fetch', jobData);
        break;
      case DocType.TEXT:
        await this.embeddingsQueue.add('embed', jobData);
        break;
    }
  }

  private fallbackTitle(
    dto: UploadDocumentDto,
    file?: Express.Multer.File,
  ): string {
    if (file) return file.originalname.replace(/\.[^/.]+$/, '');
    if (dto.sourceUrl) return dto.sourceUrl;
    return `Untitled ${dto.type.toLowerCase()}`;
  }

  async findAllForUser(userId: string): Promise<DocumentListItem[]> {
    const documents = await this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { topics: true } } },
    });
    return documents.map((d) => ({
      id: d.id,
      type: d.type as DocType,
      title: d.title,
      status: d.status as ProcessingStatus,
      createdAt: d.createdAt.toISOString(),
      topicCount: d._count.topics,
    }));
  }

  async findOne(userId: string, id: string): Promise<DocumentDetail> {
    const document = await this.prisma.document.findFirst({
      where: { id, userId },
      include: { topics: true },
    });
    if (!document) throw new NotFoundException('Document not found.');
    return {
      id: document.id,
      type: document.type as DocType,
      title: document.title,
      status: document.status as ProcessingStatus,
      sourceUrl: document.sourceUrl,
      failureReason: document.failureReason,
      createdAt: document.createdAt.toISOString(),
      topics: document.topics.map(toTopicSummary),
    };
  }

  async remove(userId: string, id: string): Promise<{ deleted: boolean }> {
    const document = await this.prisma.document.findFirst({
      where: { id, userId },
    });
    if (!document) throw new NotFoundException('Document not found.');

    // Clean up object storage first so a DB failure doesn't leave an orphan key
    if (document.storageKey) {
      await this.storage.delete(document.storageKey);
    }

    // Cascade on Document deletes Topics → Embeddings, QuizQuestions, ExamSessions
    await this.prisma.document.delete({ where: { id } });

    return { deleted: true };
  }
}
