import { Injectable } from '@nestjs/common';
import { WeeklyProgressReport, TopicMastery } from '@aida/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async weekly(userId: string): Promise<WeeklyProgressReport> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const topics = await this.prisma.topic.findMany({
      where: { document: { userId }, quizQuestions: { some: {} } },
      include: { document: true },
    });

    const toMastery = (t: (typeof topics)[number]): TopicMastery => ({
      topicId: t.id,
      topicTitle: t.title,
      subject: t.subject,
      masteryScore: t.masteryScore,
    });

    // Threshold-based rather than pure top/bottom-N: with only a handful of
    // topics, slicing both ends of the same sorted list put the exact same
    // topics in "strengths" and "needs attention" at once. A topic only
    // counts as a strength or a weakness relative to a real bar, and never
    // both.
    const MASTERY_THRESHOLD = 0.5;
    const sorted = [...topics].sort((a, b) => b.masteryScore - a.masteryScore);
    const strengths = sorted
      .filter((t) => t.masteryScore >= MASTERY_THRESHOLD)
      .slice(0, 3)
      .map(toMastery);
    const weaknesses = sorted
      .filter((t) => t.masteryScore < MASTERY_THRESHOLD)
      .slice(-3)
      .reverse()
      .map(toMastery);

    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId, createdAt: { gte: weekStart } },
      include: { question: true },
    });

    // Distinct topics touched, not total attempts — "quizzesTaken" already
    // reports the attempt count, so reusing it here (as this used to) just
    // showed the same number under two labels instead of a second real metric.
    const topicsReviewed = new Set(attempts.map((a) => a.question.topicId));

    const activeDays = new Set(
      attempts.map((a) => a.createdAt.toISOString().slice(0, 10)),
    );
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (activeDays.has(key)) streak++;
      else if (i > 0) break;
    }

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: now.toISOString(),
      strengths,
      weaknesses,
      quizzesTaken: attempts.length,
      reviewsCompleted: topicsReviewed.size,
      currentStreakDays: streak,
    };
  }
}
