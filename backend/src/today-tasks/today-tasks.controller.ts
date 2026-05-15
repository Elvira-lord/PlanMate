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
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ClearTodayTasksDto } from './dto/clear-today-tasks.dto';
import { CreateTodayTaskDto } from './dto/create-today-task.dto';
import { GenerateTodayTasksDto } from './dto/generate-today-tasks.dto';
import { GetTodayTasksDto } from './dto/get-today-tasks.dto';
import { UpdateTodayTaskDto } from './dto/update-today-task.dto';
import { TodayTasksService } from './today-tasks.service';

@Controller('plan/today-tasks')
@UseGuards(JwtAuthGuard)
export class TodayTasksController {
  constructor(private readonly todayTasksService: TodayTasksService) {}

  @Get()
  getTodayTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() getTodayTasksDto: GetTodayTasksDto,
  ) {
    return this.todayTasksService.getTodayTasks(user.id, getTodayTasksDto);
  }

  @Post()
  createTodayTask(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createTodayTaskDto: CreateTodayTaskDto,
  ) {
    return this.todayTasksService.createTodayTask(user.id, createTodayTaskDto);
  }

  @Post('clear')
  clearTodayTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Body() clearTodayTasksDto: ClearTodayTasksDto,
  ) {
    return this.todayTasksService.clearTodayTasks(user.id, clearTodayTasksDto);
  }

  @Post('ai-generate')
  generateTodayTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Body() generateTodayTasksDto: GenerateTodayTasksDto,
  ) {
    return this.todayTasksService.generateTodayTasks(
      user.id,
      generateTodayTasksDto,
    );
  }

  @Put(':id')
  updateTodayTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTodayTaskDto: UpdateTodayTaskDto,
  ) {
    return this.todayTasksService.updateTodayTask(
      user.id,
      id,
      updateTodayTaskDto,
    );
  }

  @Delete(':id')
  deleteTodayTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.todayTasksService.deleteTodayTask(user.id, id);
  }
}
