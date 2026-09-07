export interface TopicMastery {
  topicId: string;
  topicTitle: string;
  subject: string;
  masteryScore: number;
}

export interface WeeklyProgressReport {
  weekStart: string;
  weekEnd: string;
  strengths: TopicMastery[];
  weaknesses: TopicMastery[];
  quizzesTaken: number;
  reviewsCompleted: number;
  currentStreakDays: number;
}
