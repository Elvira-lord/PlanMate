import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetAdminUserPasswordDto {
  @IsString({ message: 'newPassword 必须为字符串' })
  @MinLength(6, { message: 'newPassword 长度不能少于 6 位' })
  @MaxLength(50, { message: 'newPassword 长度不能超过 50 位' })
  newPassword!: string;
}
