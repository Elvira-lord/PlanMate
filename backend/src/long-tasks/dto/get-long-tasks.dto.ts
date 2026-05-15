import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class GetLongTasksDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'isCompleted 必须为布尔值' })
  isCompleted?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'date 必须为有效日期字符串' })
  date?: string;
}
