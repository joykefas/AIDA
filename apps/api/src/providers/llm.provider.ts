import { LearningStyle } from '@aida/shared';
import { NoteSection, MindMapData } from '@aida/shared';

/** A single topic section generated from a document. */
export interface GeneratedTopic {
  title: string;
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

/**
 * What the LLM returns for a document.
 * `topics` is the preferred multi-topic shape; `summary/notes/mindMap/quizQuestions`
 * are kept for backward-compat with the mock provider and single-topic callers.
 */
export interface GeneratedContent {
  /** Multi-topic output — one entry per logical section of the document. */
  topics?: GeneratedTopic[];
  // --- Legacy single-topic fields (still supported, used when topics is absent) ---
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
 * implementation (`LiveLlmProvider`) calls Groq API (llama-3.3-70b-versatile,
 * primary) with automatic failover to Cloudflare Workers AI
 * (@cf/meta/llama-3.3-70b-instruct-fp8-fast, backup). Route/service code
 * depends only on this abstract class, so switching modes never touches call sites.
 */
export abstract class LlmProvider {
  abstract generateContent(input: {
    title: string;
    rawText: string;
    learningStyle?: LearningStyle | null;
  }): Promise<GeneratedContent>;
  abstract answerTutorQuestion(
    input: TutorAnswerInput,
  ): Promise<TutorAnswerOutput>;
  abstract gradeWrittenResponse(
    input: GradeWrittenInput,
  ): Promise<GradeWrittenOutput>;
}
