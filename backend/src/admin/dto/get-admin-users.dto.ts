import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const roles = ['user', 'admin'] as const;

export class GetAdminUsersDto {
  @IsOptional()
  @IsString({ message: 'keyword 必须为字符串' })
  keyword?: string;

  @IsOptional()
  @IsIn(roles, { message: 'role 只能是 user 或 admin' })
  role?: (typeof roles)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page 必须为整数' })
  @Min(1, { message: 'page 不能小于 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize 必须为整数' })
  @Min(1, { message: 'pageSize 不能小于 1' })
  @Max(100, { message: 'pageSize 不能大于 100' })
  pageSize?: number;
}
