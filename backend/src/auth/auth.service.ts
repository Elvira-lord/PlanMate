import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async buildAuthResponse(user: {
    id: bigint;
    username: string;
    email: string;
    role: string;
  }) {
    const payload = {
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      id: Number(user.id),
      username: user.username,
      token,
      role: user.role,
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUserByUsername = await this.prismaService.user.findUnique({
      where: { username: registerDto.username },
    });

    if (existingUserByUsername) {
      throw new ConflictException('用户名已存在');
    }

    const existingUserByEmail = await this.prismaService.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('邮箱已存在');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prismaService.user.create({
      data: {
        username: registerDto.username,
        email: registerDto.email,
        password: hashedPassword,
      },
    });

    return this.buildAuthResponse(user);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('密码错误');
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    return this.buildAuthResponse(user);
  }
}
