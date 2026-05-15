import { IsIn, IsOptional } from 'class-validator';

const periodTypes = ['weekly', 'monthly', 'yearly'] as const;

export class GetProfileStatsDto {
  @IsOptional()
  @IsIn(periodTypes, {
    message: 'periodType 只能是 weekly、monthly 或 yearly',
  })
  periodType?: (typeof periodTypes)[number];

  @IsOptional()
  date?: string;
}
