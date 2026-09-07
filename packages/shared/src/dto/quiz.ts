import { QuestionType } from "../enums";

export interface QuizQuestionOption {
  id: string;
  text: string;
}

export interface QuizQuestionDto {
  id: string;
  topicId: string;
  type: QuestionType;
  prompt: string;
  options: QuizQuestionOption[] | null;
}

export interface QuizGenerateRequest {
  /** timed exam mode withholds per-question feedback until the whole set is submitted */
  timed?: boolean;
  durationSeconds?: number;
}

export interface QuizAttemptRequest {
  questionId: string;
  answer: string;
}

export interface QuizAttemptResult {
  attemptId?: string;
  questionId: string;
  score: number;
  correct: boolean;
  correctAnswer?: string;
  feedback: string;
  isDisputed?: boolean;
  disputeReason?: string | null;
  gradedAt: string;
}

export interface DisputeQuizAttemptRequest {
  disputeReason: string;
}
