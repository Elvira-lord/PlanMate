import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

type UserAiConfig = {
  aiProvider?: string | null;
  aiModel?: string | null;
  aiBaseUrl?: string | null;
  aiApiKey?: string | null;
};

type AiRuntimeConfig = {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
};

type TextGenerationParams = {
  prompt: string;
  userAiConfig?: UserAiConfig;
};

type TodayTaskSuggestion = {
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  source: 'ai';
};

type LongTaskSuggestion = {
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  source: 'ai';
};

type DailyPlanSuggestion = {
  content: string;
  planDate: string;
};

@Injectable()
export class AiService {
  async generateText(params: TextGenerationParams): Promise<string> {
    this.ensureAsciiWorkingDirectory();

    const runtimeConfig = this.resolveRuntimeConfig(params.userAiConfig);
    const provider = runtimeConfig.provider.toLowerCase();

    if (provider === 'anthropic') {
      return this.generateWithAnthropic(params.prompt, runtimeConfig);
    }

    return this.generateWithOpenAiCompatible(params.prompt, runtimeConfig);
  }

  async generateTodayTasks(input: {
    aiPrompt?: string | null;
    userPrompt: string;
    taskDate: string;
    count: number;
    userAiConfig?: UserAiConfig;
  }): Promise<TodayTaskSuggestion[]> {
    const prompt = [
      '你是一个任务规划助手。',
      input.aiPrompt?.trim() || '请根据用户目标生成清晰可执行的今日任务。',
      `日期：${input.taskDate}`,
      `请生成 ${input.count} 条今日任务建议。`,
      `用户目标：${input.userPrompt}`,
      '要求：',
      '1. 返回 JSON 对象，格式为 {"list":[{"title":"","description":"","priority":"high|medium|low","source":"ai"}]}',
      '2. title 简洁明确，description 可选但建议补充执行细节。',
      '3. priority 只能是 high、medium、low。',
      '4. source 固定为 ai。',
      '5. 不要输出 Markdown，不要输出多余解释。',
    ].join('\n');

    const content = await this.generateText({
      prompt,
      userAiConfig: input.userAiConfig,
    });
    const data = this.parseJsonResponse<{ list: TodayTaskSuggestion[] }>(content);

    return this.normalizeTodayTasks(data.list).slice(0, input.count);
  }

  async generateLongTasks(input: {
    aiPrompt?: string | null;
    userPrompt: string;
    count: number;
    userAiConfig?: UserAiConfig;
  }): Promise<LongTaskSuggestion[]> {
    const prompt = [
      '你是一个长期目标拆解助手。',
      input.aiPrompt?.trim() || '请根据用户目标生成阶段性长期任务。',
      `请生成 ${input.count} 条长期任务建议。`,
      `用户目标：${input.userPrompt}`,
      '要求：',
      '1. 返回 JSON 对象，格式为 {"list":[{"title":"","description":"","priority":"high|medium|low","source":"ai"}]}',
      '2. title 要能代表一个阶段目标，description 用来补充推进方式。',
      '3. priority 只能是 high、medium、low。',
      '4. source 固定为 ai。',
      '5. 不要输出 Markdown，不要输出多余解释。',
    ].join('\n');

    const content = await this.generateText({
      prompt,
      userAiConfig: input.userAiConfig,
    });
    const data = this.parseJsonResponse<{ list: LongTaskSuggestion[] }>(content);

    return this.normalizeLongTasks(data.list).slice(0, input.count);
  }

  async generateDailyPlans(input: {
    aiPrompt?: string | null;
    userPrompt: string;
    longTaskTitle: string;
    longTaskDescription: string;
    startDate: string;
    count: number;
    userAiConfig?: UserAiConfig;
  }): Promise<DailyPlanSuggestion[]> {
    const prompt = [
      '你是一个每日计划助手。',
      input.aiPrompt?.trim() || '请围绕长期任务生成可执行的每日计划。',
      `长期任务标题：${input.longTaskTitle}`,
      `长期任务描述：${input.longTaskDescription || '无'}`,
      `开始日期：${input.startDate}`,
      `补充说明：${input.userPrompt}`,
      `请生成 ${input.count} 条每日计划建议。`,
      '要求：',
      '1. 返回 JSON 对象，格式为 {"list":[{"content":"","planDate":"YYYY-MM-DD"}]}',
      '2. content 必须具体可执行。',
      '3. planDate 必须是 YYYY-MM-DD。',
      '4. 不要输出 Markdown，不要输出多余解释。',
    ].join('\n');

    const content = await this.generateText({
      prompt,
      userAiConfig: input.userAiConfig,
    });
    const data = this.parseJsonResponse<{ list: DailyPlanSuggestion[] }>(content);

    return this.normalizeDailyPlans(data.list).slice(0, input.count);
  }

  private async generateWithAnthropic(
    prompt: string,
    runtimeConfig: AiRuntimeConfig,
  ) {
    const client = new Anthropic({ apiKey: runtimeConfig.apiKey });
    const response = await client.messages.create({
      model: runtimeConfig.model,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text = response.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n')
      .trim();

    if (!text) {
      throw new BadRequestException('AI 未返回有效内容');
    }

    return text;
  }

  private async generateWithOpenAiCompatible(
    prompt: string,
    runtimeConfig: AiRuntimeConfig,
  ) {
    const client = new OpenAI({
      apiKey: runtimeConfig.apiKey,
      baseURL: this.normalizeOpenAiBaseUrl(runtimeConfig.baseUrl),
    });

    const response = await client.chat.completions.create({
      model: runtimeConfig.model,
      temperature: 0.4,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();

    if (!text) {
      throw new BadRequestException('AI 未返回有效内容');
    }

    return text;
  }

  private resolveRuntimeConfig(userAiConfig?: UserAiConfig): AiRuntimeConfig {
    const provider = userAiConfig?.aiProvider?.trim();
    const model = userAiConfig?.aiModel?.trim();
    const baseUrl = userAiConfig?.aiBaseUrl?.trim();
    const apiKey = userAiConfig?.aiApiKey?.trim();

    if (provider && model && apiKey) {
      return {
        provider,
        model,
        apiKey,
        ...(baseUrl ? { baseUrl } : {}),
      };
    }

    return this.getDefaultConfig();
  }

  private getDefaultConfig(): AiRuntimeConfig {
    const provider = process.env.AI_PROVIDER?.trim() || 'anthropic';
    const model = process.env.AI_MODEL?.trim();
    const baseUrl = process.env.AI_BASE_URL?.trim();
    const apiKey =
      process.env.AI_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim();

    if (!model) {
      throw new BadRequestException('缺少 AI_MODEL 环境变量');
    }

    if (!apiKey) {
      throw new BadRequestException(
        '缺少 AI_API_KEY 或 ANTHROPIC_API_KEY 环境变量',
      );
    }

    return {
      provider,
      model,
      apiKey,
      ...(baseUrl ? { baseUrl } : {}),
    };
  }

  private normalizeOpenAiBaseUrl(baseUrl?: string) {
    if (!baseUrl) {
      return undefined;
    }

    let url = baseUrl.replace(/\/+$/, '');
    // 自动去除用户可能输入的完整路径后缀，避免 OpenAI SDK 双重拼接
    url = url.replace(/\/chat\/completions$/i, '');
    return url;
  }

  private parseJsonResponse<T>(content: string): T {
    const normalized = content.trim();
    const withoutCodeFence = normalized
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      return JSON.parse(withoutCodeFence) as T;
    } catch {
      const firstBraceIndex = withoutCodeFence.indexOf('{');
      const lastBraceIndex = withoutCodeFence.lastIndexOf('}');

      if (firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex) {
        const possibleJson = withoutCodeFence
          .slice(firstBraceIndex, lastBraceIndex + 1)
          .trim();
        return JSON.parse(possibleJson) as T;
      }

      throw new BadRequestException('AI 返回内容不是合法 JSON');
    }
  }

  private normalizeTodayTasks(list: TodayTaskSuggestion[]) {
    if (!Array.isArray(list)) {
      throw new BadRequestException('AI 返回的今日任务格式不正确');
    }

    return list
      .filter((item) => item && typeof item.title === 'string')
      .map((item) => ({
        title: item.title.trim(),
        description: item.description?.trim() || undefined,
        priority: this.normalizePriority(item.priority),
        source: 'ai' as const,
      }))
      .filter((item) => item.title);
  }

  private normalizeLongTasks(list: LongTaskSuggestion[]) {
    if (!Array.isArray(list)) {
      throw new BadRequestException('AI 返回的长期任务格式不正确');
    }

    return list
      .filter((item) => item && typeof item.title === 'string')
      .map((item) => ({
        title: item.title.trim(),
        description: item.description?.trim() || undefined,
        priority: this.normalizePriority(item.priority),
        source: 'ai' as const,
      }))
      .filter((item) => item.title);
  }

  private normalizeDailyPlans(list: DailyPlanSuggestion[]) {
    if (!Array.isArray(list)) {
      throw new BadRequestException('AI 返回的每日计划格式不正确');
    }

    return list
      .filter(
        (item) =>
          item &&
          typeof item.content === 'string' &&
          typeof item.planDate === 'string',
      )
      .map((item) => ({
        content: item.content.trim(),
        planDate: item.planDate.trim(),
      }))
      .filter((item) => item.content && /^\d{4}-\d{2}-\d{2}$/.test(item.planDate));
  }

  private normalizePriority(priority?: string): 'high' | 'medium' | 'low' {
    if (priority === 'high' || priority === 'medium' || priority === 'low') {
      return priority;
    }

    return 'medium';
  }

  private ensureAsciiWorkingDirectory() {
    const currentWorkingDirectory = process.cwd();

    if (/[^\u0000-\u007F]/.test(currentWorkingDirectory)) {
      throw new BadRequestException(
        '当前项目路径包含非英文字符，生产模式下可能导致 Node 运行异常，请将项目移动到纯英文路径后再执行 AI 相关操作。',
      );
    }
  }
}
