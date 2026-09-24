import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/jwt.types';
import { PrismaService } from '../prisma/prisma.service';
import { LlmProvider } from '../providers/llm.provider';
import {
  LearningMethod,
  NoteSection,
  AdaptedPresentationResponse,
} from '@aida/shared';
import { Prisma } from '@prisma/client';

@Controller('topics')
@UseGuards(JwtAuthGuard)
export class PresentationsController {
  constructor(
    private prisma: PrismaService,
    private llm: LlmProvider,
  ) {}

  @Get(':id/present')
  async getPresentation(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') topicId: string,
    @Query('method') method: string,
  ): Promise<AdaptedPresentationResponse> {
    if (
      !method ||
      !(Object.values(LearningMethod) as string[]).includes(method)
    ) {
      throw new BadRequestException(
        `Invalid learning method. Valid options: ${Object.values(LearningMethod).join(', ')}`,
      );
    }

    const learningMethod = method as LearningMethod;

    const topic = await this.prisma.topic.findFirst({
      where: { id: topicId, document: { userId: user.sub } },
      include: { document: { select: { extractedText: true } } },
    });

    if (!topic) throw new NotFoundException('Topic not found.');

    // Check if we have a cached presentation for this method
    const presentations = (topic.presentations ?? {}) as Record<
      string,
      unknown
    >;
    if (presentations[learningMethod]) {
      return {
        topicId,
        method: learningMethod,
        content: presentations[learningMethod],
      };
    }

    // Generate on-demand presentation
    const notes = (topic.notes ?? []) as unknown as NoteSection[];

    const content = await this.llm.generateAdaptedPresentation({
      topicTitle: topic.title,
      summary: topic.summary,
      notes,
      rawText: topic.document?.extractedText ?? undefined,
      method: learningMethod,
    });

    // Cache the generated presentation
    const updatedPresentations = {
      ...presentations,
      [learningMethod]: content,
    };
    await this.prisma.topic.update({
      where: { id: topicId },
      data: {
        presentations: updatedPresentations as unknown as Prisma.InputJsonValue,
      },
    });

    return { topicId, method: learningMethod, content };
  }
}
