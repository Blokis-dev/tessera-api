import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class UserOwnershipGuard implements CanActivate {
  constructor(private databaseService: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Del JWT
    const targetUserId = request.params.id || request.body.userId;
    const targetUserEmail = request.body.email;

    if (user.role === 'admin') {
      return true;
    }

    if (targetUserId && user.userId !== targetUserId) {
      throw new ForbiddenException('You can only modify your own account');
    }

    if (targetUserEmail && user.email !== targetUserEmail) {
      throw new ForbiddenException('You can only modify your own account');
    }

    return true;
  }
}
