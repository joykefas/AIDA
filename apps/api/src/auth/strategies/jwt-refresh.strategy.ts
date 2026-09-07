import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { REFRESH_COOKIE } from '../auth.constants';
import { RefreshTokenPayload } from '../jwt.types';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: (req: Request) => req?.cookies?.[REFRESH_COOKIE] ?? null,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET as string,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: RefreshTokenPayload) {
    const token = req.cookies?.[REFRESH_COOKIE];
    return { ...payload, refreshToken: token };
  }
}
