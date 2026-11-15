import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USERS_SERVICE } from './users.constants.js';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: USERS_SERVICE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('USERS_SERVICE_HOST', 'localhost'),
            port: Number(config.get<string>('USERS_SERVICE_PORT', '3001')),
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class UsersModule {}
