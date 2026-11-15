import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  AUTH_PATTERNS,
  AuthTokensResponse,
  LoginDto,
  LoginResponse,
  LogoutDto,
  RefreshTokenDto,
} from '@app/contracts/auth';
import { CreateUserDto, UserResponse } from '@app/contracts/users';
import { AuthService } from './auth.service.js';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(AUTH_PATTERNS.REGISTER)
  register(@Payload() payload: CreateUserDto): Promise<UserResponse> {
    return this.authService.register(payload);
  }

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  login(@Payload() payload: LoginDto): Promise<LoginResponse> {
    return this.authService.login(payload);
  }

  @MessagePattern(AUTH_PATTERNS.REFRESH)
  refresh(@Payload() payload: RefreshTokenDto): Promise<AuthTokensResponse> {
    return this.authService.refresh(payload);
  }

  @MessagePattern(AUTH_PATTERNS.LOGOUT)
  logout(@Payload() payload: LogoutDto): Promise<void> {
    return this.authService.logout(payload);
  }
}
