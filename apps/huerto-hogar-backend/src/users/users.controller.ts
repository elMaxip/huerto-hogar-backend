import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { USERS_SERVICE } from './users.constants.js';
import {
  CreateUserDto,
  GetUserDto,
  UserResponse,
  USERS_PATTERNS,
} from '@app/contracts/users';

@Controller('users')
export class UsersController {
  constructor(
    @Inject(USERS_SERVICE) private readonly usersClient: ClientProxy,
  ) {}

  @Get()
  findOne(@Body() dto: GetUserDto): Observable<UserResponse> {
    return this.usersClient.send(USERS_PATTERNS.FIND_ONE, dto);
  }

  @Post()
  create(@Body() dto: CreateUserDto): Observable<UserResponse> {
    return this.usersClient.send(USERS_PATTERNS.CREATE, dto);
  }
}
