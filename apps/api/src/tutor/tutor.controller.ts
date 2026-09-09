import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/jwt.types';
import { TutorService } from './tutor.service';
import { TutorMessageDto } from './dto/tutor-message.dto';
import { RateTutorMessageDto } from './dto/rate-tutor-message.dto';

@Controller('tutor')
@UseGuards(JwtAuthGuard)
export class TutorController {
  constructor(private tutorService: TutorService) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post()
  ask(@CurrentUser() user: AccessTokenPayload, @Body() dto: TutorMessageDto) {
    return this.tutorService.answer(user.sub, dto);
  }

  @Post('messages/:id/rate')
  rate(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: RateTutorMessageDto,
  ) {
    return this.tutorService.rate(user.sub, id, dto.rating, dto.feedbackText);
  }

  @Get('history')
  history(
    @CurrentUser() user: AccessTokenPayload,
    @Query('topicId') topicId?: string,
  ) {
    return this.tutorService.history(user.sub, topicId);
  }
}
