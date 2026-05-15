import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AiService } from '../ai/ai.service';
import { LongTasksService } from '../long-tasks/long-tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyPlanDto } from './dto/create-daily-plan.dto';
import { GenerateDailyPlansDto } from './dto/generate-daily-plans.dto';
import { UpdateDailyPlanDto } from './dto/update-daily-plan.dto';

@Injectable()
export class DailyPlansService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly longTasksService: LongTasksService,
    private readonly aiService: AiService,
  ) {}

  async getDailyPlans(userId: string, longTaskId: number) {
    const longTask = await this.ensureViewableLongTask(userId, longTaskId);

    const list = await this.prismaService.dailyPlan.findMany({
      where: {
        longTaskId: longTask.id,
      },
      orderBy: [{ planDate: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      list: list.map((plan) => this.toPlanItem(plan)),
      total: list.length,
    };
  }

  async createDailyPlan(
    userId: string,
    longTaskId: number,
    createDailyPlanDto: CreateDailyPlanDto,
  ) {
    const longTask = await this.longTasksService.ensureLongTaskOwnership(
      userId,
      longTaskId,
    );
    const planDate = this.getNormalizedDate(createDailyPlanDto.planDate);

    await this.ensurePlanNotDuplicated(
      longTask.id,
      planDate,
      createDailyPlanDto.content,
    );

    const plan = await this.prismaService.dailyPlan.create({
      data: {
        longTaskId: longTask.id,
        userId: BigInt(userId),
        content: createDailyPlanDto.content,
        planDate,
        isCompleted: false,
      },
    });

    return this.toPlanItem(plan);
  }

  async updateDailyPlan(
    userId: string,
    id: number,
    updateDailyPlanDto: UpdateDailyPlanDto,
  ) {
    const plan = await this.prismaService.dailyPlan.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!plan) {
      throw new NotFoundException('每日计划不存在');
    }

    if (plan.userId !== BigInt(userId)) {
      throw new ForbiddenException('无权限修改该计划');
    }

    const nextContent = updateDailyPlanDto.content ?? plan.content;
    const nextPlanDate = updateDailyPlanDto.planDate
      ? this.getNormalizedDate(updateDailyPlanDto.planDate)
      : plan.planDate;

    await this.ensurePlanNotDuplicated(
      plan.longTaskId,
      nextPlanDate,
      nextContent,
      plan.id,
    );

    const updatedPlan = await this.prismaService.dailyPlan.update({
      where: {
        id: plan.id,
      },
      data: {
        content: updateDailyPlanDto.content,
        planDate: updateDailyPlanDto.planDate ? nextPlanDate : undefined,
        isCompleted: updateDailyPlanDto.isCompleted,
      },
    });

    return {
      ...this.toPlanItem(updatedPlan),
      updatedAt: updatedPlan.updatedAt,
    };
  }

  async deleteDailyPlan(userId: string, id: number) {
    const plan = await this.prismaService.dailyPlan.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!plan) {
      throw new NotFoundException('每日计划不存在');
    }

    if (plan.userId !== BigInt(userId)) {
      throw new ForbiddenException('无权限删除该计划');
    }

    await this.prismaService.dailyPlan.delete({
      where: {
        id: plan.id,
      },
    });

    return {
      id: Number(plan.id),
    };
  }

  async generateDailyPlans(
    userId: string,
    longTaskId: number,
    generateDailyPlansDto: GenerateDailyPlansDto,
  ) {
    const longTask = await this.longTasksService.ensureLongTaskOwnership(
      userId,
      longTaskId,
    );
    const user = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(userId),
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const count = generateDailyPlansDto.count ?? 5;

    try {
      const list = await this.aiService.generateDailyPlans({
        aiPrompt: user.aiPrompt,
        userPrompt: generateDailyPlansDto.prompt,
        count,
        longTaskTitle: longTask.title,
        longTaskDescription: longTask.description ?? '',
        startDate: this.formatDate(longTask.startDate),
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

  private async ensureViewableLongTask(userId: string, longTaskId: number) {
    const longTask = await this.prismaService.longTask.findUnique({
      where: {
        id: BigInt(longTaskId),
      },
    });

    if (!longTask) {
      throw new NotFoundException('长期任务不存在');
    }

    if (longTask.userId !== BigInt(userId)) {
      throw new ForbiddenException('无权限查看该长期任务');
    }

    return longTask;
  }

  private async ensurePlanNotDuplicated(
    longTaskId: bigint,
    planDate: Date,
    content: string,
    currentPlanId?: bigint,
  ) {
    const duplicatedPlan = await this.prismaService.dailyPlan.findFirst({
      where: {
        longTaskId,
        planDate,
        content,
      },
    });

    if (duplicatedPlan && duplicatedPlan.id !== currentPlanId) {
      throw new ConflictException('计划内容重复');
    }
  }

  private getNormalizedDate(dateString: string) {
    const targetDate = new Date(dateString);
    return new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    );
  }

  private formatDate(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toPlanItem(plan: {
    id: bigint;
    longTaskId: bigint;
    content: string;
    planDate: Date;
    isCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: Number(plan.id),
      longTaskId: Number(plan.longTaskId),
      content: plan.content,
      planDate: plan.planDate,
      isCompleted: plan.isCompleted,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}
