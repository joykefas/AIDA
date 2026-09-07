import { LearningStyle } from '@aida/shared';
import { NoteSection, MindMapData } from '@aida/shared';

export interface GeneratedContent {
  summary: string;
  notes: NoteSection[];
  mindMap: MindMapData;
  quizQuestions: Array<{
    type: 'MCQ' | 'WRITTEN';
    prompt: string;
    options?: { id: string; text: string }[];
    correctAnswer?: string;
  }>;
}

export interface TutorAnswerInput {
  question: string;
  /** Retrieved chunks from the student's own material, most relevant first. */
  contextChunks: {
    topicId: string;
    topicTitle: string;
    noteAnchor: string;
    text: string;
  }[];
  learningStyle: LearningStyle | null;
  simplify: boolean;
}

export interface TutorAnswerOutput {
  answer: string;
}

export interface GradeWrittenInput {
  prompt: string;
  correctAnswer: string | null;
  studentAnswer: string;
  learningStyle: LearningStyle | null;
}

export interface GradeWrittenOutput {
  score: number;
  feedback: string;
}

/**
 * DI token + contract for the LLM used for note/quiz generation, the RAG tutor,
 * and written-response grading. `MockLlmProvider` implements this with
 * deterministic canned output (AI_PROVIDER_MODE=mock, the default); the live
 * implementation calls DeepSeek V4 via Fireworks/Together AI once real keys
 * are configured. Route/service code depends only on this abstract class, so
 * switching modes never touches call sites.
 */
export abstract class LlmProvider {
  abstract generateContent(input: {
    title: string;
    rawText: string;
  }): Promise<GeneratedContent>;
  abstract answerTutorQuestion(
    input: TutorAnswerInput,
  ): Promise<TutorAnswerOutput>;
  abstract gradeWrittenResponse(
    input: GradeWrittenInput,
  ): Promise<GradeWrittenOutput>;
}
