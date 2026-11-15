import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  GetUserByIdDto,
  ROLES,
  GetUserDto,
  UpdateRefreshTokenDto,
  UserCredentialsResponse,
  UserResponse,
  UserSessionResponse,
} from '@app/contracts/users';
import { CreateUserDto } from '@app/contracts/users';
import { Role } from '../roles/entities/role.entity.js';
import { UserNotFoundException } from '../exceptions/user-not-found-exception.js';
import { RoleNotFoundException } from '../exceptions/role-not-found-exception.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async findOne(data: GetUserDto): Promise<UserResponse> {
    return this.toResponse(await this.findBy({ email: data.email }));
  }

  async findCredentials(data: GetUserDto): Promise<UserCredentialsResponse> {
    const user = await this.findBy({ email: data.email });

    return { ...this.toResponse(user), password: user.password };
  }

  async findSession(data: GetUserByIdDto): Promise<UserSessionResponse> {
    const user = await this.findBy({ id: data.id });

    return {
      ...this.toResponse(user),
      refreshTokenHash: user.refreshTokenHash,
    };
  }

  async updateRefreshToken(data: UpdateRefreshTokenDto): Promise<void> {
    const result = await this.usersRepository.update(data.id, {
      refreshTokenHash: data.refreshTokenHash ?? null,
    });

    if (!result.affected) throw new UserNotFoundException();
  }

  async create(data: CreateUserDto): Promise<UserResponse> {
    const role = await this.rolesRepository.findOneBy({ role: ROLES.CLIENT });

    if (!role) throw new RoleNotFoundException();

    const user = this.usersRepository.create({
      ...data,
      role,
    });
    return this.toResponse(await this.usersRepository.save(user));
  }

  private async findBy(where: FindOptionsWhere<User>): Promise<User> {
    const user = await this.usersRepository.findOne({
      where,
      relations: {
        role: true,
      },
    });
    if (!user) throw new UserNotFoundException();

    return user;
  }

  private toResponse(user: User): UserResponse {
    return {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      role: user.role.role,
    };
  }
}
