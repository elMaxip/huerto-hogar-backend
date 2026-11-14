import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config({
  path: 'apps/users-service/.env',
});

export const AppDataSource = new DataSource({
  type: 'postgres',

  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,

  entities: ['apps/users-service/src/**/*.entity{.ts,.js}'],

  migrations: ['apps/users-service/src/database/migrations/*{.ts,.js}'],

  synchronize: false,
  migrationsRun: false,

  migrationsTableName: 'migrations',
});
