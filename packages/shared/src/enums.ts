export enum DocType {
  PDF = "PDF",
  AUDIO = "AUDIO",
  YOUTUBE = "YOUTUBE",
  TEXT = "TEXT",
  DOCX = "DOCX",
}

export enum ProcessingStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  READY = "READY",
  FAILED = "FAILED",
}

export enum LearningStyle {
  DIAGRAMS = "DIAGRAMS",
  STORIES = "STORIES",
  ANALOGIES = "ANALOGIES",
  FORMULAS = "FORMULAS",
  AUDIO = "AUDIO",
}

export enum LearningMethod {
  VISUAL = "VISUAL",
  STORIES_ANALOGIES = "STORIES_ANALOGIES",
  MIND_MAPS = "MIND_MAPS",
  AUDIO = "AUDIO",
  DIRECT_NOTES = "DIRECT_NOTES",
  CONVERSATIONAL = "CONVERSATIONAL",
  PRACTICAL_EXAMPLES = "PRACTICAL_EXAMPLES",
  SCENARIOS = "SCENARIOS",
  STEP_BY_STEP = "STEP_BY_STEP",
}

export enum QuestionType {
  MCQ = "MCQ",
  WRITTEN = "WRITTEN",
}

export enum UserRole {
  STUDENT = "STUDENT",
  SUPPORT = "SUPPORT",
  ADMIN = "ADMIN",
}

/** Distinguishes a topic that is simply due on schedule from one flagged after
 * two consecutive low scores — the design doc requires these to look different,
 * not just read different in text. */
export enum ReviewSignal {
  NOT_DUE = "NOT_DUE",
  DUE = "DUE",
  NEEDS_REVIEW = "NEEDS_REVIEW",
}

export enum ExamStatus {
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  EXPIRED = "EXPIRED",
}

export enum TutorMessageRating {
  HELPFUL = "HELPFUL",
  UNHELPFUL = "UNHELPFUL",
}
