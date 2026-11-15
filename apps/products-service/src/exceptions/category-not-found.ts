import { RpcError } from '@app/contracts';
import { RpcException } from '@nestjs/microservices';

export class CategoryNotFound extends RpcException {
  constructor() {
    super({
      statusCode: 404,
      message: 'Categoría no encontrada',
    } satisfies RpcError);
  }
}
