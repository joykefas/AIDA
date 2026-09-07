import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExamQuestionResult,
  ExamResultDto,
  ExamSessionDto,
  ExamStatus,
  LearningStyle,
  QuestionType,
} from '@aida/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LlmProvider } from '../providers/llm.provider';
import { ReviewService } from '../review/review.service';
import { StartExamDto } from './dto/start-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';

@Injectable()
export class ExamService {
  constructor(
    private prisma: PrismaService,
    private llm: LlmProvider,
    private reviewService: ReviewService,
  ) {}

  async start(userId: string, dto: StartExamDto): Promise<ExamSessionDto> {
    const topic = await this.prisma.topic.findFirst({
      where: { id: dto.topicId, document: { userId } },
      include: { quizQuestions: true },
    });
    if (!topic) throw new NotFoundException('Topic not found.');

    if (topic.quizQuestions.length === 0) {
      throw new BadRequestException(
        'No quiz questions available for this topic yet.',
      );
    }

    const durationMinutes =
      dto.durationMinutes ?? Math.max(5, topic.quizQuestions.length * 2);
    const startedAt = new Date();
    const expiresAt = new Date(
      startedAt.getTime() + durationMinutes * 60 * 1000,
    );

    const session = await this.prisma.examSession.create({
      data: {
        userId,
        topicId: topic.id,
        durationMinutes,
        questionCount: topic.quizQuestions.length,
        startedAt,
        expiresAt,
        status: ExamStatus.IN_PROGRESS,
      },
    });

    return {
      id: session.id,
      topicId: topic.id,
      topicTitle: topic.title,
      status: session.status as ExamStatus,
      questionCount: session.questionCount,
      durationMinutes: session.durationMinutes,
      score: null,
      startedAt: startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      completedAt: null,
      questions: topic.quizQuestions.map((q) => ({
        id: q.id,
        topicId: q.topicId,
        type: q.type as QuestionType,
        prompt: q.prompt,
        options: (q.options as any) ?? null,
      })),
    };
  }

  async submit(
    userId: string,
    sessionId: string,
    dto: SubmitExamDto,
  ): Promise<ExamResultDto> {
    const session = await this.prisma.examSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        topic: {
          include: { quizQuestions: true },
        },
      },
    });
    if (!session) throw new NotFoundException('Exam session not found.');

    if (session.status !== ExamStatus.IN_PROGRESS) {
      throw new BadRequestException('Exam session has already been completed.');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const learningStyle = user.learningStyle as LearningStyle | null;

    const answersMap = new Map(
      dto.answers.map((a) => [a.questionId, a.answer]),
    );
    const questions = session.topic.quizQuestions;

    const results: ExamQuestionResult[] = [];
    let totalScore = 0;
    let correctCount = 0;

    for (const question of questions) {
      const userAnswer = answersMap.get(question.id) ?? '';
      let score = 0;
      let correct = false;
      let feedback = '';

      if (question.type === QuestionType.MCQ) {
        correct = question.correctAnswer === userAnswer;
        score = correct ? 1 : 0;
        feedback = correct
          ? 'Correct.'
          : `Incorrect — the correct answer was option ${question.correctAnswer?.toUpperCase()}.`;
      } else {
        if (!userAnswer.trim()) {
          score = 0;
          correct = false;
          feedback = 'No answer was provided.';
        } else {
          const graded = await this.llm.gradeWrittenResponse({
            prompt: question.prompt,
            correctAnswer: question.correctAnswer,
            studentAnswer: userAnswer,
            learningStyle,
          });
          score = graded.score;
          correct = score >= 0.6;
          feedback = graded.feedback;
        }
      }

      totalScore += score;
      if (correct) correctCount++;

      // Save individual attempt
      await this.prisma.quizAttempt.create({
        data: {
          userId,
          questionId: question.id,
          userAnswer,
          score,
          correct,
          aiFeedback: feedback,
        },
      });

      results.push({
        questionId: question.id,
        userAnswer,
        correctAnswer:
          question.type === QuestionType.MCQ
            ? (question.correctAnswer ?? undefined)
            : undefined,
        score,
        correct,
        feedback,
      });
    }

    const overallScore =
      questions.length > 0 ? totalScore / questions.length : 0;
    const completedAt = new Date();

    await this.prisma.examSession.update({
      where: { id: session.id },
      data: {
        status: ExamStatus.COMPLETED,
        score: overallScore,
        completedAt,
      },
    });

    // Update spaced repetition mastery
    await this.reviewService.recordAttemptOutcome(
      session.topicId,
      overallScore,
    );

    return {
      sessionId: session.id,
      topicId: session.topicId,
      status: ExamStatus.COMPLETED,
      overallScore: Math.round(overallScore * 100),
      totalQuestions: questions.length,
      correctQuestions: correctCount,
      completedAt: completedAt.toISOString(),
      results,
    };
  }

  async getSession(userId: string, sessionId: string): Promise<ExamSessionDto> {
    const session = await this.prisma.examSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        topic: {
          include: { quizQuestions: true },
        },
      },
    });
    if (!session) throw new NotFoundException('Exam session not found.');

    return {
      id: session.id,
      topicId: session.topicId,
      topicTitle: session.topic.title,
      status: session.status as ExamStatus,
      questionCount: session.questionCount,
      durationMinutes: session.durationMinutes,
      score: session.score,
      startedAt: session.startedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      completedAt: session.completedAt?.toISOString() ?? null,
      questions: session.topic.quizQuestions.map((q) => ({
        id: q.id,
        topicId: q.topicId,
        type: q.type as QuestionType,
        prompt: q.prompt,
        options: (q.options as any) ?? null,
      })),
    };
  }
}
