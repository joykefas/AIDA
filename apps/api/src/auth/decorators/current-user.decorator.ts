import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../jwt.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenPayload | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AccessTokenPayload }>();
    return request.user;
  },
);
