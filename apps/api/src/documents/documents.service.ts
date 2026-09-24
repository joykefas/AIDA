import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  DocType,
  DocumentDetail,
  DocumentListItem,
  ProcessingStatus,
} from '@aida/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StorageProvider } from '../providers/storage.provider';
import { IngestionService } from './ingestion.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { toTopicSummary } from './topic.mapper';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageProvider,
    private ingestion: IngestionService,
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

    // Fire-and-forget: runs the full ingestion pipeline in the background
    // without blocking the HTTP response. The caller immediately gets 201 Created.
    this.ingestion.processDocumentAsync(document.id, dto.type);

    return { id: document.id, status: document.status };
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
