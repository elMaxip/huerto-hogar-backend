import { RpcError } from '@app/contracts';
import { RpcException } from '@nestjs/microservices';

export class UserExistsException extends RpcException {
  constructor() {
    super({
      statusCode: 409,
      message: 'Usuario ya creado',
    } satisfies RpcError);
  }
}
