import { ReviewSignal } from '@aida/shared';

export function computeReviewSignal(
  topic: { nextReviewDue: Date | null; consecutiveLowScores: number },
  now: Date = new Date(),
): ReviewSignal {
  if (topic.consecutiveLowScores >= 2) return ReviewSignal.NEEDS_REVIEW;
  if (topic.nextReviewDue && topic.nextReviewDue <= now)
    return ReviewSignal.DUE;
  return ReviewSignal.NOT_DUE;
}
