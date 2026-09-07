import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LearningStyle,
  QuestionType,
  QuizAttemptResult,
  QuizQuestionDto,
} from '@aida/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LlmProvider } from '../providers/llm.provider';
import { ReviewService } from '../review/review.service';

@Injectable()
export class QuizService {
  constructor(
    private prisma: PrismaService,
    private llm: LlmProvider,
    private reviewService: ReviewService,
  ) {}

  async listForTopic(
    userId: string,
    topicId: string,
  ): Promise<QuizQuestionDto[]> {
    const topic = await this.prisma.topic.findFirst({
      where: { id: topicId, document: { userId } },
      include: { quizQuestions: true },
    });
    if (!topic) throw new NotFoundException('Topic not found.');
    return topic.quizQuestions.map((q) => ({
      id: q.id,
      topicId: q.topicId,
      type: q.type as QuestionType,
      prompt: q.prompt,
      options: (q.options as any) ?? null,
    }));
  }

  async generateMore(
    userId: string,
    topicId: string,
  ): Promise<QuizQuestionDto[]> {
    const topic = await this.prisma.topic.findFirst({
      where: { id: topicId, document: { userId } },
    });
    if (!topic) throw new NotFoundException('Topic not found.');

    const generated = await this.llm.generateContent({
      title: topic.title,
      rawText: topic.summary || topic.title,
    });

    const created = await Promise.all(
      generated.quizQuestions.map((q) =>
        this.prisma.quizQuestion.create({
          data: {
            topicId: topic.id,
            type: q.type,
            prompt: q.prompt,
            options: q.options as any,
            correctAnswer: q.correctAnswer,
          },
        }),
      ),
    );

    return created.map((q) => ({
      id: q.id,
      topicId: q.topicId,
      type: q.type as QuestionType,
      prompt: q.prompt,
      options: (q.options as any) ?? null,
    }));
  }

  async attempt(
    userId: string,
    questionId: string,
    answer: string,
  ): Promise<QuizAttemptResult> {
    const question = await this.prisma.quizQuestion.findFirst({
      where: { id: questionId, topic: { document: { userId } } },
      include: { topic: true },
    });
    if (!question)
      throw new ForbiddenException("That question doesn't belong to you.");

    let score: number;
    let correct: boolean;
    let feedback: string;

    if (question.type === QuestionType.MCQ) {
      correct = question.correctAnswer === answer;
      score = correct ? 1 : 0;
      feedback = correct
        ? 'Correct.'
        : `Not quite — the correct answer was option ${question.correctAnswer?.toUpperCase()}.`;
    } else {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      const graded = await this.llm.gradeWrittenResponse({
        prompt: question.prompt,
        correctAnswer: question.correctAnswer,
        studentAnswer: answer,
        learningStyle: user.learningStyle as LearningStyle | null,
      });
      score = graded.score;
      correct = score >= 0.6;
      feedback = graded.feedback;
    }

    const savedAttempt = await this.prisma.quizAttempt.create({
      data: {
        userId,
        questionId,
        userAnswer: answer,
        score,
        correct,
        aiFeedback: feedback,
      },
    });
    await this.reviewService.recordAttemptOutcome(question.topicId, score);

    return {
      attemptId: savedAttempt.id,
      questionId,
      score,
      correct,
      correctAnswer:
        question.type === QuestionType.MCQ
          ? (question.correctAnswer ?? undefined)
          : undefined,
      feedback,
      isDisputed: false,
      disputeReason: null,
      gradedAt: new Date().toISOString(),
    };
  }

  async disputeAttempt(
    userId: string,
    attemptId: string,
    disputeReason: string,
  ): Promise<QuizAttemptResult> {
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { id: attemptId, userId },
      include: { question: true },
    });
    if (!attempt) throw new NotFoundException('Quiz attempt not found.');

    const updated = await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        isDisputed: true,
        disputeReason,
      },
      include: { question: true },
    });

    return {
      attemptId: updated.id,
      questionId: updated.questionId,
      score: updated.score ?? 0,
      correct: updated.correct ?? false,
      correctAnswer:
        updated.question.type === QuestionType.MCQ
          ? (updated.question.correctAnswer ?? undefined)
          : undefined,
      feedback: updated.aiFeedback ?? '',
      isDisputed: updated.isDisputed,
      disputeReason: updated.disputeReason,
      gradedAt: updated.createdAt.toISOString(),
    };
  }
}
