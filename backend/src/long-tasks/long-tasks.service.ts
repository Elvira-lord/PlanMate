import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLongTaskDto } from './dto/create-long-task.dto';
import { GenerateLongTasksDto } from './dto/generate-long-tasks.dto';
import { GetLongTasksDto } from './dto/get-long-tasks.dto';
import { UpdateLongTaskDto } from './dto/update-long-task.dto';

@Injectable()
export class LongTasksService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async getLongTasks(userId: string, getLongTasksDto: GetLongTasksDto) {
    await this.ensureUserExists(userId);

    const date = getLongTasksDto.date ?? new Date().toISOString().slice(0, 10);
    const checkDate = new Date(date + 'T00:00:00');

    const list = await this.prismaService.longTask.findMany({
      where: {
        userId: BigInt(userId),
        ...(typeof getLongTasksDto.isCompleted === 'boolean'
          ? { isCompleted: getLongTasksDto.isCompleted }
          : {}),
      },
      orderBy: [{ isCompleted: 'asc' }, { createdAt: 'asc' }],
      include: {
        checkins: {
          where: { checkDate },
          select: { id: true },
        },
      },
    });

    return {
      list: list.map((task) => ({
        ...this.toTaskItem(task),
        isCheckedToday: task.checkins.length > 0,
      })),
      total: list.length,
    };
  }

  async createLongTask(userId: string, createLongTaskDto: CreateLongTaskDto) {
    await this.ensureUserExists(userId);

    const startDate = this.getNormalizedDate(createLongTaskDto.startDate);

    const task = await this.prismaService.longTask.create({
      data: {
        userId: BigInt(userId),
        title: createLongTaskDto.title,
        description: createLongTaskDto.description,
        priority: createLongTaskDto.priority,
        isCompleted: false,
        startDate,
        source: createLongTaskDto.source ?? 'manual',
      },
    });

    return this.toTaskItem(task);
  }

  async updateLongTask(
    userId: string,
    id: number,
    updateLongTaskDto: UpdateLongTaskDto,
  ) {
    const task = await this.prismaService.longTask.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    if (task.userId !== BigInt(userId)) {
      throw new ForbiddenException('无权限修改该任务');
    }

    const updatedTask = await this.prismaService.longTask.update({
      where: {
        id: task.id,
      },
      data: {
        title: updateLongTaskDto.title,
        description: updateLongTaskDto.description,
        priority: updateLongTaskDto.priority,
        isCompleted: updateLongTaskDto.isCompleted,
        startDate: updateLongTaskDto.startDate
          ? this.getNormalizedDate(updateLongTaskDto.startDate)
          : undefined,
      },
    });

    return {
      ...this.toTaskItem(updatedTask),
      updatedAt: updatedTask.updatedAt,
    };
  }

  async deleteLongTask(userId: string, id: number) {
    const task = await this.prismaService.longTask.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    if (task.userId !== BigInt(userId)) {
      throw new ForbiddenException('无权限删除该任务');
    }

    await this.prismaService.longTask.delete({
      where: {
        id: task.id,
      },
    });

    return {
      id: Number(task.id),
    };
  }

  async clearLongTasks(userId: string) {
    await this.ensureUserExists(userId);

    const tasksCount = await this.prismaService.longTask.count({
      where: {
        userId: BigInt(userId),
      },
    });

    if (tasksCount === 0) {
      throw new NotFoundException('没有可清空的长期任务');
    }

    const result = await this.prismaService.longTask.deleteMany({
      where: {
        userId: BigInt(userId),
      },
    });

    return {
      deletedCount: result.count,
    };
  }

  async generateLongTasks(
    userId: string,
    generateLongTasksDto: GenerateLongTasksDto,
  ) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(userId),
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const count = generateLongTasksDto.count ?? 5;

    try {
      const list = await this.aiService.generateLongTasks({
        aiPrompt: user.aiPrompt,
        userPrompt: generateLongTasksDto.prompt,
        count,
        userAiConfig: {
          aiProvider: user.aiProvider,
          aiModel: user.aiModel,
          aiBaseUrl: user.aiBaseUrl,
          aiApiKey: user.aiApiKey,
        },
      });

      return {
        list,
        count: list.length,
      };
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new InternalServerErrorException('AI 服务调用失败');
      }

      if (error instanceof SyntaxError) {
        throw new InternalServerErrorException('AI 服务调用失败');
      }

      throw error;
    }
  }

  async toggleCheckin(userId: string, longTaskId: number, date?: string) {
    const task = await this.prismaService.longTask.findUnique({
      where: { id: BigInt(longTaskId) },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    if (task.userId !== BigInt(userId)) {
      throw new ForbiddenException('无权限操作该任务');
    }

    const checkDateStr = date ?? new Date().toISOString().slice(0, 10);
    const checkDate = new Date(checkDateStr + 'T00:00:00');

    const existing = await this.prismaService.longTaskCheckin.findUnique({
      where: {
        longTaskId_checkDate: {
          longTaskId: BigInt(longTaskId),
          checkDate,
        },
      },
    });

    if (existing) {
      await this.prismaService.longTaskCheckin.delete({
        where: { id: existing.id },
      });
      return { longTaskId, checkDate: checkDateStr, checked: false };
    } else {
      await this.prismaService.longTaskCheckin.create({
        data: {
          longTaskId: BigInt(longTaskId),
          userId: BigInt(userId),
          checkDate,
        },
      });
      return { longTaskId, checkDate: checkDateStr, checked: true };
    }
  }

  async ensureLongTaskOwnership(userId: string, longTaskId: number) {
    const longTask = await this.prismaService.longTask.findUnique({
      where: {
        id: BigInt(longTaskId),
      },
    });

    if (!longTask) {
      throw new NotFoundException('长期任务不存在');
    }

    if (longTask.userId !== BigInt(userId)) {
      throw new ForbiddenException('无权限操作该长期任务');
    }

    return longTask;
  }

  private async ensureUserExists(userId: string) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(userId),
      },
    });

    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }

    return existingUser;
  }

  private getNormalizedDate(dateString?: string) {
    const targetDate = dateString ? new Date(dateString) : new Date();
    return new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    );
  }

  private toTaskItem(task: {
    id: bigint;
    title: string;
    description: string | null;
    priority: string;
    isCompleted: boolean;
    startDate: Date;
    source: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: Number(task.id),
      title: task.title,
      description: task.description,
      priority: task.priority,
      isCompleted: task.isCompleted,
      startDate: task.startDate,
      source: task.source,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
