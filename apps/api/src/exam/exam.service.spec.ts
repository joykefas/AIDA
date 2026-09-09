import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamStatus, QuestionType, LearningStyle } from '@aida/shared';

describe('ExamService', () => {
  let service: ExamService;
  let prisma: any;
  let llm: any;
  let reviewService: any;

  beforeEach(() => {
    prisma = {
      topic: {
        findFirst: jest.fn(),
      },
      examSession: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUniqueOrThrow: jest.fn(),
      },
      quizAttempt: {
        create: jest.fn(),
      },
    };

    llm = {
      gradeWrittenResponse: jest.fn(),
    };

    reviewService = {
      recordAttemptOutcome: jest.fn().mockResolvedValue(undefined),
    };

    service = new ExamService(prisma, llm, reviewService);
  });

  describe('start', () => {
    it('should create an exam session and return session DTO with timer bounds', async () => {
      prisma.topic.findFirst.mockResolvedValue({
        id: 'topic-1',
        title: 'Cell Biology',
        quizQuestions: [
          {
            id: 'q-1',
            topicId: 'topic-1',
            type: QuestionType.MCQ,
            prompt: 'Q1',
            options: ['A', 'B'],
          },
          {
            id: 'q-2',
            topicId: 'topic-1',
            type: QuestionType.WRITTEN,
            prompt: 'Q2',
            options: null,
          },
        ],
      });

      prisma.examSession.create.mockImplementation(({ data }: any) => ({
        id: 'session-123',
        ...data,
      }));

      const result = await service.start('user-1', {
        topicId: 'topic-1',
        durationMinutes: 10,
      });

      expect(result.id).toBe('session-123');
      expect(result.status).toBe(ExamStatus.IN_PROGRESS);
      expect(result.durationMinutes).toBe(10);
      expect(result.questionCount).toBe(2);
      expect(result.questions).toHaveLength(2);
      expect(prisma.examSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            topicId: 'topic-1',
            durationMinutes: 10,
            status: ExamStatus.IN_PROGRESS,
          }),
        }),
      );
    });

    it('should throw BadRequestException if topic has zero questions', async () => {
      prisma.topic.findFirst.mockResolvedValue({
        id: 'topic-1',
        title: 'Empty Topic',
        quizQuestions: [],
      });

      await expect(
        service.start('user-1', { topicId: 'topic-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if topic not found', async () => {
      prisma.topic.findFirst.mockResolvedValue(null);

      await expect(
        service.start('user-1', { topicId: 'missing-topic' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('submit', () => {
    it('should accurately grade MCQs, call LLM for written answers, and finalize session', async () => {
      const now = new Date();
      prisma.examSession.findFirst.mockResolvedValue({
        id: 'session-123',
        userId: 'user-1',
        topicId: 'topic-1',
        status: ExamStatus.IN_PROGRESS,
        topic: {
          quizQuestions: [
            {
              id: 'q-mcq',
              type: QuestionType.MCQ,
              correctAnswer: 'A',
              prompt: 'MCQ question',
            },
            {
              id: 'q-written',
              type: QuestionType.WRITTEN,
              correctAnswer: 'Mitochondria produce ATP',
              prompt: 'Explain ATP production',
            },
          ],
        },
      });

      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        learningStyle: LearningStyle.STORIES,
      });

      llm.gradeWrittenResponse.mockResolvedValue({
        score: 0.9,
        feedback: 'Excellent explanation of ATP synthesis.',
      });

      prisma.examSession.update.mockResolvedValue({
        id: 'session-123',
        status: ExamStatus.COMPLETED,
        score: 0.95,
        completedAt: now,
      });

      const result = await service.submit('user-1', 'session-123', {
        answers: [
          { questionId: 'q-mcq', answer: 'A' },
          {
            questionId: 'q-written',
            answer: 'Mitochondria generate ATP via respiration.',
          },
        ],
      });

      expect(result.status).toBe(ExamStatus.COMPLETED);
      expect(result.totalQuestions).toBe(2);
      expect(result.correctQuestions).toBe(2);
      expect(result.overallScore).toBe(95); // (1.0 + 0.9) / 2 = 0.95 -> 95%
      expect(result.results[0].correct).toBe(true);
      expect(result.results[1].score).toBe(0.9);

      // Verify attempts logged and review scheduler updated
      expect(prisma.quizAttempt.create).toHaveBeenCalledTimes(2);
      expect(reviewService.recordAttemptOutcome).toHaveBeenCalledWith(
        'topic-1',
        0.95,
      );
      expect(prisma.examSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: expect.objectContaining({
          status: ExamStatus.COMPLETED,
          score: 0.95,
        }),
      });
    });

    it('should throw BadRequestException if exam session is already completed', async () => {
      prisma.examSession.findFirst.mockResolvedValue({
        id: 'session-123',
        userId: 'user-1',
        status: ExamStatus.COMPLETED,
        topic: { quizQuestions: [] },
      });

      await expect(
        service.submit('user-1', 'session-123', { answers: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if exam session does not exist', async () => {
      prisma.examSession.findFirst.mockResolvedValue(null);

      await expect(
        service.submit('user-1', 'invalid-session', { answers: [] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSession', () => {
    it('should return session details by ID', async () => {
      const now = new Date();
      prisma.examSession.findFirst.mockResolvedValue({
        id: 'session-123',
        userId: 'user-1',
        topicId: 'topic-1',
        durationMinutes: 15,
        questionCount: 1,
        score: null,
        status: ExamStatus.IN_PROGRESS,
        startedAt: now,
        expiresAt: new Date(now.getTime() + 15 * 60000),
        completedAt: null,
        topic: {
          title: 'Cell Biology',
          quizQuestions: [
            {
              id: 'q-1',
              topicId: 'topic-1',
              type: QuestionType.MCQ,
              prompt: 'Question 1',
              options: ['A', 'B'],
            },
          ],
        },
      });

      const session = await service.getSession('user-1', 'session-123');
      expect(session.id).toBe('session-123');
      expect(session.topicTitle).toBe('Cell Biology');
      expect(session.questionCount).toBe(1);
    });

    it('should throw NotFoundException if session is not found', async () => {
      prisma.examSession.findFirst.mockResolvedValue(null);

      await expect(
        service.getSession('user-1', 'nonexistent-session'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
