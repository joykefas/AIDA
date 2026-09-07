import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/jwt.types';
import { ExamService } from './exam.service';
import { StartExamDto } from './dto/start-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';

@Controller('exam')
@UseGuards(JwtAuthGuard)
export class ExamController {
  constructor(private examService: ExamService) {}

  @Post('start')
  start(@CurrentUser() user: AccessTokenPayload, @Body() dto: StartExamDto) {
    return this.examService.start(user.sub, dto);
  }

  @Post(':id/submit')
  submit(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: SubmitExamDto,
  ) {
    return this.examService.submit(user.sub, id, dto);
  }

  @Get(':id')
  getSession(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.examService.getSession(user.sub, id);
  }
}
