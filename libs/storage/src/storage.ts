import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export interface StorageConfig {
  driver: 'local' | 's3';
  localDir: string;
  bucket?: string;
  region?: string;
  publicBaseUrl: string;
}

export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

type Env = Record<string, string | undefined>;

const ABSOLUTE_URL = /^(https?:|data:|blob:)/i;

export function isStorageKey(value: string | null | undefined): value is string {
  return Boolean(value) && !ABSOLUTE_URL.test(value!);
}

export function storageConfigFromEnv(env: Env): StorageConfig {
  const driver = env.STORAGE_DRIVER === 's3' ? 's3' : 'local';
  const bucket = env.S3_BUCKET;
  const region = env.AWS_REGION ?? env.S3_REGION;

  if (driver === 's3' && (!bucket || !region)) {
    throw new Error(
      'STORAGE_DRIVER=s3 requiere definir S3_BUCKET y AWS_REGION',
    );
  }

  const defaultBaseUrl =
    driver === 's3'
      ? `https://${bucket}.s3.${region}.amazonaws.com`
      : `http://localhost:${env.PORT ?? 3000}/uploads`;

  return {
    driver,
    localDir: env.LOCAL_STORAGE_DIR ?? 'uploads',
    bucket,
    region,
    publicBaseUrl: (env.ASSETS_BASE_URL ?? defaultBaseUrl).replace(/\/+$/, ''),
  };
}

function publicUrlFor(config: StorageConfig) {
  return (key: string) =>
    isStorageKey(key) ? `${config.publicBaseUrl}/${key}` : key;
}

function createLocalStorage(config: StorageConfig): Storage {
  const root = resolve(config.localDir);

  function pathFor(key: string) {
    const path = resolve(root, key);

    if (!path.startsWith(root + sep)) throw new Error(`Key inválida: ${key}`);

    return path;
  }

  return {
    async put(key, body) {
      const path = pathFor(key);

      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body);
    },
    async delete(key) {
      await rm(pathFor(key), { force: true });
    },
    publicUrl: publicUrlFor(config),
  };
}

function createS3Storage(config: StorageConfig): Storage {
  const client = new S3Client({ region: config.region });

  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    },
    async delete(key) {
      await client.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    },
    publicUrl: publicUrlFor(config),
  };
}

export function createStorage(config: StorageConfig): Storage {
  return config.driver === 's3'
    ? createS3Storage(config)
    : createLocalStorage(config);
}
