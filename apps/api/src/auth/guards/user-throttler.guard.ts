import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

interface RequestWithUser {
  user?: { sub?: string };
  ip?: string;
}

/**
 * Throttles requests by authenticated user ID (user.sub) where available,
 * falling back to client IP for unauthenticated routes.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as RequestWithUser;
    const tracker = request.user?.sub ?? request.ip ?? 'anonymous';
    return Promise.resolve(tracker);
  }
}
