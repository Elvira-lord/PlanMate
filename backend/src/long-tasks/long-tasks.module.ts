import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LongTasksController } from './long-tasks.controller';
import { LongTasksService } from './long-tasks.service';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [LongTasksController],
  providers: [LongTasksService],
  exports: [LongTasksService],
})
export class LongTasksModule {}
