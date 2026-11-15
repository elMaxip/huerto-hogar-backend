import { Inject, Injectable } from '@nestjs/common';
import {
  CreateUserDto,
  UpdateRefreshTokenDto,
  UserCredentialsResponse,
  UserResponse,
  USERS_PATTERNS,
  UserSessionResponse,
} from '@app/contracts/users';
import {
  AuthTokensResponse,
  LoginDto,
  LoginResponse,
  LogoutDto,
  RefreshTokenDto,
} from '@app/contracts/auth';
import { USERS_SERVICE } from '../users/users.constants.js';
import { ClientProxy } from '@nestjs/microservices';
import { HashService } from '../hash/hash.service.js';
import { TokensService } from '../tokens/tokens.service.js';
import { UserExistsException } from '../exceptions/UserExistsException.js';
import { UnauthorizedException } from '../exceptions/UnauthorizedException.js';
import { RpcError } from '@app/contracts';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USERS_SERVICE) private readonly usersClient: ClientProxy,
    private readonly hashService: HashService,
    private readonly tokensService: TokensService,
  ) {}

  async register(dto: CreateUserDto): Promise<UserResponse> {
    if (await this.userExists(dto.email)) throw new UserExistsException();

    const hashedPassword = await this.hashService.hash(dto.password);

    return firstValueFrom(
      this.usersClient.send<UserResponse, CreateUserDto>(
        USERS_PATTERNS.CREATE,
        {
          ...dto,
          password: hashedPassword,
        },
      ),
    );
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const credentials = await this.findCredentials(dto.email);

    if (!credentials) throw new UnauthorizedException();

    const { password, ...user } = credentials;
    const isPasswordValid = await this.hashService.compare(
      dto.password,
      password,
    );

    if (!isPasswordValid) throw new UnauthorizedException();

    const tokens = await this.issueTokens(user);

    return { user, ...tokens };
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthTokensResponse> {
    const userId = await this.tokensService.verifyRefreshToken(
      dto.refreshToken,
    );
    const session = await this.findSession(userId);

    if (!session?.refreshTokenHash) throw new UnauthorizedException();

    const { refreshTokenHash, ...user } = session;

    if (!this.tokensService.matches(dto.refreshToken, refreshTokenHash)) {
      await this.saveRefreshTokenHash(user.id, null);
      throw new UnauthorizedException();
    }

    return this.issueTokens(user);
  }

  async logout(dto: LogoutDto): Promise<void> {
    await this.saveRefreshTokenHash(dto.userId, null);
  }

  private async issueTokens(user: UserResponse): Promise<AuthTokensResponse> {
    const tokens = await this.tokensService.generate(user);

    await this.saveRefreshTokenHash(
      user.id,
      this.tokensService.hash(tokens.refreshToken),
    );

    return tokens;
  }

  private async saveRefreshTokenHash(
    id: number,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await firstValueFrom(
      this.usersClient.send<void, UpdateRefreshTokenDto>(
        USERS_PATTERNS.UPDATE_REFRESH_TOKEN,
        { id, refreshTokenHash },
      ),
      { defaultValue: undefined },
    );
  }

  private async findSession(id: number): Promise<UserSessionResponse | null> {
    try {
      return await firstValueFrom(
        this.usersClient.send<UserSessionResponse>(
          USERS_PATTERNS.FIND_SESSION,
          { id },
        ),
      );
    } catch (error) {
      if ((error as RpcError)?.statusCode === 404) return null;
      throw error;
    }
  }

  private async findCredentials(
    email: string,
  ): Promise<UserCredentialsResponse | null> {
    try {
      return await firstValueFrom(
        this.usersClient.send<UserCredentialsResponse>(
          USERS_PATTERNS.FIND_CREDENTIALS,
          { email },
        ),
      );
    } catch (error) {
      if ((error as RpcError)?.statusCode === 404) return null;
      throw error;
    }
  }

  private async userExists(email: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.usersClient.send<UserResponse>(USERS_PATTERNS.FIND_ONE, { email }),
      );
      return true;
    } catch (error) {
      if ((error as RpcError)?.statusCode === 404) return false;
      throw error;
    }
  }
}
