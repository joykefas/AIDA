import {
  Controller,
  Delete,
  Get,
  Param,
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

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPPORT)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('users')
  getUsers(
    @Query('search') search?: string,
    @Query('isMinor') isMinor?: string,
  ) {
    const isMinorBool =
      isMinor === 'true' ? true : isMinor === 'false' ? false : undefined;
    return this.adminService.listUsers(search, isMinorBool);
  }

  @Get('quality')
  getQualitySamples() {
    return this.adminService.getQualitySamples();
  }

  @Get('compliance')
  getComplianceLogs() {
    return this.adminService.getComplianceLogs();
  }

  @Post('users/:id/export')
  exportUserData(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    return this.adminService.exportUserData(admin.sub, id);
  }

  @Delete('users/:id')
  deleteUser(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    return this.adminService.deleteUser(admin.sub, id);
  }
}
