import { RpcError } from '@app/contracts/common/rpc-error.js';
import { RpcException } from '@nestjs/microservices';

export class UserExistsException extends RpcException {
  constructor() {
    super({
      statusCode: 409,
      message: 'Ya existe un usuario con este correo',
    } satisfies RpcError);
  }
}
