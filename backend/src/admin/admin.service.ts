import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { GetProfileStatsDto } from '../profile/dto/get-profile-stats.dto';
import { ProfileService } from '../profile/profile.service';
import { GetAdminUsersDto } from './dto/get-admin-users.dto';
import { ResetAdminUserPasswordDto } from './dto/reset-admin-user-password.dto';
import { UpdateAdminUserStatusDto } from './dto/update-admin-user-status.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

type UserStatus = 'active' | 'disabled';

@Injectable()
export class AdminService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly profileService: ProfileService,
  ) {}

  async getUsers(user: AuthenticatedUser, getAdminUsersDto: GetAdminUsersDto) {
    const page = getAdminUsersDto.page ?? 1;
    const pageSize = getAdminUsersDto.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where = {
      ...(getAdminUsersDto.keyword
        ? {
            OR: [
              {
                username: {
                  contains: getAdminUsersDto.keyword,
                },
              },
              {
                email: {
                  contains: getAdminUsersDto.keyword,
                },
              },
            ],
          }
        : {}),
      ...(getAdminUsersDto.role
        ? {
            role: getAdminUsersDto.role,
          }
        : {}),
    };

    const [list, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ id: 'asc' }],
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      list: list.map((item) => this.toAdminUserItem(item)),
      total,
      page,
      pageSize,
    };
  }

  async getUserDetail(user: AuthenticatedUser, id: number) {
    const targetUser = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!targetUser) {
      throw new NotFoundException('用户不存在');
    }

    return {
      ...this.toAdminUserItem(targetUser),
      aiPrompt: targetUser.aiPrompt,
      updatedAt: targetUser.updatedAt,
    };
  }

  async getUserStats(
    user: AuthenticatedUser,
    id: number,
    getProfileStatsDto: GetProfileStatsDto,
  ) {
    const targetUser = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!targetUser) {
      throw new NotFoundException('用户不存在');
    }

    return this.profileService.getProfileStats(String(id), getProfileStatsDto);
  }

  async updateUser(
    user: AuthenticatedUser,
    id: number,
    updateAdminUserDto: UpdateAdminUserDto,
  ) {
    const targetUser = await this.ensureUserExists(id);

    if (targetUser.id === BigInt(user.id)) {
      throw new ForbiddenException('不能修改自己的角色');
    }

    if (!updateAdminUserDto.role && !updateAdminUserDto.username && !updateAdminUserDto.email) {
      throw new BadRequestException('至少需要提供一个更新字段');
    }

    const data: Record<string, unknown> = {};
    if (updateAdminUserDto.role) data.role = updateAdminUserDto.role;
    if (updateAdminUserDto.username) data.username = updateAdminUserDto.username;
    if (updateAdminUserDto.email) data.email = updateAdminUserDto.email;

    const updatedUser = await this.prismaService.user.update({
      where: {
        id: targetUser.id,
      },
      data,
    });

    return this.toAdminUserItem({
      ...updatedUser,
      status: targetUser.status as 'active' | 'disabled',
    });
  }

  async updateUserStatus(
    user: AuthenticatedUser,
    id: number,
    updateAdminUserStatusDto: UpdateAdminUserStatusDto,
  ) {
    const targetUser = await this.ensureUserExists(id);

    if (targetUser.id === BigInt(user.id)) {
      throw new ForbiddenException('不能禁用自己的账号');
    }

    const updatedUser = await this.prismaService.user.update({
      where: {
        id: targetUser.id,
      },
      data: this.getStatusStoragePatch(targetUser, updateAdminUserStatusDto.status),
    });

    return this.toAdminUserItem({
      ...updatedUser,
      status: updateAdminUserStatusDto.status,
    });
  }

  async deleteUser(user: AuthenticatedUser, id: number) {
    const targetUser = await this.ensureUserExists(id);

    if (targetUser.id === BigInt(user.id)) {
      throw new ForbiddenException('不能删除自己的账号');
    }

    await this.prismaService.user.delete({
      where: {
        id: targetUser.id,
      },
    });

    return {
      id,
    };
  }

  async resetUserPassword(
    user: AuthenticatedUser,
    id: number,
    resetAdminUserPasswordDto: ResetAdminUserPasswordDto,
  ) {
    const targetUser = await this.ensureUserExists(id);

    if (targetUser.id === BigInt(user.id)) {
      throw new ForbiddenException('不能重置自己的密码');
    }

    const hashedPassword = await bcrypt.hash(
      resetAdminUserPasswordDto.newPassword,
      10,
    );

    const updatedUser = await this.prismaService.user.update({
      where: {
        id: targetUser.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    return {
      id: Number(updatedUser.id),
      updatedAt: updatedUser.updatedAt,
    };
  }

  private async ensureUserExists(id: number) {
    const targetUser = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!targetUser) {
      throw new NotFoundException('用户不存在');
    }

    return {
      ...targetUser,
      status: this.getUserStatus(targetUser),
    };
  }

  private getUserStatus(user: { avatar: string | null; aiBaseUrl?: string | null }) {
    if (user.aiBaseUrl === '__disabled__') {
      return 'disabled';
    }

    return 'active';
  }

  private getStatusStoragePatch(user: { aiBaseUrl: string | null }, status: UserStatus) {
    if (status === 'disabled') {
      return {
        aiBaseUrl: '__disabled__',
      };
    }

    return {
      aiBaseUrl: user.aiBaseUrl === '__disabled__' ? null : user.aiBaseUrl,
    };
  }

  private toAdminUserItem(user: {
    id: bigint;
    username: string;
    email: string;
    avatar: string | null;
    role: string;
    createdAt: Date;
    status?: 'active' | 'disabled';
  }) {
    return {
      id: Number(user.id),
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      status: user.status ?? this.getUserStatus(user as { avatar: string | null; aiBaseUrl?: string | null }),
      createdAt: user.createdAt,
    };
  }
}
