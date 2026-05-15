import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { GetProfileStatsDto } from '../profile/dto/get-profile-stats.dto';
import { AdminService } from './admin.service';
import { GetAdminUsersDto } from './dto/get-admin-users.dto';
import { ResetAdminUserPasswordDto } from './dto/reset-admin-user-password.dto';
import { UpdateAdminUserStatusDto } from './dto/update-admin-user-status.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Controller('plan/admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  getUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() getAdminUsersDto: GetAdminUsersDto,
  ) {
    return this.adminService.getUsers(user, getAdminUsersDto);
  }

  @Get(':id')
  getUserDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.adminService.getUserDetail(user, id);
  }

  @Get(':id/stats')
  getUserStats(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Query() getProfileStatsDto: GetProfileStatsDto,
  ) {
    return this.adminService.getUserStats(user, id, getProfileStatsDto);
  }

  @Put(':id')
  updateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAdminUserDto: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUser(user, id, updateAdminUserDto);
  }

  @Patch(':id/status')
  updateUserStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAdminUserStatusDto: UpdateAdminUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(user, id, updateAdminUserStatusDto);
  }

  @Delete(':id')
  deleteUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.adminService.deleteUser(user, id);
  }

  @Post(':id/reset-password')
  resetUserPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() resetAdminUserPasswordDto: ResetAdminUserPasswordDto,
  ) {
    return this.adminService.resetUserPassword(user, id, resetAdminUserPasswordDto);
  }
}
