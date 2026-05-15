import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { DailyPlansModule } from './daily-plans/daily-plans.module';
import { LongTasksModule } from './long-tasks/long-tasks.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { TodayTasksModule } from './today-tasks/today-tasks.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AiModule,
    ProfileModule,
    TodayTasksModule,
    LongTasksModule,
    DailyPlansModule,
    AdminModule,
  ],
})
export class AppModule {}
