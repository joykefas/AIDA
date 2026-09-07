/**
 * SM-2 spaced-repetition scheduler (the same family Anki uses) — a fixed
 * rule set driven by quiz performance, not an LLM call, per the tech-arch
 * doc's explicit call-out that this carries no inference cost.
 */

export interface Sm2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  consecutiveLowScores: number;
}

export interface Sm2Result extends Sm2State {
  nextReviewDue: Date;
  masteryScore: number;
  /** true once 2 consecutive low scores land — the "needs review" flag from the design doc. */
  needsReview: boolean;
}

const LOW_SCORE_THRESHOLD = 0.6;

/** Maps a 0-1 attempt score onto SM-2's traditional 0-5 quality scale. */
function scoreToQuality(score: number): number {
  return Math.round(Math.max(0, Math.min(1, score)) * 5);
}

export function applySm2(
  state: Sm2State,
  score: number,
  now: Date = new Date(),
): Sm2Result {
  const quality = scoreToQuality(score);
  let { easeFactor, intervalDays, repetitions } = state;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitions += 1;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  const consecutiveLowScores =
    score < LOW_SCORE_THRESHOLD ? state.consecutiveLowScores + 1 : 0;

  const nextReviewDue = new Date(now);
  nextReviewDue.setDate(nextReviewDue.getDate() + intervalDays);

  const masteryScore = Math.max(
    0,
    Math.min(
      1,
      ((easeFactor - 1.3) / (2.5 - 1.3 + 0.01)) * Math.min(1, repetitions / 5),
    ),
  );

  return {
    easeFactor,
    intervalDays,
    repetitions,
    consecutiveLowScores,
    nextReviewDue,
    masteryScore,
    needsReview: consecutiveLowScores >= 2,
  };
}

export function initialSm2State(): Sm2State {
  return {
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    consecutiveLowScores: 0,
  };
}
