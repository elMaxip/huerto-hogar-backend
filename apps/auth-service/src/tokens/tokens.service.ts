import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { AuthTokensResponse, JwtPayload } from '@app/contracts/auth';
import { UserResponse } from '@app/contracts/users';
import { UnauthorizedException } from '../exceptions/UnauthorizedException.js';

@Injectable()
export class TokensService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async generate(user: UserResponse): Promise<AuthTokensResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: Number(this.config.get('JWT_ACCESS_EXPIRES_IN', 900)),
      }),
      this.jwtService.signAsync(
        { sub: user.id },
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: Number(this.config.get('JWT_REFRESH_EXPIRES_IN', 604800)),
          jwtid: randomUUID(),
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async verifyRefreshToken(token: string): Promise<number> {
    try {
      const { sub } = await this.jwtService.verifyAsync<{ sub: number }>(
        token,
        { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') },
      );
      return sub;
    } catch {
      throw new UnauthorizedException();
    }
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  matches(token: string, savedHash: string): boolean {
    const tokenHash = Buffer.from(this.hash(token), 'hex');
    const saved = Buffer.from(savedHash, 'hex');

    return tokenHash.length === saved.length && timingSafeEqual(tokenHash, saved);
  }
}
