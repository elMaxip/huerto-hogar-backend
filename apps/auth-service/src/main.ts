import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module.js';
import { ValidationError, ValidationPipe } from '@nestjs/common';
import { RpcException, Transport } from '@nestjs/microservices';
import { RpcError } from '@app/contracts';

function flattenErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...flattenErrors(error.children ?? []),
  ]);
}

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AuthServiceModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3003,
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new RpcException({
          statusCode: 400,
          message: flattenErrors(errors),
        } satisfies RpcError),
    }),
  );

  await app.listen();
}
await bootstrap();
