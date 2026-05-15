import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const priorities = ['high', 'medium', 'low'] as const;
const sources = ['manual', 'ai'] as const;

export class CreateTodayTaskDto {
  @IsString({ message: 'title 必须为字符串' })
  @MinLength(1, { message: 'title 不能为空' })
  @MaxLength(100, { message: 'title 长度不能超过 100 位' })
  title: string;

  @IsOptional()
  @IsString({ message: 'description 必须为字符串' })
  description?: string;

  @IsIn(priorities, { message: 'priority 只能是 high、medium 或 low' })
  priority: (typeof priorities)[number];

  @IsOptional()
  @IsDateString({}, { message: 'taskDate 格式不正确' })
  taskDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'sortOrder 必须为整数' })
  sortOrder?: number;

  @IsOptional()
  @IsIn(sources, { message: 'source 只能是 manual 或 ai' })
  source?: (typeof sources)[number];
}
