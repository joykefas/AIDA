import { DocType, ProcessingStatus } from "../enums";
import { TopicSummary } from "./topic";

export interface UploadDocumentMetadata {
  type: DocType;
  title?: string;
  /** YouTube URL when type === YOUTUBE */
  sourceUrl?: string;
  /** Raw typed notes when type === TEXT */
  textContent?: string;
}

export interface DocumentListItem {
  id: string;
  type: DocType;
  title: string;
  status: ProcessingStatus;
  createdAt: string;
  topicCount: number;
}

export interface DocumentDetail {
  id: string;
  type: DocType;
  title: string;
  status: ProcessingStatus;
  sourceUrl: string | null;
  failureReason: string | null;
  createdAt: string;
  topics: TopicSummary[];
}
