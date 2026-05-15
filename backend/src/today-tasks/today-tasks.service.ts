import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClearTodayTasksDto } from './dto/clear-today-tasks.dto';
import { CreateTodayTaskDto } from './dto/create-today-task.dto';
import { GenerateTodayTasksDto } from './dto/generate-today-tasks.dto';
import { GetTodayTasksDto } from './dto/get-today-tasks.dto';
import { UpdateTodayTaskDto } from './dto/update-today-task.dto';

@Injectable()
export class TodayTasksService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async getTodayTasks(userId: string, getTodayTasksDto: GetTodayTasksDto) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(userId),
      },
    });

    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }

    await this.carryOverIncompleteTasks(existingUser.id);

    const normalizedDate = this.getNormalizedDate(getTodayTasksDto.taskDate);

    const list = await this.prismaService.todayTask.findMany({
      where: {
        userId: BigInt(userId),
        taskDate: normalizedDate,
        ...(typeof getTodayTasksDto.isCompleted === 'boolean'
          ? { isCompleted: getTodayTasksDto.isCompleted }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      list: list.map((task) => ({
        id: Number(task.id),
        title: task.title,
        description: task.description,
        priority: task.priority,
        isCompleted: task.isCompleted,
        taskDate: task.taskDate,
        originalDate: task.originalDate,
        carryOverCount: task.carryOverCount,
        sortOrder: task.sortOrder,
        source: task.source,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      })),
      total: list.length,
    };
  }

  async createTodayTask(
    userId: string,
    createTodayTaskDto: CreateTodayTaskDto,
  ) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(userId),
      },
    });

    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }

    const normalizedDate = this.getNormalizedDate(createTodayTaskDto.taskDate);

    await this.carryOverIncompleteTasks(existingUser.id, normalizedDate);

    const todayTasksCount = await this.prismaService.todayTask.count({
      where: {
        userId: BigInt(userId),
        taskDate: normalizedDate,
      },
    });

    if (todayTasksCount >= 5) {
      throw new BadRequestException('今日任务已达到 5 个上限');
    }

    const task = await this.prismaService.todayTask.create({
      data: {
        userId: BigInt(userId),
        title: createTodayTaskDto.title,
        description: createTodayTaskDto.description,
        priority: createTodayTaskDto.priority,
        isCompleted: false,
        taskDate: normalizedDate,
        originalDate: normalizedDate,
        carryOverCount: 0,
        sortOrder: createTodayTaskDto.sortOrder ?? todayTasksCount,
        source: createTodayTaskDto.source ?? 'manual',
      },
    });

    return {
      id: Number(task.id),
      title: task.title,
      description: task.description,
      priority: task.priority,
      isCompleted: task.isCompleted,
      taskDate: task.taskDate,
      originalDate: task.originalDate,
      carryOverCount: task.carryOverCount,
      sortOrder: task.sortOrder,
      source: task.source,
    };
  }

  async clearTodayTasks(
    userId: string,
    clearTodayTasksDto: ClearTodayTasksDto,
  ) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(userId),
      },
    });

    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }

    const normalizedDate = this.getNormalizedDate(clearTodayTasksDto.taskDate);

    const tasksCount = await this.prismaService.todayTask.count({
      where: {
        userId: BigInt(userId),
        taskDate: normalizedDate,
      },
    });

    if (tasksCount === 0) {
      throw new NotFoundException('没有可清空的任务');
    }

    const result = await this.prismaService.todayTask.deleteMany({
      where: {
        userId: BigInt(userId),
        taskDate: normalizedDate,
      },
    });

    return {
      deletedCount: result.count,
    };
  }

  async generateTodayTasks(
    userId: string,
    generateTodayTasksDto: GenerateTodayTasksDto,
  ) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(userId),
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const normalizedDate = this.getNormalizedDate(
      generateTodayTasksDto.taskDate,
    );
    const count = generateTodayTasksDto.count ?? 5;

    await this.carryOverIncompleteTasks(user.id, normalizedDate);

    const existingTasksCount = await this.prismaService.todayTask.count({
      where: {
        userId: BigInt(userId),
        taskDate: normalizedDate,
      },
    });

    if (existingTasksCount >= 5) {
      throw new BadRequestException('今日任务已达到 5 个上限，无法直接写入');
    }

    try {
      const list = await this.aiService.generateTodayTasks({
        aiPrompt: user.aiPrompt,
        userPrompt: generateTodayTasksDto.prompt,
        taskDate: this.formatDate(normalizedDate),
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

  async updateTodayTask(
    userId: string,
    id: number,
    updateTodayTaskDto: UpdateTodayTaskDto,
  ) {
    const task = await this.prismaService.todayTask.findUnique({
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

    const updatedTask = await this.prismaService.todayTask.update({
      where: {
        id: task.id,
      },
      data: {
        title: updateTodayTaskDto.title,
        description: updateTodayTaskDto.description,
        priority: updateTodayTaskDto.priority,
        isCompleted: updateTodayTaskDto.isCompleted,
        sortOrder: updateTodayTaskDto.sortOrder,
      },
    });

    return {
      id: Number(updatedTask.id),
      title: updatedTask.title,
      description: updatedTask.description,
      priority: updatedTask.priority,
      isCompleted: updatedTask.isCompleted,
      taskDate: updatedTask.taskDate,
      originalDate: updatedTask.originalDate,
      carryOverCount: updatedTask.carryOverCount,
      sortOrder: updatedTask.sortOrder,
      source: updatedTask.source,
      updatedAt: updatedTask.updatedAt,
    };
  }

  async deleteTodayTask(userId: string, id: number) {
    const task = await this.prismaService.todayTask.findUnique({
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

    await this.prismaService.todayTask.delete({
      where: {
        id: task.id,
      },
    });

    return {
      id: Number(task.id),
    };
  }

  async carryOverIncompleteTasks(userId: bigint, targetDate?: Date) {
    const today = targetDate ?? this.getNormalizedDate();

    const pendingTasks = await this.prismaService.todayTask.findMany({
      where: {
        userId,
        isCompleted: false,
        taskDate: {
          lt: today,
        },
      },
      orderBy: [
        { taskDate: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    if (pendingTasks.length === 0) {
      return { updatedCount: 0 };
    }

    await this.prismaService.$transaction(
      pendingTasks.map((task) =>
        this.prismaService.todayTask.update({
          where: { id: task.id },
          data: {
            taskDate: today,
            carryOverCount:
              task.carryOverCount +
              this.getDateDiffInDays(task.taskDate, today),
          },
        }),
      ),
    );

    return {
      updatedCount: pendingTasks.length,
    };
  }

  private getNormalizedDate(taskDate?: string) {
    const targetDate = taskDate ? new Date(taskDate) : new Date();
    return new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    );
  }

  private getDateDiffInDays(start: Date, end: Date) {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return Math.max(
      0,
      Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay),
    );
  }

  private formatDate(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
