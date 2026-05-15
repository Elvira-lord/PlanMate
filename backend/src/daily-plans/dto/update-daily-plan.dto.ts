import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateDailyPlanDto {
  @IsOptional()
  @IsString({ message: 'content 必须为字符串' })
  @MinLength(1, { message: 'content 不能为空' })
  @MaxLength(255, { message: 'content 长度不能超过 255 位' })
  content?: string;

  @IsOptional()
  @Type(() => String)
  @IsDateString({}, { message: 'planDate 格式不正确' })
  planDate?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'isCompleted 必须为布尔值' })
  isCompleted?: boolean;
}
