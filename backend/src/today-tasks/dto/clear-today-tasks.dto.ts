import { Type } from 'class-transformer';
import { IsDateString, IsOptional } from 'class-validator';

export class ClearTodayTasksDto {
  @IsOptional()
  @Type(() => String)
  @IsDateString({}, { message: 'taskDate 格式不正确' })
  taskDate?: string;
}
