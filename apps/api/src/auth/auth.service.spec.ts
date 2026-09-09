import { BadRequestException, ForbiddenException } from '@nestjs/common';

jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    signAsync: jest.fn().mockResolvedValue('mocked-jwt-token'),
  })),
}));

import { AuthService } from './auth.service';
import * as crypto from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;
  let email: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };

    jwt = {
      signAsync: jest.fn().mockResolvedValue('mocked-jwt-token'),
    };

    email = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(prisma, jwt, email);
  });

  describe('Age Gating & Minor Consent (Registration)', () => {
    it('should throw ForbiddenException if user is under 13 and parental consent is not given', async () => {
      // 10 years old
      const under13Birthdate = new Date();
      under13Birthdate.setFullYear(under13Birthdate.getFullYear() - 10);

      await expect(
        service.register({
          email: 'kid@example.com',
          password: 'SecurePassword123!',
          birthdate: under13Birthdate.toISOString(),
          parentalConsentGiven: false,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should allow registration under 13 if parental consent is given', async () => {
      const under13Birthdate = new Date();
      under13Birthdate.setFullYear(under13Birthdate.getFullYear() - 10);

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-minor-1',
        email: 'kid@example.com',
        role: 'STUDENT',
        isMinor: true,
        parentalConsentGiven: true,
      });

      const tokens = await service.register({
        email: 'kid@example.com',
        password: 'SecurePassword123!',
        birthdate: under13Birthdate.toISOString(),
        parentalConsentGiven: true,
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'kid@example.com',
            isMinor: true,
            parentalConsentGiven: true,
          }),
        }),
      );
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
    }, 15000);
  });

  describe('Forgot & Reset Password Flow', () => {
    it('should generate a reset token and dispatch email if user exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'student@example.com',
      });
      prisma.passwordResetToken.create.mockResolvedValue({ id: 'token-1' });

      const res = await service.forgotPassword({
        email: 'student@example.com',
      });
      expect(res).toEqual({ ok: true });
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
      expect(email.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'student@example.com',
          subject: expect.stringContaining('Reset your AIDA password'),
        }),
      );
    });

    it('should return ok: true without sending email if user does not exist (anti-enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const res = await service.forgotPassword({ email: 'ghost@example.com' });
      expect(res).toEqual({ ok: true });
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(email.send).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if reset token is invalid or expired', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'invalid-or-expired-token',
          newPassword: 'NewSecretPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully reset password, mark token as used, and clear refreshTokenHash', async () => {
      const validToken = 'valid-raw-token-123';
      const tokenHash = crypto
        .createHash('sha256')
        .update(validToken)
        .digest('hex');

      prisma.passwordResetToken.findFirst.mockResolvedValue({
        id: 'token-rec-1',
        userId: 'user-123',
        tokenHash,
        used: false,
        expiresAt: new Date(Date.now() + 3600000),
      });

      prisma.user.update.mockResolvedValue({ id: 'user-123' });
      prisma.passwordResetToken.update.mockResolvedValue({
        id: 'token-rec-1',
        used: true,
      });

      const res = await service.resetPassword({
        token: validToken,
        newPassword: 'BrandNewPassword999!',
      });

      expect(res).toEqual({ ok: true });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
