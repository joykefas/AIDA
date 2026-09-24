import { LearningMethod } from "../enums";

export interface TutorScope {
  /** null means "all my material" */
  topicId: string | null;
  topicTitle: string | null;
}

export interface TutorMaterialScope {
  documentId: string | null;
  documentTitle: string | null;
  topicId: string | null;
  topicTitle: string | null;
}

export interface TutorMessageRequest {
  message: string;
  documentId?: string;
  topicId?: string;
  /** true when the student tapped "simplify this" on a prior answer. */
  simplify?: boolean;
  learningMethods?: LearningMethod[];
}

export interface TutorCitation {
  topicId: string;
  topicTitle: string;
  noteAnchor: string;
  excerpt: string;
}

export interface TutorMessageResponse {
  id: string;
  answer: string;
  citations: TutorCitation[];
  createdAt: string;
}

export interface TutorChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  documentId?: string | null;
  topicId?: string | null;
  citations?: TutorCitation[];
  rating?: string | null;
  createdAt: string;
}

export interface RateTutorMessageRequest {
  rating: "HELPFUL" | "UNHELPFUL";
  feedbackText?: string;
}
