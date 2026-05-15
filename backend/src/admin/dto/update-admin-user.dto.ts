import { IsIn, IsOptional, IsString } from 'class-validator';

const roles = ['user', 'admin'] as const;

export class UpdateAdminUserDto {
  @IsOptional()
  @IsIn(roles, { message: 'role 只能是 user 或 admin' })
  role?: (typeof roles)[number];

  @IsOptional()
  @IsString({ message: 'username 必须为字符串' })
  username?: string;

  @IsOptional()
  @IsString({ message: 'email 必须为字符串' })
  email?: string;
}
