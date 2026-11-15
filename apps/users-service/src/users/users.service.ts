import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { FindOptionsWhere, QueryFailedError, Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import {
  AdminCreateUserDto,
  CreateUserDto,
  DeleteUserMessage,
  GetUserByIdDto,
  ROLES,
  GetUserDto,
  UpdateRefreshTokenDto,
  UpdateUserMessage,
  UserCredentialsResponse,
  UserResponse,
  UserSessionResponse,
} from '@app/contracts/users';
import { Role } from '../roles/entities/role.entity.js';
import { UserNotFoundException } from '../exceptions/user-not-found-exception.js';
import { RoleNotFoundException } from '../exceptions/role-not-found-exception.js';
import { UserExistsException } from '../exceptions/user-exists-exception.js';
import { ForbiddenActionException } from '../exceptions/forbidden-action-exception.js';

const SALT_ROUNDS = 10;

const UNIQUE_VIOLATION = '23505';

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

  async findById(data: GetUserByIdDto): Promise<UserResponse> {
    return this.toResponse(await this.findBy({ id: data.id }));
  }

  async findAll(): Promise<UserResponse[]> {
    const users = await this.usersRepository.find({
      relations: { role: true },
      order: { id: 'ASC' },
    });

    return users.map((user) => this.toResponse(user));
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
    const user = this.usersRepository.create({
      ...data,
      role: await this.findRole(ROLES.CLIENT),
    });

    return this.toResponse(await this.save(user));
  }

  async createByAdmin(data: AdminCreateUserDto): Promise<UserResponse> {
    const { role, password, ...fields } = data;

    if (await this.usersRepository.existsBy({ email: fields.email })) {
      throw new UserExistsException();
    }

    const user = this.usersRepository.create({
      ...fields,
      password: await bcrypt.hash(password, SALT_ROUNDS),
      role: await this.findRole(role),
    });

    return this.toResponse(await this.save(user));
  }

  async update({ id, actorId, data }: UpdateUserMessage): Promise<UserResponse> {
    const user = await this.findBy({ id });
    const isSelf = id === actorId;
    const { role, password, email, fullname } = data;

    if (isSelf && role !== undefined && role !== ROLES.ADMIN) {
      throw new ForbiddenActionException(
        'No puedes quitarte el rol de administrador',
      );
    }

    const changesCredentials =
      (password !== undefined) ||
      (email !== undefined && email !== user.email) ||
      (role !== undefined && role !== user.role.role);

    if (email !== undefined && email !== user.email) {
      if (await this.usersRepository.existsBy({ email })) {
        throw new UserExistsException();
      }
      user.email = email;
    }

    if (fullname !== undefined) user.fullname = fullname;
    if (password !== undefined) {
      user.password = await bcrypt.hash(password, SALT_ROUNDS);
    }
    if (role !== undefined) user.role = await this.findRole(role);

    if (changesCredentials && !isSelf) user.refreshTokenHash = null;

    return this.toResponse(await this.save(user));
  }

  async delete({ id, actorId }: DeleteUserMessage): Promise<void> {
    if (id === actorId) {
      throw new ForbiddenActionException('No puedes eliminar tu propia cuenta');
    }

    const result = await this.usersRepository.delete(id);

    if (!result.affected) throw new UserNotFoundException();
  }

  private async findRole(role: string): Promise<Role> {
    const found = await this.rolesRepository.findOneBy({ role });

    if (!found) throw new RoleNotFoundException();

    return found;
  }

  private async save(user: User): Promise<User> {
    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        throw new UserExistsException();
      }
      throw error;
    }
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
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
