import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @IsString({ message: '密码必须为字符串' })
  @MinLength(6, { message: '密码长度不能少于 6 位' })
  @MaxLength(50, { message: '密码长度不能超过 50 位' })
  password: string;
}
