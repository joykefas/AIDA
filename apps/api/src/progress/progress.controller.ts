import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/jwt.types';
import { ProgressService } from './progress.service';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @Get('weekly')
  weekly(@CurrentUser() user: AccessTokenPayload) {
    return this.progressService.weekly(user.sub);
  }
}
