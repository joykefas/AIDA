import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@aida/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AccessTokenPayload } from '../jwt.types';

/** Enforced now (support vs. full-admin) even though the admin dashboard itself is a later build. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AccessTokenPayload }>();
    const role = request.user?.role as UserRole | undefined;
    return role ? required.includes(role) : false;
  }
}
