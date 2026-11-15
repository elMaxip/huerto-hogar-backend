import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'node:path';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { STORAGE_CONFIG, type StorageConfig } from '@app/storage';
import { RpcToHttpFilter } from './common/filters/rpc-to-http.filter.js';

const DEFAULT_CORS_ORIGINS = [5173, 5174, 5175, 5176, 5177].flatMap((port) => [
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
]);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const origins = config.get<string>('CORS_ORIGINS');
  app.enableCors({
    origin: origins
      ? origins.split(',').map((origin) => origin.trim())
      : DEFAULT_CORS_ORIGINS,
    credentials: false,
  });

  const storage = app.get<StorageConfig>(STORAGE_CONFIG);
  if (storage.driver === 'local') {
    app.useStaticAssets(resolve(storage.localDir), {
      prefix: '/uploads/',
      maxAge: '365d',
      immutable: true,
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new RpcToHttpFilter());
  await app.listen(config.get('PORT') ?? 3000);
}
await bootstrap();
