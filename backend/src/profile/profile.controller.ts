import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { GetProfileStatsDto } from './dto/get-profile-stats.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';
import { UpdateAiPromptDto } from './dto/update-ai-prompt.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@Controller('plan/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getProfile(user.id);
  }

  @Get('stats')
  getProfileStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query() getProfileStatsDto: GetProfileStatsDto,
  ) {
    return this.profileService.getProfileStats(user.id, getProfileStatsDto);
  }

  @Put()
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.id, updateProfileDto);
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.profileService.uploadAvatar(user.id, file);
  }

  @Put('ai-prompt')
  updateAiPrompt(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateAiPromptDto: UpdateAiPromptDto,
  ) {
    return this.profileService.updateAiPrompt(user.id, updateAiPromptDto);
  }

  @Put('ai-config')
  updateAiConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateAiConfigDto: UpdateAiConfigDto,
  ) {
    return this.profileService.updateAiConfig(user.id, updateAiConfigDto);
  }

  @Put('password')
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.profileService.changePassword(user.id, changePasswordDto);
  }
}
