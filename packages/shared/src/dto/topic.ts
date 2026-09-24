import { LearningMethod, ReviewSignal } from "../enums";

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

export interface VisualPresentation {
  diagramType: "mermaid" | "table" | "structure";
  mermaidCode?: string;
  charts?: { title: string; explanation: string }[];
  visualBreakdown: { title: string; content: string; keyTakeaway: string }[];
}

export interface StoriesAnalogiesPresentation {
  coreStory: { title: string; narrative: string; moralOrTakeaway: string };
  analogies: { concept: string; analogy: string; whyItWorks: string }[];
}

export interface PracticalExamplesPresentation {
  examples: {
    title: string;
    context: string;
    demonstration: string;
    realWorldImpact: string;
  }[];
}

export interface ScenarioPresentation {
  scenarios: {
    title: string;
    scenario: string;
    challenge: string;
    optimalApproach: string;
    analysis: string;
  }[];
}

export interface StepByStepStep {
  stepNumber: number;
  title: string;
  explanation: string;
  keyActionOrRule: string;
  quickCheckQuestion: string;
  quickCheckAnswer: string;
}

export interface StepByStepPresentation {
  overview: string;
  steps: StepByStepStep[];
}

export interface AudioLessonPresentation {
  title: string;
  intro: string;
  sections: { heading: string; spokenText: string }[];
  recap: string;
  durationEstimateMinutes: number;
}

export interface AdaptedPresentationResponse {
  topicId: string;
  method: LearningMethod;
  content: {
    visual?: VisualPresentation;
    storiesAnalogies?: StoriesAnalogiesPresentation;
    practicalExamples?: PracticalExamplesPresentation;
    scenarios?: ScenarioPresentation;
    stepByStep?: StepByStepPresentation;
    audioLesson?: AudioLessonPresentation;
    directNotes?: NoteSection[];
    markdown?: string;
  };
}

export interface TopicDetail extends TopicSummary {
  summary: string;
  notes: NoteSection[];
  mindMap: MindMapData;
  quizQuestionCount: number;
  presentations?: Record<string, unknown>;
}

