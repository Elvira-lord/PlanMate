import { IsOptional, IsDateString } from 'class-validator';

export class CheckinDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
