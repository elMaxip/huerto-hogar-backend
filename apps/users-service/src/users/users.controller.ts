import {
  AdminCreateUserDto,
  CreateUserDto,
  DeleteUserMessage,
  GetUserByIdDto,
  GetUserDto,
  UpdateRefreshTokenDto,
  UpdateUserMessage,
  UserCredentialsResponse,
  UserResponse,
  USERS_PATTERNS,
  UserSessionResponse,
} from '@app/contracts/users';
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

  @MessagePattern(USERS_PATTERNS.FIND_CREDENTIALS)
  findCredentials(
    @Payload() payload: GetUserDto,
  ): Promise<UserCredentialsResponse> {
    return this.userService.findCredentials(payload);
  }

  @MessagePattern(USERS_PATTERNS.FIND_SESSION)
  findSession(@Payload() payload: GetUserByIdDto): Promise<UserSessionResponse> {
    return this.userService.findSession(payload);
  }

  @MessagePattern(USERS_PATTERNS.UPDATE_REFRESH_TOKEN)
  updateRefreshToken(@Payload() payload: UpdateRefreshTokenDto): Promise<void> {
    return this.userService.updateRefreshToken(payload);
  }

  @MessagePattern(USERS_PATTERNS.FIND_ALL)
  findAll(): Promise<UserResponse[]> {
    return this.userService.findAll();
  }

  @MessagePattern(USERS_PATTERNS.FIND_BY_ID)
  findById(@Payload() payload: GetUserByIdDto): Promise<UserResponse> {
    return this.userService.findById(payload);
  }

  @MessagePattern(USERS_PATTERNS.CREATE_BY_ADMIN)
  createByAdmin(@Payload() payload: AdminCreateUserDto): Promise<UserResponse> {
    return this.userService.createByAdmin(payload);
  }

  @MessagePattern(USERS_PATTERNS.UPDATE)
  update(@Payload() payload: UpdateUserMessage): Promise<UserResponse> {
    return this.userService.update(payload);
  }

  @MessagePattern(USERS_PATTERNS.DELETE)
  delete(@Payload() payload: DeleteUserMessage): Promise<void> {
    return this.userService.delete(payload);
  }
}
