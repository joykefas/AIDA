import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuestionType, LearningStyle } from '@aida/shared';

describe('QuizService', () => {
  let service: QuizService;
  let prisma: any;
  let llm: any;
  let reviewService: any;

  beforeEach(() => {
    prisma = {
      topic: {
        findFirst: jest.fn(),
      },
      quizQuestion: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      quizAttempt: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUniqueOrThrow: jest.fn(),
      },
    };

    llm = {
      generateContent: jest.fn(),
      gradeWrittenResponse: jest.fn(),
    };

    reviewService = {
      recordAttemptOutcome: jest.fn().mockResolvedValue(undefined),
    };

    service = new QuizService(prisma, llm, reviewService);
  });

  describe('listForTopic', () => {
    it('should return mapped quiz questions for a topic owned by the user', async () => {
      prisma.topic.findFirst.mockResolvedValue({
        id: 'topic-1',
        quizQuestions: [
          {
            id: 'q-1',
            topicId: 'topic-1',
            type: QuestionType.MCQ,
            prompt: 'What is photosynthesis?',
            options: ['A', 'B', 'C', 'D'],
          },
        ],
      });

      const result = await service.listForTopic('user-1', 'topic-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('q-1');
      expect(result[0].type).toBe(QuestionType.MCQ);
    });

    it('should throw NotFoundException if topic does not exist', async () => {
      prisma.topic.findFirst.mockResolvedValue(null);

      await expect(
        service.listForTopic('user-1', 'invalid-topic'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateMore', () => {
    it('should generate content via LLM and persist questions', async () => {
      prisma.topic.findFirst.mockResolvedValue({
        id: 'topic-1',
        title: 'Cell Biology',
        summary: 'Overview of cells',
      });

      llm.generateContent.mockResolvedValue({
        quizQuestions: [
          {
            type: QuestionType.MCQ,
            prompt: 'What is the mitochondria?',
            options: ['Powerhouse', 'Vacuole'],
            correctAnswer: 'Powerhouse',
          },
        ],
      });

      prisma.quizQuestion.create.mockResolvedValue({
        id: 'new-q-1',
        topicId: 'topic-1',
        type: QuestionType.MCQ,
        prompt: 'What is the mitochondria?',
        options: ['Powerhouse', 'Vacuole'],
        correctAnswer: 'Powerhouse',
      });

      const result = await service.generateMore('user-1', 'topic-1');
      expect(result).toHaveLength(1);
      expect(prisma.quizQuestion.create).toHaveBeenCalled();
    });
  });

  describe('attempt (MCQ Scoring)', () => {
    it('should accurately grade a correct MCQ answer and trigger review update', async () => {
      prisma.quizQuestion.findFirst.mockResolvedValue({
        id: 'q-mcq-1',
        topicId: 'topic-1',
        type: QuestionType.MCQ,
        prompt: 'What is 2 + 2?',
        correctAnswer: '4',
      });

      prisma.quizAttempt.create.mockResolvedValue({
        id: 'attempt-1',
        score: 1,
        correct: true,
        aiFeedback: 'Correct.',
      });

      const result = await service.attempt('user-1', 'q-mcq-1', '4');
      expect(result.correct).toBe(true);
      expect(result.score).toBe(1);
      expect(result.feedback).toBe('Correct.');
      expect(reviewService.recordAttemptOutcome).toHaveBeenCalledWith(
        'topic-1',
        1,
      );
    });

    it('should accurately grade an incorrect MCQ answer and return correct option', async () => {
      prisma.quizQuestion.findFirst.mockResolvedValue({
        id: 'q-mcq-1',
        topicId: 'topic-1',
        type: QuestionType.MCQ,
        prompt: 'What is 2 + 2?',
        correctAnswer: 'b',
      });

      prisma.quizAttempt.create.mockResolvedValue({
        id: 'attempt-2',
        score: 0,
        correct: false,
        aiFeedback: 'Not quite — the correct answer was option B.',
      });

      const result = await service.attempt('user-1', 'q-mcq-1', 'c');
      expect(result.correct).toBe(false);
      expect(result.score).toBe(0);
      expect(result.feedback).toContain('option B');
      expect(reviewService.recordAttemptOutcome).toHaveBeenCalledWith(
        'topic-1',
        0,
      );
    });

    it('should throw ForbiddenException if question does not belong to user', async () => {
      prisma.quizQuestion.findFirst.mockResolvedValue(null);

      await expect(
        service.attempt('user-1', 'other-user-q', 'ans'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('attempt (Written Response LLM Grading)', () => {
    it('should invoke LLM grading for freeform written responses', async () => {
      prisma.quizQuestion.findFirst.mockResolvedValue({
        id: 'q-written-1',
        topicId: 'topic-1',
        type: QuestionType.WRITTEN,
        prompt: 'Explain osmosis.',
        correctAnswer: 'Movement of water across a semipermeable membrane.',
      });

      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        learningStyle: LearningStyle.DIAGRAMS,
      });

      llm.gradeWrittenResponse.mockResolvedValue({
        score: 0.85,
        feedback: 'Good explanation of semipermeable membranes.',
      });

      prisma.quizAttempt.create.mockResolvedValue({
        id: 'attempt-3',
        score: 0.85,
        correct: true,
        aiFeedback: 'Good explanation of semipermeable membranes.',
      });

      const result = await service.attempt(
        'user-1',
        'q-written-1',
        'Water moving through membrane',
      );

      expect(llm.gradeWrittenResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          studentAnswer: 'Water moving through membrane',
          learningStyle: LearningStyle.DIAGRAMS,
        }),
      );
      expect(result.score).toBe(0.85);
      expect(result.correct).toBe(true);
      expect(reviewService.recordAttemptOutcome).toHaveBeenCalledWith(
        'topic-1',
        0.85,
      );
    });
  });

  describe('disputeAttempt', () => {
    it('should record an attempt dispute with reason', async () => {
      const now = new Date();
      prisma.quizAttempt.findFirst.mockResolvedValue({
        id: 'att-1',
        userId: 'user-1',
        questionId: 'q-1',
      });

      prisma.quizAttempt.update.mockResolvedValue({
        id: 'att-1',
        questionId: 'q-1',
        score: 0.4,
        correct: false,
        isDisputed: true,
        disputeReason: 'My definition matches the textbook precisely.',
        aiFeedback: 'Partial credit',
        createdAt: now,
        question: {
          type: QuestionType.WRITTEN,
        },
      });

      const result = await service.disputeAttempt(
        'user-1',
        'att-1',
        'My definition matches the textbook precisely.',
      );

      expect(result.isDisputed).toBe(true);
      expect(result.disputeReason).toBe(
        'My definition matches the textbook precisely.',
      );
      expect(prisma.quizAttempt.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: {
          isDisputed: true,
          disputeReason: 'My definition matches the textbook precisely.',
        },
        include: { question: true },
      });
    });

    it('should throw NotFoundException if attempt is not found', async () => {
      prisma.quizAttempt.findFirst.mockResolvedValue(null);

      await expect(
        service.disputeAttempt('user-1', 'nonexistent', 'Reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
