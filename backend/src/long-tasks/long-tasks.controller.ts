import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
  ValidationPipe as NestValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CheckinDto } from './dto/checkin.dto';
import { CreateLongTaskDto } from './dto/create-long-task.dto';
import { GenerateLongTasksDto } from './dto/generate-long-tasks.dto';
import { GetLongTasksDto } from './dto/get-long-tasks.dto';
import { UpdateLongTaskDto } from './dto/update-long-task.dto';
import { LongTasksService } from './long-tasks.service';

@Controller('plan/long-tasks')
@UseGuards(JwtAuthGuard)
export class LongTasksController {
  constructor(private readonly longTasksService: LongTasksService) {}

  @Get()
  getLongTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() getLongTasksDto: GetLongTasksDto,
  ) {
    return this.longTasksService.getLongTasks(user.id, getLongTasksDto);
  }

  @Post()
  createLongTask(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createLongTaskDto: CreateLongTaskDto,
  ) {
    return this.longTasksService.createLongTask(user.id, createLongTaskDto);
  }

  @Put(':id')
  updateLongTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLongTaskDto: UpdateLongTaskDto,
  ) {
    return this.longTasksService.updateLongTask(user.id, id, updateLongTaskDto);
  }

  @Delete(':id')
  deleteLongTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.longTasksService.deleteLongTask(user.id, id);
  }

  @Post('clear')
  clearLongTasks(@CurrentUser() user: AuthenticatedUser) {
    return this.longTasksService.clearLongTasks(user.id);
  }

  @Post('ai-generate')
  generateLongTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Body() generateLongTasksDto: GenerateLongTasksDto,
  ) {
    return this.longTasksService.generateLongTasks(
      user.id,
      generateLongTasksDto,
    );
  }

  @Post(':id/checkin')
  toggleCheckin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new NestValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
    checkinDto: CheckinDto = {},
  ) {
    return this.longTasksService.toggleCheckin(user.id, id, checkinDto.date);
  }
}
