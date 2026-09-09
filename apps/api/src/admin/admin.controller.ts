import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@aida/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/jwt.types';
import { AdminService } from './admin.service';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('overview')
  @Roles(UserRole.ADMIN)
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('users')
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  getUsers(
    @Query('search') search?: string,
    @Query('isMinor') isMinor?: string,
  ) {
    const isMinorBool =
      isMinor === 'true' ? true : isMinor === 'false' ? false : undefined;
    return this.adminService.listUsers(search, isMinorBool);
  }

  @Patch('users/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  updateUser(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUser(admin.sub, id, dto);
  }

  @Get('quality')
  @Roles(UserRole.ADMIN)
  getQuality() {
    return this.adminService.getQualityData();
  }

  @Get('compliance')
  @Roles(UserRole.ADMIN)
  getComplianceLogs() {
    return this.adminService.getComplianceLogs();
  }

  @Post('users/:id/export')
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  exportUserData(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    return this.adminService.exportUserData(admin.sub, id);
  }

  @Delete('users/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  deleteUser(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    return this.adminService.deleteUser(admin.sub, id);
  }
}
