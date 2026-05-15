import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class GenerateDailyPlansDto {
  @IsString({ message: 'prompt 必须为字符串' })
  @IsNotEmpty({ message: 'prompt 不能为空' })
  @MaxLength(500, { message: 'prompt 长度不能超过 500 位' })
  prompt: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'count 必须为整数' })
  @Min(1, { message: 'count 不能小于 1' })
  @Max(5, { message: 'count 不能大于 5' })
  count?: number;
}
