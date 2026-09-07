import { Topic } from '@prisma/client';
import {
  TopicSummary,
  TopicDetail,
  NoteSection,
  MindMapData,
} from '@aida/shared';
import { computeReviewSignal } from '../review/review-signal.util';

export function toTopicSummary(topic: Topic): TopicSummary {
  return {
    id: topic.id,
    documentId: topic.documentId,
    title: topic.title,
    masteryScore: topic.masteryScore,
    reviewSignal: computeReviewSignal(topic),
    nextReviewDue: topic.nextReviewDue?.toISOString() ?? null,
  };
}

export function toTopicDetail(
  topic: Topic & { quizQuestions?: { id: string }[] },
): TopicDetail {
  return {
    ...toTopicSummary(topic),
    summary: topic.summary,
    notes: topic.notes as unknown as NoteSection[],
    mindMap: topic.mindMapJson as unknown as MindMapData,
    quizQuestionCount: topic.quizQuestions?.length ?? 0,
  };
}
