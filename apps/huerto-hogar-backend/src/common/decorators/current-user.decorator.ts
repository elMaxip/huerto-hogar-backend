import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@app/contracts/auth';
import { AuthenticatedRequest } from '../guards/jwt-auth.guard.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
