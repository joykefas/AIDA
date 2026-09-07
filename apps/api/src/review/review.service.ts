import { Injectable, NotFoundException } from '@nestjs/common';
import { ReviewCalendarDay, ReviewQueueItem, ReviewSignal } from '@aida/shared';
import { PrismaService } from '../prisma/prisma.service';
import { applySm2, initialSm2State } from './sm2';
import { computeReviewSignal } from './review-signal.util';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  /** Called after every quiz attempt (MCQ or written) to advance the topic's spaced-repetition state. */
  async recordAttemptOutcome(topicId: string, score: number) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });
    if (!topic) throw new NotFoundException('Topic not found.');

    const result = applySm2(
      {
        easeFactor: topic.easeFactor,
        intervalDays: topic.intervalDays,
        repetitions: topic.repetitions,
        consecutiveLowScores: topic.consecutiveLowScores,
      },
      score,
    );

    await this.prisma.topic.update({
      where: { id: topicId },
      data: {
        easeFactor: result.easeFactor,
        intervalDays: result.intervalDays,
        repetitions: result.repetitions,
        consecutiveLowScores: result.consecutiveLowScores,
        nextReviewDue: result.nextReviewDue,
        masteryScore: result.masteryScore,
      },
    });

    return result;
  }

  /** Ensures a freshly generated topic enters the review cycle instead of sitting with a null due date forever. */
  async ensureScheduled(topicId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });
    if (topic && !topic.nextReviewDue) {
      const state = initialSm2State();
      await this.prisma.topic.update({
        where: { id: topicId },
        data: { nextReviewDue: new Date(), easeFactor: state.easeFactor },
      });
    }
  }

  async due(userId: string): Promise<ReviewQueueItem[]> {
    const topics = await this.prisma.topic.findMany({
      where: { document: { userId } },
      include: { document: true },
    });
    const now = new Date();
    return topics
      .map((t) => ({
        topicId: t.id,
        topicTitle: t.title,
        documentId: t.documentId,
        documentTitle: t.document.title,
        masteryScore: t.masteryScore,
        signal: computeReviewSignal(t, now),
        dueDate: (t.nextReviewDue ?? now).toISOString(),
      }))
      .filter((item) => item.signal !== ReviewSignal.NOT_DUE)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  async calendar(userId: string, days = 30): Promise<ReviewCalendarDay[]> {
    const topics = await this.prisma.topic.findMany({
      where: { document: { userId }, nextReviewDue: { not: null } },
      include: { document: true },
    });
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);

    const byDay = new Map<string, ReviewQueueItem[]>();
    for (const t of topics) {
      const dueDate = t.nextReviewDue as Date;
      const dueKey = dueDate.toISOString().slice(0, 10);
      // Anything due today or earlier (overdue) folds into today's bucket —
      // the calendar only ever looks forward from today, so a due date
      // further in the past would otherwise be bucketed under a day this
      // loop never visits and silently vanish, even though "due now" (which
      // has no such forward-only window) already counts it as due.
      const key = dueKey <= todayKey ? todayKey : dueKey;
      const item: ReviewQueueItem = {
        topicId: t.id,
        topicTitle: t.title,
        documentId: t.documentId,
        documentTitle: t.document.title,
        masteryScore: t.masteryScore,
        signal: computeReviewSignal(t, now),
        dueDate: dueDate.toISOString(),
      };
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(item);
    }
    for (const items of byDay.values())
      items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const result: ReviewCalendarDay[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, items: byDay.get(key) ?? [] });
    }
    return result;
  }
}
