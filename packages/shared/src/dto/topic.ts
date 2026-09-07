import { ReviewSignal } from "../enums";

export interface MindMapNode {
  id: string;
  label: string;
  /** Section anchor within the notes this node should jump to when tapped. */
  noteAnchor: string;
}

export interface MindMapEdge {
  source: string;
  target: string;
  label?: string;
}

export interface MindMapData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export interface NoteSection {
  heading: string;
  anchor: string;
  bullets: string[];
}

export interface TopicSummary {
  id: string;
  documentId: string;
  title: string;
  masteryScore: number;
  reviewSignal: ReviewSignal;
  nextReviewDue: string | null;
}

export interface TopicDetail extends TopicSummary {
  summary: string;
  notes: NoteSection[];
  mindMap: MindMapData;
  quizQuestionCount: number;
}
