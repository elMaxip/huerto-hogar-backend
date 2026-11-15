import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUTH_SERVICE } from './auth.constants.js';
import { AuthController } from './auth.controller.js';
import { UsersClientModule } from '../users/users-client.module.js';

@Module({
  imports: [
    UsersClientModule,
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('AUTH_SERVICE_HOST', 'localhost'),
            port: Number(config.get<string>('AUTH_SERVICE_PORT', '3003')),
          },
        }),
      },
    ]),
  ],
  controllers: [AuthController],
})
export class AuthModule {}
