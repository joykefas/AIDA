/** Mirrors the queue list in the tech-arch doc. Each is a distinct BullMQ queue/worker. */
export const QUEUE_PARSE_PDF = 'parse-pdf';
export const QUEUE_PARSE_DOCX = 'parse-docx';
export const QUEUE_TRANSCRIBE_AUDIO = 'transcribe-audio';
export const QUEUE_FETCH_YOUTUBE_TRANSCRIPT = 'fetch-youtube-transcript';
export const QUEUE_GENERATE_EMBEDDINGS = 'generate-embeddings';
export const QUEUE_GENERATE_CONTENT = 'generate-content';
export const QUEUE_SEND_WEEKLY_REPORT = 'send-weekly-report';

export interface DocumentJobData {
  documentId: string;
}
