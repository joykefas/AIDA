import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ACCESS_COOKIE } from '../auth.constants';
import { AccessTokenPayload } from '../jwt.types';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor() {
    super({
      jwtFromRequest: (req: Request) => req?.cookies?.[ACCESS_COOKIE] ?? null,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET as string,
    });
  }

  validate(payload: AccessTokenPayload) {
    return payload;
  }
}
