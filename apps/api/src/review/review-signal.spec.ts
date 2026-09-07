import { ReviewSignal } from '@aida/shared';
import { computeReviewSignal } from './review-signal.util';

describe('Review Signal Calculator', () => {
  const now = new Date('2026-09-05T12:00:00.000Z');

  it('should return NEEDS_REVIEW when consecutiveLowScores >= 2 regardless of due date', () => {
    const futureDue = new Date('2026-09-20T12:00:00.000Z');
    const signal = computeReviewSignal(
      { nextReviewDue: futureDue, consecutiveLowScores: 2 },
      now,
    );
    expect(signal).toBe(ReviewSignal.NEEDS_REVIEW);

    const highLowScores = computeReviewSignal(
      { nextReviewDue: null, consecutiveLowScores: 4 },
      now,
    );
    expect(highLowScores).toBe(ReviewSignal.NEEDS_REVIEW);
  });

  it('should return DUE when due date is in the past or now and low scores < 2', () => {
    const pastDue = new Date('2026-09-04T12:00:00.000Z');
    const signalPast = computeReviewSignal(
      { nextReviewDue: pastDue, consecutiveLowScores: 0 },
      now,
    );
    expect(signalPast).toBe(ReviewSignal.DUE);

    const signalNow = computeReviewSignal(
      { nextReviewDue: now, consecutiveLowScores: 1 },
      now,
    );
    expect(signalNow).toBe(ReviewSignal.DUE);
  });

  it('should return NOT_DUE when due date is in future and low scores < 2', () => {
    const futureDue = new Date('2026-09-06T12:00:00.000Z');
    const signal = computeReviewSignal(
      { nextReviewDue: futureDue, consecutiveLowScores: 1 },
      now,
    );
    expect(signal).toBe(ReviewSignal.NOT_DUE);
  });

  it('should return NOT_DUE when nextReviewDue is null and low scores < 2', () => {
    const signal = computeReviewSignal(
      { nextReviewDue: null, consecutiveLowScores: 0 },
      now,
    );
    expect(signal).toBe(ReviewSignal.NOT_DUE);
  });
});
