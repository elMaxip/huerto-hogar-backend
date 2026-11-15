import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createStorage,
  storageConfigFromEnv,
  type Storage,
  type StorageConfig,
} from './storage.js';

export const STORAGE = Symbol('STORAGE');
export const STORAGE_CONFIG = Symbol('STORAGE_CONFIG');

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StorageConfig =>
        storageConfigFromEnv({
          STORAGE_DRIVER: config.get('STORAGE_DRIVER'),
          LOCAL_STORAGE_DIR: config.get('LOCAL_STORAGE_DIR'),
          S3_BUCKET: config.get('S3_BUCKET'),
          S3_REGION: config.get('S3_REGION'),
          AWS_REGION: config.get('AWS_REGION'),
          ASSETS_BASE_URL: config.get('ASSETS_BASE_URL'),
          PORT: config.get('PORT'),
        }),
    },
    {
      provide: STORAGE,
      inject: [STORAGE_CONFIG],
      useFactory: (config: StorageConfig): Storage => createStorage(config),
    },
  ],
  exports: [STORAGE, STORAGE_CONFIG],
})
export class StorageModule {}
