import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { REFRESH_COOKIE } from '../auth.constants';
import type { RefreshTokenPayload } from '../jwt.types';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: (req: Request): string | null =>
        (req?.cookies?.[REFRESH_COOKIE] as string | undefined) ?? null,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET as string,
      passReqToCallback: true,
    });
  }

  validate(
    req: Request,
    payload: RefreshTokenPayload,
  ): RefreshTokenPayload & { refreshToken: string } {
    const token = (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? '';
    return { ...payload, refreshToken: token };
  }
}
