import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('无管理员权限');
    }

    return true;
  }
}
