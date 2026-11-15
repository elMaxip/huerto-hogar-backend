import {
  CreateUserDto,
  GetUserDto,
  USERS_PATTERNS,
} from '@app/contracts/users';
import { UserResponse } from '@app/contracts/users';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service.js';

@Controller()
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @MessagePattern(USERS_PATTERNS.CREATE)
  create(@Payload() payload: CreateUserDto): Promise<UserResponse> {
    return this.userService.create(payload);
  }

  @MessagePattern(USERS_PATTERNS.FIND_ONE)
  findOne(@Payload() payload: GetUserDto): Promise<UserResponse> {
    return this.userService.findOne(payload);
  }
}
