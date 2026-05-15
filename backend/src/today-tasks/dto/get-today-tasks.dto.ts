import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class GetTodayTasksDto {
  @IsOptional()
  @IsDateString({}, { message: 'taskDate 格式不正确' })
  taskDate?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'isCompleted 必须为布尔值' })
  isCompleted?: boolean;
}
