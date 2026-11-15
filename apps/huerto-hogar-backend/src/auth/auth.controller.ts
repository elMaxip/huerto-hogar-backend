import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { AUTH_SERVICE } from './auth.constants.js';
import {
  AUTH_PATTERNS,
  AuthTokensResponse,
  LoginDto,
  LoginResponse,
  LogoutDto,
  RefreshTokenDto,
} from '@app/contracts/auth';
import type { JwtPayload } from '@app/contracts/auth';
import { CreateUserDto, UserResponse } from '@app/contracts/users';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
  ) {}

  @Post('register')
  register(@Body() dto: CreateUserDto): Observable<UserResponse> {
    return this.authClient.send(AUTH_PATTERNS.REGISTER, dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Observable<LoginResponse> {
    return this.authClient.send(AUTH_PATTERNS.LOGIN, dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto): Observable<AuthTokensResponse> {
    return this.authClient.send(AUTH_PATTERNS.REFRESH, dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: JwtPayload): Promise<void> {
    await firstValueFrom(
      this.authClient.send<void, LogoutDto>(AUTH_PATTERNS.LOGOUT, {
        userId: user.sub,
      }),
      { defaultValue: undefined },
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload): JwtPayload {
    return user;
  }
}
