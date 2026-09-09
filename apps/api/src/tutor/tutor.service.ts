import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LearningStyle,
  TutorCitation,
  TutorChatMessage,
  TutorMessageResponse,
} from '@aida/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LlmProvider } from '../providers/llm.provider';
import { EmbeddingProvider } from '../providers/embedding.provider';
import { toVectorLiteral } from '../documents/embeddings.util';
import { TutorMessageDto } from './dto/tutor-message.dto';

interface RetrievedChunk {
  topicId: string;
  topicTitle: string;
  chunk: string;
}

@Injectable()
export class TutorService {
  constructor(
    private prisma: PrismaService,
    private llm: LlmProvider,
    private embeddingProvider: EmbeddingProvider,
  ) {}

  async answer(
    userId: string,
    dto: TutorMessageDto,
  ): Promise<TutorMessageResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const learningStyle = user.learningStyle as LearningStyle | null;

    let topicIds: string[] = [];
    if (dto.topicId) {
      const topic = await this.prisma.topic.findFirst({
        where: { id: dto.topicId, document: { userId } },
      });
      if (!topic) throw new NotFoundException('Topic not found.');
      topicIds = [topic.id];
    } else {
      const topics = await this.prisma.topic.findMany({
        where: { document: { userId } },
        select: { id: true },
      });
      topicIds = topics.map((t) => t.id);
    }

    const contextChunks =
      topicIds.length > 0
        ? await this.retrieveContext(dto.message, topicIds)
        : [];

    const { answer } = await this.llm.answerTutorQuestion({
      question: dto.message,
      contextChunks: contextChunks.map((c) => ({
        topicId: c.topicId,
        topicTitle: c.topicTitle,
        noteAnchor: 'notes',
        text: c.chunk,
      })),
      learningStyle,
      simplify: Boolean(dto.simplify),
    });

    await this.prisma.tutorMessage.create({
      data: {
        userId,
        topicId: dto.topicId,
        role: 'user',
        content: dto.message,
      },
    });
    const saved = await this.prisma.tutorMessage.create({
      data: {
        userId,
        topicId: dto.topicId,
        role: 'assistant',
        content: answer,
        citations: contextChunks.map((c) => ({
          topicId: c.topicId,
          topicTitle: c.topicTitle,
          noteAnchor: 'notes',
          excerpt: c.chunk.slice(0, 200),
        })),
      },
    });

    return {
      id: saved.id,
      answer,
      citations: contextChunks.map((c) => ({
        topicId: c.topicId,
        topicTitle: c.topicTitle,
        noteAnchor: 'notes',
        excerpt: c.chunk.slice(0, 200),
      })),
      createdAt: saved.createdAt.toISOString(),
    };
  }

  private async retrieveContext(
    question: string,
    topicIds: string[],
  ): Promise<RetrievedChunk[]> {
    const vector = await this.embeddingProvider.embed(question);
    const queryVector = toVectorLiteral(vector);
    const rows = await this.prisma.$queryRawUnsafe<
      { topicId: string; topicTitle: string; chunk: string }[]
    >(
      `SELECT e."topicId" as "topicId", t.title as "topicTitle", e.chunk as chunk
       FROM "Embedding" e
       JOIN "Topic" t ON t.id = e."topicId"
       WHERE e."topicId" = ANY($1)
       ORDER BY e.vector <=> $2::vector ASC
       LIMIT 5`,
      topicIds,
      queryVector,
    );
    return rows;
  }

  async history(userId: string, topicId?: string): Promise<TutorChatMessage[]> {
    const messages = await this.prisma.tutorMessage.findMany({
      where: { userId, topicId: topicId ?? undefined },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      citations: (m.citations as unknown as TutorCitation[]) ?? undefined,
      rating: m.rating,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async rate(
    userId: string,
    messageId: string,
    rating: string,
    feedbackText?: string,
  ) {
    const message = await this.prisma.tutorMessage.findFirst({
      where: { id: messageId, userId },
    });
    if (!message) throw new NotFoundException('Tutor message not found.');
    return this.prisma.tutorMessage.update({
      where: { id: messageId },
      data: { rating, feedbackText },
    });
  }
}
