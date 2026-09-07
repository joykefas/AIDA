import { ReviewSignal } from "../enums";

export interface ReviewQueueItem {
  topicId: string;
  topicTitle: string;
  documentId: string;
  documentTitle: string;
  masteryScore: number;
  signal: ReviewSignal;
  dueDate: string;
}

export interface ReviewCalendarDay {
  date: string;
  items: ReviewQueueItem[];
}
