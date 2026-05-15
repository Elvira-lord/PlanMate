import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prismaService: PrismaService) {
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET is required in .env'); })(),
    };

    super(options);
  }

  async validate(payload: JwtPayload) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: BigInt(payload.sub),
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在或 token 无效');
    }

    return {
      id: user.id.toString(),
      email: user.email,
      role: user.role,
      username: user.username,
    };
  }
}
