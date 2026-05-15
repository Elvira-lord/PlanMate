import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAiPromptDto {
  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'AI 提示词必须为字符串' })
  @MaxLength(255, { message: 'AI 提示词长度不能超过 255 位' })
  aiPrompt?: string;
}
