import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/huerto-hogar-backend/.env',
    }),
    UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
