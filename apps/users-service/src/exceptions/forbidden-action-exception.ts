import { RpcError } from '@app/contracts/common/rpc-error.js';
import { RpcException } from '@nestjs/microservices';

export class ForbiddenActionException extends RpcException {
  constructor(message: string) {
    super({ statusCode: 403, message } satisfies RpcError);
  }
}
