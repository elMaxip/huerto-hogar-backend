import { RpcError } from '@app/contracts';
import { RpcException } from '@nestjs/microservices';

export class ProductNotFound extends RpcException {
  constructor() {
    super({
      statusCode: 404,
      message: 'Producto no encontrado',
    } satisfies RpcError);
  }
}
