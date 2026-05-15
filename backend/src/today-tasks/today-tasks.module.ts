import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TodayTasksController } from './today-tasks.controller';
import { TodayTasksService } from './today-tasks.service';

@Module({
  imports: [PrismaModule, AuthModule, AiModule],
  controllers: [TodayTasksController],
  providers: [TodayTasksService],
})
export class TodayTasksModule {}
