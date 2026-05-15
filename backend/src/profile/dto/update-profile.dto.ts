import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: '用户名必须为字符串' })
  @MinLength(2, { message: '用户名长度不能少于 2 位' })
  @MaxLength(20, { message: '用户名长度不能超过 20 位' })
  username?: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;
}
