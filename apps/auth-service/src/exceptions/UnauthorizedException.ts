import { RpcError } from '@app/contracts';
import { RpcException } from '@nestjs/microservices';

export class UnauthorizedException extends RpcException {
  constructor() {
    super({
      statusCode: 401,
      message: 'Credenciales inválidas',
    } satisfies RpcError);
  }
}
