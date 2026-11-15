import { RpcError } from '@app/contracts/common/rpc-error.js';
import { RpcException } from '@nestjs/microservices';

export class RoleNotFoundException extends RpcException {
  constructor() {
    super({
      statusCode: 404,
      message: 'Rol no encontrado',
    } satisfies RpcError);
  }
}
