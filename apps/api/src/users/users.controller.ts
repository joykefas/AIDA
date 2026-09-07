import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/jwt.types';
import { SetLearningStyleDto } from '../auth/dto/set-learning-style.dto';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../auth/auth.constants';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

const isProd = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
};

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AccessTokenPayload) {
    return this.usersService.getProfile(user.sub);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Patch('me/learning-style')
  setLearningStyle(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: SetLearningStyleDto,
  ) {
    return this.usersService.setLearningStyle(user.sub, dto.learningStyle);
  }

  @Get('me/export')
  exportData(@CurrentUser() user: AccessTokenPayload) {
    return this.usersService.exportUserData(user.sub);
  }

  @Delete('me')
  async deleteMe(
    @CurrentUser() user: AccessTokenPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.usersService.deleteAccount(user.sub);
    res.clearCookie(ACCESS_COOKIE, cookieOptions);
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    return result;
  }
}
