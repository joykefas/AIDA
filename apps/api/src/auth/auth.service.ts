import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { UserRole } from '@aida/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EmailProvider } from '../providers/email.provider';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MIN_SIGNUP_AGE } from './auth.constants';
import { AccessTokenPayload, RefreshTokenPayload } from './jwt.types';

function ageFromBirthdate(birthdate: Date, now = new Date()): number {
  let age = now.getFullYear() - birthdate.getFullYear();
  const monthDiff = now.getMonth() - birthdate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthdate.getDate()))
    age--;
  return age;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailProvider,
  ) {}

  async register(dto: RegisterDto) {
    const birthdate = new Date(dto.birthdate);
    const age = ageFromBirthdate(birthdate);

    if (age < MIN_SIGNUP_AGE && !dto.parentalConsentGiven) {
      throw new ForbiddenException(
        'Signups under 13 require parental consent before an account can be created.',
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing)
      throw new ForbiddenException(
        'An account with this email already exists.',
      );

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        birthdate,
        isMinor: age < 18,
        parentalConsentGiven: dto.parentalConsentGiven ?? false,
      },
    });

    return this.issueTokens(user.id, user.email, user.role as UserRole);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) return null;
    const valid = await argon2.verify(user.passwordHash, password);
    return valid ? user : null;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid email or password.');
    return this.issueTokens(user.id, user.email, user.role as UserRole);
  }

  async refresh(userId: string, presentedToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.refreshTokenHash) throw new UnauthorizedException();
    const valid = await argon2.verify(user.refreshTokenHash, presentedToken);
    if (!valid) throw new UnauthorizedException();
    return this.issueTokens(user.id, user.email, user.role as UserRole);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ ok: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      // Return ok even if email doesn't exist to prevent account enumeration
      return { ok: true };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:8000';
    const resetUrl = `${webOrigin}/reset-password?token=${rawToken}`;

    await this.email.send({
      to: user.email,
      subject: 'Reset your AIDA password',
      html: `<h2>Password Reset Request</h2>
<p>You requested to reset your password. Click the link below to set a new password:</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
    });

    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ ok: boolean }> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired password reset link.');
    }

    const passwordHash = await argon2.hash(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          refreshTokenHash: null, // Invalidate existing sessions
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    return { ok: true };
  }

  private async issueTokens(userId: string, email: string, role: UserRole) {
    const accessPayload: AccessTokenPayload = { sub: userId, email, role };
    const refreshPayload: RefreshTokenPayload = { sub: userId };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_TTL ??
        '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_TTL ??
        '30d') as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: await argon2.hash(refreshToken) },
    });

    return { accessToken, refreshToken };
  }
}
