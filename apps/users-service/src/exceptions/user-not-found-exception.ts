import { RpcError } from '@app/contracts/common/rpc-error.js';
import { RpcException } from '@nestjs/microservices';

export class UserNotFoundException extends RpcException {
  constructor() {
    super({
      statusCode: 404,
      message: 'Usuario no encontrado',
    } satisfies RpcError);
  }
}
