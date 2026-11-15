import { Module } from '@nestjs/common';
import { UsersClientModule } from './users-client.module.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [UsersClientModule],
  controllers: [UsersController],
})
export class UsersModule {}
