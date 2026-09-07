import { applySm2, initialSm2State, Sm2State } from './sm2';

describe('SM-2 Spaced Repetition Algorithm', () => {
  const baseDate = new Date('2026-09-01T12:00:00.000Z');

  it('should initialize default SM-2 state', () => {
    const state = initialSm2State();
    expect(state).toEqual({
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
      consecutiveLowScores: 0,
    });
  });

  it('should advance repetitions and intervals on successful scores', () => {
    const state0 = initialSm2State();

    // First successful review (score = 1.0 => quality 5)
    const result1 = applySm2(state0, 1.0, baseDate);
    expect(result1.repetitions).toBe(1);
    expect(result1.intervalDays).toBe(1);
    expect(result1.needsReview).toBe(false);
    expect(result1.nextReviewDue.toISOString()).toBe(
      '2026-09-02T12:00:00.000Z',
    );

    // Second successful review
    const result2 = applySm2(result1, 1.0, baseDate);
    expect(result2.repetitions).toBe(2);
    expect(result2.intervalDays).toBe(6);
    expect(result2.nextReviewDue.toISOString()).toBe(
      '2026-09-07T12:00:00.000Z',
    );

    // Third successful review: interval = round(6 * easeFactor)
    const result3 = applySm2(result2, 1.0, baseDate);
    expect(result3.repetitions).toBe(3);
    expect(result3.intervalDays).toBe(Math.round(6 * result2.easeFactor));
  });

  it('should reset repetitions to 0 on poor score (quality < 3)', () => {
    const activeState: Sm2State = {
      easeFactor: 2.5,
      intervalDays: 15,
      repetitions: 4,
      consecutiveLowScores: 0,
    };

    // Poor score (score = 0.2 => quality = round(0.2 * 5) = 1 < 3)
    const result = applySm2(activeState, 0.2, baseDate);
    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(1);
  });

  it('should enforce the minimum ease factor floor of 1.3', () => {
    let state: Sm2State = {
      easeFactor: 1.35,
      intervalDays: 1,
      repetitions: 0,
      consecutiveLowScores: 0,
    };

    // Fail multiple times with zero score
    for (let i = 0; i < 5; i++) {
      state = applySm2(state, 0.0, baseDate);
    }

    expect(state.easeFactor).toBe(1.3);
  });

  it('should flag needsReview after 2 consecutive low scores and reset on pass', () => {
    const state0 = initialSm2State();

    // First low score (< 0.6)
    const res1 = applySm2(state0, 0.4, baseDate);
    expect(res1.consecutiveLowScores).toBe(1);
    expect(res1.needsReview).toBe(false);

    // Second low score (< 0.6) => triggers needsReview
    const res2 = applySm2(res1, 0.5, baseDate);
    expect(res2.consecutiveLowScores).toBe(2);
    expect(res2.needsReview).toBe(true);

    // Third attempt is successful (>= 0.6) => resets consecutive low scores and needsReview
    const res3 = applySm2(res2, 0.8, baseDate);
    expect(res3.consecutiveLowScores).toBe(0);
    expect(res3.needsReview).toBe(false);
  });
});
