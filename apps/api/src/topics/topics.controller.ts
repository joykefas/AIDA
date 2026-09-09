import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/jwt.types';
import { PrismaService } from '../prisma/prisma.service';
import { TutorService } from '../tutor/tutor.service';
import { TutorMessageDto } from '../tutor/dto/tutor-message.dto';
import { toTopicDetail, toTopicSummary } from '../documents/topic.mapper';

@Controller('topics')
@UseGuards(JwtAuthGuard)
export class TopicsController {
  constructor(
    private prisma: PrismaService,
    private tutorService: TutorService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: AccessTokenPayload) {
    const topics = await this.prisma.topic.findMany({
      where: { document: { userId: user.sub } },
      orderBy: { createdAt: 'desc' },
    });
    return topics.map(toTopicSummary);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    const topic = await this.prisma.topic.findFirst({
      where: { id, document: { userId: user.sub } },
      include: { quizQuestions: true },
    });
    if (!topic) throw new NotFoundException('Topic not found.');
    return toTopicDetail(topic);
  }

  @Post(':id/tutor')
  askTutor(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: TutorMessageDto,
  ) {
    return this.tutorService.answer(user.sub, { ...dto, topicId: id });
  }
}
