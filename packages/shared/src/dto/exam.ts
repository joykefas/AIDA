import { ExamStatus } from "../enums";
import { QuizQuestionDto } from "./quiz";

export interface StartExamRequest {
  topicId: string;
  durationMinutes?: number;
}

export interface ExamSessionDto {
  id: string;
  topicId: string;
  topicTitle: string;
  status: ExamStatus;
  questionCount: number;
  durationMinutes: number;
  score: number | null;
  startedAt: string;
  expiresAt: string;
  completedAt: string | null;
  questions: QuizQuestionDto[];
}

export interface SubmitExamAnswer {
  questionId: string;
  answer: string;
}

export interface SubmitExamRequest {
  answers: SubmitExamAnswer[];
}

export interface ExamQuestionResult {
  questionId: string;
  userAnswer: string;
  correctAnswer?: string;
  score: number;
  correct: boolean;
  feedback: string;
}

export interface ExamResultDto {
  sessionId: string;
  topicId: string;
  status: ExamStatus;
  overallScore: number;
  totalQuestions: number;
  correctQuestions: number;
  completedAt: string;
  results: ExamQuestionResult[];
}
