import { IsIn } from 'class-validator';

const statuses = ['active', 'disabled'] as const;

export class UpdateAdminUserStatusDto {
  @IsIn(statuses, { message: 'status 只能是 active 或 disabled' })
  status!: (typeof statuses)[number];
}
