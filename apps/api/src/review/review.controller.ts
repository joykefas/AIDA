import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/jwt.types';
import { ReviewService } from './review.service';

@Controller('review')
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @Get('due')
  due(@CurrentUser() user: AccessTokenPayload) {
    return this.reviewService.due(user.sub);
  }

  @Get('calendar')
  calendar(
    @CurrentUser() user: AccessTokenPayload,
    @Query('days') days?: string,
  ) {
    return this.reviewService.calendar(
      user.sub,
      days ? Number(days) : undefined,
    );
  }
}
