import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(err: Error | null, user: TUser) {
    if (err) {
      throw err;
    }

    if (!user) {
      throw new UnauthorizedException('未登录或 token 无效');
    }

    return user;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
