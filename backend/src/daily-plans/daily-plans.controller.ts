import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateDailyPlanDto } from './dto/create-daily-plan.dto';
import { GenerateDailyPlansDto } from './dto/generate-daily-plans.dto';
import { UpdateDailyPlanDto } from './dto/update-daily-plan.dto';
import { DailyPlansService } from './daily-plans.service';

@Controller('plan')
@UseGuards(JwtAuthGuard)
export class DailyPlansController {
  constructor(private readonly dailyPlansService: DailyPlansService) {}

  @Get('long-tasks/:id/daily-plans')
  getDailyPlans(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) longTaskId: number,
  ) {
    return this.dailyPlansService.getDailyPlans(user.id, longTaskId);
  }

  @Post('long-tasks/:id/daily-plans')
  createDailyPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) longTaskId: number,
    @Body() createDailyPlanDto: CreateDailyPlanDto,
  ) {
    return this.dailyPlansService.createDailyPlan(
      user.id,
      longTaskId,
      createDailyPlanDto,
    );
  }

  @Put('daily-plans/:id')
  updateDailyPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDailyPlanDto: UpdateDailyPlanDto,
  ) {
    return this.dailyPlansService.updateDailyPlan(
      user.id,
      id,
      updateDailyPlanDto,
    );
  }

  @Delete('daily-plans/:id')
  deleteDailyPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.dailyPlansService.deleteDailyPlan(user.id, id);
  }

  @Post('long-tasks/:id/daily-plans/ai-generate')
  generateDailyPlans(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) longTaskId: number,
    @Body() generateDailyPlansDto: GenerateDailyPlansDto,
  ) {
    return this.dailyPlansService.generateDailyPlans(
      user.id,
      longTaskId,
      generateDailyPlansDto,
    );
  }
}
