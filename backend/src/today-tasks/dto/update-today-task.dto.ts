import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const priorities = ['high', 'medium', 'low'] as const;

export class UpdateTodayTaskDto {
  @IsOptional()
  @IsString({ message: 'title 必须为字符串' })
  @MinLength(1, { message: 'title 不能为空' })
  @MaxLength(100, { message: 'title 长度不能超过 100 位' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'description 必须为字符串' })
  description?: string;

  @IsOptional()
  @IsIn(priorities, { message: 'priority 只能是 high、medium 或 low' })
  priority?: (typeof priorities)[number];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'isCompleted 必须为布尔值' })
  isCompleted?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'sortOrder 必须为整数' })
  sortOrder?: number;
}
