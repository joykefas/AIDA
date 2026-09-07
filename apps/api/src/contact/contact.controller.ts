import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@aida/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private contactService: ContactService) {}

  // Public: no auth required, this is the marketing-site contact form.
  // Throttled tighter than the global default, since it's the only
  // unauthenticated write endpoint in the app.
  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(@Body() dto: CreateContactDto) {
    return this.contactService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  findAll() {
    return this.contactService.findAll();
  }

  @Patch(':id/read')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  markRead(@Param('id') id: string) {
    return this.contactService.markRead(id);
  }
}
