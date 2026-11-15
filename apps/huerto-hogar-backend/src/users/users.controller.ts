import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { defaultIfEmpty, Observable } from 'rxjs';
import {
  AdminCreateUserDto,
  AdminUpdateUserDto,
  DeleteUserMessage,
  ROLES,
  UpdateUserMessage,
  UserResponse,
  USERS_PATTERNS,
} from '@app/contracts/users';
import type { JwtPayload } from '@app/contracts/auth';
import { USERS_SERVICE } from './users.constants.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMIN)
export class UsersController {
  constructor(
    @Inject(USERS_SERVICE) private readonly usersClient: ClientProxy,
  ) {}

  @Get()
  findAll(): Observable<UserResponse[]> {
    return this.usersClient.send(USERS_PATTERNS.FIND_ALL, {});
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Observable<UserResponse> {
    return this.usersClient.send(USERS_PATTERNS.FIND_BY_ID, { id });
  }

  @Post()
  create(@Body() dto: AdminCreateUserDto): Observable<UserResponse> {
    return this.usersClient.send(USERS_PATTERNS.CREATE_BY_ADMIN, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() actor: JwtPayload,
  ): Observable<UserResponse> {
    return this.usersClient.send<UserResponse, UpdateUserMessage>(
      USERS_PATTERNS.UPDATE,
      { id, actorId: actor.sub, data: dto },
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: JwtPayload,
  ): Observable<void> {
    return this.usersClient
      .send<void, DeleteUserMessage>(USERS_PATTERNS.DELETE, {
        id,
        actorId: actor.sub,
      })
      .pipe(defaultIfEmpty(undefined));
  }
}
