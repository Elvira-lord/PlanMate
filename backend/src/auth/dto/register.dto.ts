import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString({ message: '用户名必须为字符串' })
  @MinLength(2, { message: '用户名长度不能少于 2 位' })
  @MaxLength(20, { message: '用户名长度不能超过 20 位' })
  username: string;

  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @IsString({ message: '密码必须为字符串' })
  @MinLength(6, { message: '密码长度不能少于 6 位' })
  @MaxLength(50, { message: '密码长度不能超过 50 位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\W_]+$/, {
    message: '密码需至少包含字母和数字',
  })
  password: string;
}
