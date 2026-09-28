import { AdminService } from './admin.service';
import { UserRole } from '@aida/shared';

describe('AdminService - Spend & Outliers', () => {
  let service: AdminService;
  let prisma: any;
  let usersService: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      document: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      quizAttempt: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      tutorMessage: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    usersService = {
      exportUserData: jest.fn(),
      deleteAccount: jest.fn(),
    };

    service = new AdminService(prisma, usersService);
  });

  describe('getUserSpendSummary', () => {
    it('should compute exact tokens, spend and breakdown for all users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'alice@example.com',
          displayName: 'Alice',
          role: UserRole.STUDENT,
          isMinor: false,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          _count: {
            documents: 2, // 2 * 3000 = 6000 tokens ($0.0009)
            tutorMessages: 4, // 4 * 1500 = 6000 tokens ($0.0009)
            quizAttempts: 1, // 1 * 1000 = 1000 tokens ($0.00015)
          },
        },
        {
          id: 'user-2',
          email: 'bob@example.com',
          displayName: 'Bob',
          role: UserRole.STUDENT,
          isMinor: true,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          _count: {
            documents: 0,
            tutorMessages: 0,
            quizAttempts: 0,
          },
        },
      ];

      prisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getUserSpendSummary();

      expect(result.totalUsersCount).toBe(2);
      expect(result.activeAiUsersCount).toBe(1);
      // User 1 tokens: 6000 + 6000 + 1000 = 13000 tokens
      // 13000 / 1000000 * 0.15 = 0.00195 => round to 0.002
      expect(result.users[0].userId).toBe('user-1');
      expect(result.users[0].estimatedTokens).toBe(13000);
      expect(result.users[0].estimatedSpendUsd).toBeCloseTo(0.002, 3);
      expect(result.users[0].breakdown.documentsTokens).toBe(6000);
      expect(result.users[0].breakdown.messagesTokens).toBe(6000);
      expect(result.users[0].breakdown.quizzesTokens).toBe(1000);

      // User 2: 0 tokens, $0.00
      expect(result.users[1].userId).toBe('user-2');
      expect(result.users[1].estimatedTokens).toBe(0);
      expect(result.users[1].estimatedSpendUsd).toBe(0);

      expect(result.totalTokensUsed).toBe(13000);
      expect(result.pricingRates.costPerMillionTokens).toBe(0.15);
    });

    it('should sort users by tokens or spend correctly', async () => {
      const mockUsers = [
        {
          id: 'low',
          email: 'low@example.com',
          displayName: 'Low',
          role: UserRole.STUDENT,
          isMinor: false,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          _count: { documents: 1, tutorMessages: 0, quizAttempts: 0 },
        },
        {
          id: 'high',
          email: 'high@example.com',
          displayName: 'High',
          role: UserRole.STUDENT,
          isMinor: false,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          _count: { documents: 10, tutorMessages: 10, quizAttempts: 10 },
        },
      ];

      prisma.user.findMany.mockResolvedValue(mockUsers);

      const resultDesc = await service.getUserSpendSummary({ sortBy: 'tokens', sortOrder: 'desc' });
      expect(resultDesc.users[0].userId).toBe('high');
      expect(resultDesc.users[1].userId).toBe('low');

      const resultAsc = await service.getUserSpendSummary({ sortBy: 'tokens', sortOrder: 'asc' });
      expect(resultAsc.users[0].userId).toBe('low');
      expect(resultAsc.users[1].userId).toBe('high');
    });
  });
});
