import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { extname, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GetProfileStatsDto } from './dto/get-profile-stats.dto';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';
import { UpdateAiPromptDto } from './dto/update-ai-prompt.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

type TrendPeriodType = 'weekly' | 'monthly' | 'yearly';

type TrendItem = {
  date: string;
  completedCount: number;
};

@Injectable()
export class ProfileService {
  private readonly avatarUploadDir = join(process.cwd(), 'uploads', 'avatars');
  private readonly maxAvatarSize = 2 * 1024 * 1024;
  private readonly allowedAvatarMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  constructor(private readonly prismaService: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(userId),
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return {
      id: Number(user.id),
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      aiPrompt: user.aiPrompt,
      aiProvider: user.aiProvider,
      aiModel: user.aiModel,
      aiBaseUrl: user.aiBaseUrl,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(userId),
      },
    });

    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }

    const username = updateProfileDto.username?.trim();
    const email = updateProfileDto.email?.trim().toLowerCase();

    if (!username && !email) {
      throw new BadRequestException('至少需要提供一个要修改的字段');
    }

    if (username && username !== existingUser.username) {
      const duplicateUsername = await this.prismaService.user.findUnique({
        where: {
          username,
        },
      });

      if (duplicateUsername && duplicateUsername.id !== existingUser.id) {
        throw new BadRequestException('用户名已存在');
      }
    }

    if (email && email !== existingUser.email) {
      const duplicateEmail = await this.prismaService.user.findUnique({
        where: {
          email,
        },
      });

      if (duplicateEmail && duplicateEmail.id !== existingUser.id) {
        throw new BadRequestException('邮箱已存在');
      }
    }

    const updatedUser = await this.prismaService.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        ...(username ? { username } : {}),
        ...(email ? { email } : {}),
      },
    });

    return {
      id: Number(updatedUser.id),
      username: updatedUser.username,
      email: updatedUser.email,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async getProfileStats(
    userId: string,
    getProfileStatsDto: GetProfileStatsDto,
  ) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(userId),
      },
    });

    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }

    return this.buildUserStats(existingUser.id, getProfileStatsDto);
  }

  async updateAiPrompt(userId: string, updateAiPromptDto: UpdateAiPromptDto) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(userId),
      },
    });

    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }

    const prompt = updateAiPromptDto.aiPrompt?.trim() ?? '';

    const updatedUser = await this.prismaService.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        aiPrompt: prompt || '你是一个待办事项助手，帮用户合理安排任务',
      },
    });

    return {
      aiPrompt: updatedUser.aiPrompt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async updateAiConfig(userId: string, updateAiConfigDto: UpdateAiConfigDto) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(userId),
      },
    });

    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }

    const provider = updateAiConfigDto.provider?.trim() ?? null;
    const model = updateAiConfigDto.model?.trim() ?? null;
    const baseUrl = updateAiConfigDto.baseUrl?.trim() ?? null;
    const apiKey = updateAiConfigDto.apiKey?.trim();

    const data: Record<string, unknown> = {
      aiProvider: provider === '' ? null : provider,
      aiModel: model === '' ? null : model,
      aiBaseUrl: baseUrl === '' ? null : baseUrl,
    };
    if (apiKey) {
      data.aiApiKey = apiKey;
    }

    const updatedUser = await this.prismaService.user.update({
      where: {
        id: existingUser.id,
      },
      data,
    });

    return {
      provider: provider === '' ? null : provider,
      model: model === '' ? null : model,
      baseUrl: baseUrl === '' ? null : baseUrl,
      apiKey: apiKey || existingUser.aiApiKey,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(userId),
      },
    });

    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      existingUser.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('当前密码错误');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    const updatedUser = await this.prismaService.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    return {
      updatedAt: updatedUser.updatedAt,
    };
  }

  async uploadAvatar(userId: string, file?: Express.Multer.File) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(userId),
      },
    });

    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }

    if (!file) {
      throw new BadRequestException('未上传文件');
    }

    if (!this.allowedAvatarMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('文件类型不合法，仅支持 jpg/png/webp');
    }

    if (file.size > this.maxAvatarSize) {
      throw new BadRequestException('文件大小超出限制，最大 2MB');
    }

    const extension = extname(file.originalname).toLowerCase();

    if (
      extension !== '.jpg' &&
      extension !== '.jpeg' &&
      extension !== '.png' &&
      extension !== '.webp'
    ) {
      throw new BadRequestException('文件扩展名不合法，仅支持 jpg/png/webp');
    }

    const fileName = `${randomUUID()}${extension === '.jpeg' ? '.jpg' : extension}`;
    const filePath = join(this.avatarUploadDir, fileName);

    await mkdir(this.avatarUploadDir, { recursive: true });
    await writeFile(filePath, file.buffer);

    const avatar = `/uploads/avatars/${fileName}`;

    const updatedUser = await this.prismaService.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        avatar,
      },
    });

    return {
      avatar: updatedUser.avatar,
      updatedAt: updatedUser.updatedAt,
    };
  }

  private async buildUserStats(
    userId: bigint,
    getProfileStatsDto: GetProfileStatsDto,
  ) {
    const [
      totalTodayTaskCount,
      completedTodayTaskCount,
      totalLongTaskCount,
      completedLongTaskCount,
      totalDailyPlanCount,
      completedDailyPlanCount,
      trend,
    ] = await Promise.all([
      this.prismaService.todayTask.count({
        where: {
          userId,
        },
      }),
      this.prismaService.todayTask.count({
        where: {
          userId,
          isCompleted: true,
        },
      }),
      this.prismaService.longTask.count({
        where: {
          userId,
        },
      }),
      this.prismaService.longTask.count({
        where: {
          userId,
          isCompleted: true,
        },
      }),
      this.prismaService.dailyPlan.count({
        where: {
          userId,
        },
      }),
      this.prismaService.dailyPlan.count({
        where: {
          userId,
          isCompleted: true,
        },
      }),
      this.buildTrend(userId, getProfileStatsDto.periodType),
    ]);

    const totalTaskCount =
      totalTodayTaskCount + totalLongTaskCount + totalDailyPlanCount;
    const completedTaskCount =
      completedTodayTaskCount + completedLongTaskCount + completedDailyPlanCount;

    return {
      totalTaskCount,
      completedTaskCount,
      completionRate:
        totalTaskCount === 0
          ? 0
          : Number(((completedTaskCount / totalTaskCount) * 100).toFixed(2)),
      trend,
      breakdown: {
        todayTasks: {
          total: totalTodayTaskCount,
          completed: completedTodayTaskCount,
        },
        longTasks: {
          total: totalLongTaskCount,
          completed: completedLongTaskCount,
        },
        dailyPlans: {
          total: totalDailyPlanCount,
          completed: completedDailyPlanCount,
        },
      },
    };
  }

  private async buildTrend(userId: bigint, periodType?: TrendPeriodType) {
    if (!periodType) {
      return [];
    }

    const today = this.startOfDay(new Date());

    switch (periodType) {
      case 'weekly': {
        const start = this.addDays(today, -6);
        const records = await this.getCompletedTasksByDate(
          userId,
          start,
          this.endOfDay(today),
        );
        return this.buildDailyTrend(start, 7, records);
      }
      case 'monthly': {
        const start = this.addDays(today, -29);
        const records = await this.getCompletedTasksByDate(
          userId,
          start,
          this.endOfDay(today),
        );
        return this.buildDailyTrend(start, 30, records);
      }
      case 'yearly': {
        const start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
        const records = await this.getCompletedTasksByDate(
          userId,
          start,
          this.endOfDay(today),
        );
        return this.buildMonthlyTrend(start, 12, records);
      }
      default:
        return [];
    }
  }

  private async getCompletedTasksByDate(
    userId: bigint,
    start: Date,
    end: Date,
  ) {
    const [todayTasks, dailyPlans] = await Promise.all([
      this.prismaService.todayTask.findMany({
        where: {
          userId,
          isCompleted: true,
          taskDate: {
            gte: start,
            lte: end,
          },
        },
        select: {
          taskDate: true,
        },
      }),
      this.prismaService.dailyPlan.findMany({
        where: {
          userId,
          isCompleted: true,
          planDate: {
            gte: start,
            lte: end,
          },
        },
        select: {
          planDate: true,
        },
      }),
    ]);

    const map = new Map<string, number>();

    for (const task of todayTasks) {
      const key = this.formatDate(task.taskDate);
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    for (const plan of dailyPlans) {
      const key = this.formatDate(plan.planDate);
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    return map;
  }

  private buildDailyTrend(
    startDate: Date,
    count: number,
    records: Map<string, number>,
  ): TrendItem[] {
    return Array.from({ length: count }, (_, index) => {
      const current = this.addDays(startDate, index);
      const date = this.formatDate(current);

      return {
        date,
        completedCount: records.get(date) ?? 0,
      };
    });
  }

  private buildMonthlyTrend(
    startMonth: Date,
    count: number,
    records: Map<string, number>,
  ): TrendItem[] {
    const monthMap = new Map<string, number>();

    for (const [date, value] of records.entries()) {
      const month = date.slice(0, 7);
      monthMap.set(month, (monthMap.get(month) ?? 0) + value);
    }

    return Array.from({ length: count }, (_, index) => {
      const current = new Date(
        startMonth.getFullYear(),
        startMonth.getMonth() + index,
        1,
      );
      const month = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;

      return {
        date: month,
        completedCount: monthMap.get(month) ?? 0,
      };
    });
  }

  private startOfDay(date: Date): Date {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0,
    );
  }

  private endOfDay(date: Date): Date {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    );
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
