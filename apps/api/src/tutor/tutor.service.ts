import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LearningStyle,
  TutorCitation,
  TutorChatMessage,
  TutorMessageResponse,
  TutorThreadSummary,
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
    const userLearningPreferences = (user.learningPreferences ??
      []) as LearningStyle[];
    // Prefer per-request override over stored preferences
    const effectiveLearningMethods =
      dto.learningMethods && dto.learningMethods.length > 0
        ? dto.learningMethods
        : (userLearningPreferences as unknown as import('@aida/shared').LearningMethod[]);

    let topicIds: string[] = [];
    let resolvedDocumentId = dto.documentId;
    const selectedTopicNotesChunks: RetrievedChunk[] = [];

    if (dto.topicId) {
      const topic = await this.prisma.topic.findFirst({
        where: { id: dto.topicId, document: { userId } },
        select: {
          id: true,
          documentId: true,
          title: true,
          summary: true,
          notes: true,
        },
      });
      if (!topic) throw new NotFoundException('Topic not found.');
      if (!resolvedDocumentId) resolvedDocumentId = topic.documentId;

      if (topic.summary && topic.summary.trim()) {
        selectedTopicNotesChunks.push({
          topicId: topic.id,
          topicTitle: topic.title,
          chunk: `[${topic.title} - Summary]\n${topic.summary.trim()}`,
        });
      }
      if (Array.isArray(topic.notes)) {
        for (const n of topic.notes as { title?: string; content?: string }[]) {
          if (n && n.content) {
            selectedTopicNotesChunks.push({
              topicId: topic.id,
              topicTitle: topic.title,
              chunk: `[${topic.title} - ${n.title ?? 'Notes'}]\n${n.content}`,
            });
          }
        }
      }

      // Always include all topic IDs for the document so embeddings attached to
      // the primary topic (or across the document) are fully accessible!
      const docTopics = await this.prisma.topic.findMany({
        where: { documentId: topic.documentId },
        select: { id: true },
      });
      topicIds = docTopics.map((t) => t.id);
    } else if (dto.documentId) {
      const topics = await this.prisma.topic.findMany({
        where: { documentId: dto.documentId, document: { userId } },
        select: { id: true },
      });
      topicIds = topics.map((t) => t.id);
    } else {
      const topics = await this.prisma.topic.findMany({
        where: { document: { userId } },
        select: { id: true },
      });
      topicIds = topics.map((t) => t.id);
    }

    const recentMessages = await this.prisma.tutorMessage.findMany({
      where: {
        userId,
        ...(resolvedDocumentId ? { documentId: resolvedDocumentId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
    const history = recentMessages.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // For short follow-up prompts like "Simplify that" or "Explain more", enrich
    // the retrieval query with the previous turn so semantic search retrieves the relevant chunks
    let retrievalQuery = dto.message;
    if (dto.message.trim().split(/\s+/).length <= 4 && history.length > 0) {
      const lastUserQuestion = [...history]
        .reverse()
        .find((h) => h.role === 'user');
      if (lastUserQuestion) {
        retrievalQuery = `${lastUserQuestion.content} ${dto.message}`;
      }
    }

    const retrievedChunks =
      topicIds.length > 0
        ? await this.retrieveContext(retrievalQuery, topicIds)
        : [];

    // Prepend topic-specific notes/summary, followed by retrieved hybrid chunks
    const chunkMap = new Map<string, RetrievedChunk>();
    for (const c of [...selectedTopicNotesChunks, ...retrievedChunks]) {
      const key = c.chunk.trim();
      if (!chunkMap.has(key)) {
        chunkMap.set(key, c);
      }
    }
    const contextChunks = Array.from(chunkMap.values()).slice(0, 12);

    const { answer } = await this.llm.answerTutorQuestion({
      question: dto.message,
      contextChunks: contextChunks.map((c) => ({
        topicId: c.topicId,
        topicTitle: c.topicTitle,
        noteAnchor: 'notes',
        text: c.chunk,
      })),
      learningStyle,
      learningMethods: effectiveLearningMethods,
      simplify: Boolean(dto.simplify),
      history,
    });

    await this.prisma.tutorMessage.create({
      data: {
        userId,
        documentId: resolvedDocumentId,
        topicId: dto.topicId,
        role: 'user',
        content: dto.message,
      },
    });
    const saved = await this.prisma.tutorMessage.create({
      data: {
        userId,
        documentId: resolvedDocumentId,
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
    if (topicIds.length === 0) return [];

    // 1. Vector similarity search
    let vectorRows: { topicId: string; topicTitle: string; chunk: string }[] =
      [];
    try {
      const vector = await this.embeddingProvider.embed(question);
      const queryVector = toVectorLiteral(vector);
      vectorRows = await this.prisma.$queryRawUnsafe<
        { topicId: string; topicTitle: string; chunk: string }[]
      >(
        `SELECT e."topicId" as "topicId", t.title as "topicTitle", e.chunk as chunk
         FROM "Embedding" e
         JOIN "Topic" t ON t.id = e."topicId"
         WHERE e."topicId" = ANY($1)
         ORDER BY e.vector <=> $2::vector ASC
         LIMIT 8`,
        topicIds,
        queryVector,
      );
    } catch {
      vectorRows = [];
    }

    // 2. Keyword & Lexical search (PostgreSQL full-text + ILIKE)
    const stopWords = new Set([
      'what',
      'is',
      'are',
      'the',
      'a',
      'an',
      'in',
      'on',
      'of',
      'for',
      'to',
      'and',
      'or',
      'can',
      'you',
      'how',
      'why',
      'give',
      'does',
      'did',
      'do',
      'defined',
      'explain',
      'describe',
      'tell',
      'about',
      'from',
      'with',
      'that',
      'this',
      'these',
      'those',
    ]);
    const cleanTokens = question
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !stopWords.has(w));
    const uniqueTokens = Array.from(new Set(cleanTokens));

    let keywordRows: { topicId: string; topicTitle: string; chunk: string }[] =
      [];
    if (uniqueTokens.length > 0) {
      const ilikePatterns = uniqueTokens.map((t) => `%${t}%`);
      const searchPhrase = uniqueTokens.join(' ');
      try {
        keywordRows = await this.prisma.$queryRawUnsafe<
          { topicId: string; topicTitle: string; chunk: string }[]
        >(
          `SELECT e."topicId" as "topicId", t.title as "topicTitle", e.chunk as chunk,
                  ts_rank(to_tsvector('english', e.chunk), plainto_tsquery('english', $2)) as rank
           FROM "Embedding" e
           JOIN "Topic" t ON t.id = e."topicId"
           WHERE e."topicId" = ANY($1)
             AND (
               to_tsvector('english', e.chunk) @@ plainto_tsquery('english', $2)
               OR e.chunk ILIKE ANY($3)
             )
           ORDER BY rank DESC
           LIMIT 8`,
          topicIds,
          searchPhrase,
          ilikePatterns,
        );
      } catch {
        // Fallback to simple ILIKE if ts_rank / to_tsvector encounters edge-case syntax
        try {
          keywordRows = await this.prisma.$queryRawUnsafe<
            { topicId: string; topicTitle: string; chunk: string }[]
          >(
            `SELECT e."topicId" as "topicId", t.title as "topicTitle", e.chunk as chunk
             FROM "Embedding" e
             JOIN "Topic" t ON t.id = e."topicId"
             WHERE e."topicId" = ANY($1)
               AND e.chunk ILIKE ANY($2)
             LIMIT 8`,
            topicIds,
            ilikePatterns,
          );
        } catch {
          keywordRows = [];
        }
      }
    }

    // 3. Merge & Deduplicate (Hybrid ranking)
    const chunkMap = new Map<string, { item: RetrievedChunk; score: number }>();

    for (let i = 0; i < keywordRows.length; i++) {
      const row = keywordRows[i];
      const key = row.chunk.trim();
      let keywordHits = 0;
      const lower = row.chunk.toLowerCase();
      for (const t of uniqueTokens) {
        if (lower.includes(t)) keywordHits++;
      }
      const score = 100 - i * 5 + keywordHits * 10;
      chunkMap.set(key, { item: row, score });
    }

    for (let i = 0; i < vectorRows.length; i++) {
      const row = vectorRows[i];
      const key = row.chunk.trim();
      const existing = chunkMap.get(key);
      if (existing) {
        existing.score += 50 - i * 3;
      } else {
        chunkMap.set(key, { item: row, score: 50 - i * 3 });
      }
    }

    return Array.from(chunkMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((entry) => entry.item);
  }

  async history(
    userId: string,
    topicId?: string,
    documentId?: string,
  ): Promise<TutorChatMessage[]> {
    const whereClause: {
      userId: string;
      documentId?: string;
      topicId?: string;
    } = { userId };

    if (documentId) {
      whereClause.documentId = documentId;
      if (topicId) {
        whereClause.topicId = topicId;
      }
    } else if (topicId) {
      whereClause.topicId = topicId;
    }

    const messages = await this.prisma.tutorMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      documentId: m.documentId,
      topicId: m.topicId,
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

  async getThreads(userId: string): Promise<TutorThreadSummary[]> {
    const documents = await this.prisma.document.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        topics: {
          select: { id: true, title: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const recentMessages = await this.prisma.tutorMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const messageMap = new Map<
      string | null,
      {
        lastMessage: {
          content: string;
          role: 'user' | 'assistant';
          createdAt: string;
        };
        count: number;
      }
    >();

    for (const msg of recentMessages) {
      const key = msg.documentId ?? null;
      const existing = messageMap.get(key);
      if (!existing) {
        messageMap.set(key, {
          lastMessage: {
            content: msg.content,
            role: msg.role as 'user' | 'assistant',
            createdAt: msg.createdAt.toISOString(),
          },
          count: 1,
        });
      } else {
        existing.count++;
      }
    }

    const threads: TutorThreadSummary[] = documents.map((doc) => {
      const msgInfo = messageMap.get(doc.id);
      return {
        documentId: doc.id,
        title: doc.title,
        type: doc.type,
        status: doc.status,
        createdAt: doc.createdAt.toISOString(),
        topics: doc.topics,
        lastMessage: msgInfo?.lastMessage ?? null,
        messageCount: msgInfo?.count ?? 0,
      };
    });

    const globalMsgInfo = messageMap.get(null);
    const globalThread: TutorThreadSummary = {
      documentId: null,
      title: 'General AI Tutor (All Materials)',
      type: null,
      status: 'READY',
      createdAt: new Date().toISOString(),
      topics: [],
      lastMessage: globalMsgInfo?.lastMessage ?? null,
      messageCount: globalMsgInfo?.count ?? 0,
    };

    return [globalThread, ...threads];
  }
}
