import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LongTasksModule } from '../long-tasks/long-tasks.module';
import { DailyPlansController } from './daily-plans.controller';
import { DailyPlansService } from './daily-plans.service';

@Module({
  imports: [PrismaModule, AiModule, LongTasksModule],
  controllers: [DailyPlansController],
  providers: [DailyPlansService],
})
export class DailyPlansModule {}
