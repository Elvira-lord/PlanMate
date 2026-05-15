import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAiConfigDto {
  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'provider 必须为字符串' })
  @MaxLength(50, { message: 'provider 长度不能超过 50 位' })
  provider?: string;

  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'model 必须为字符串' })
  @MaxLength(100, { message: 'model 长度不能超过 100 位' })
  model?: string;

  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'baseUrl 必须为字符串' })
  @MaxLength(255, { message: 'baseUrl 长度不能超过 255 位' })
  baseUrl?: string;

  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'apiKey 必须为字符串' })
  @MaxLength(255, { message: 'apiKey 长度不能超过 255 位' })
  apiKey?: string;
}
