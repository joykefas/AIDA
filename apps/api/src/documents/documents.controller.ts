import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/jwt.types';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (
          file.mimetype === 'application/pdf' ||
          file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.mimetype.startsWith('audio/')
        ) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              `Unsupported file format: ${file.mimetype}. Allowed formats: PDF, DOCX, and audio.`,
            ),
            false,
          );
        }
      },
    }),
  )
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.documentsService.create(user.sub, dto, file);
  }

  @Get()
  findAll(@CurrentUser() user: AccessTokenPayload) {
    return this.documentsService.findAllForUser(user.sub);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.documentsService.findOne(user.sub, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.documentsService.remove(user.sub, id);
  }
}
