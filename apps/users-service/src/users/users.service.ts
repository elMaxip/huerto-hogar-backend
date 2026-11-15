import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { Repository } from 'typeorm';
import { GetUserDto, UserResponse } from '@app/contracts/users';
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
    const user = await this.usersRepository.findOne({
      where: { email: data.email },
      relations: {
        role: true,
      },
    });
    if (!user) throw new UserNotFoundException();

    if (user.password != data.password) throw new UserNotFoundException();
    return this.toResponse(user);
  }

  async create(data: CreateUserDto): Promise<UserResponse> {
    const role = await this.rolesRepository.findOneBy({ role: 'CLIENT' });

    if (!role) throw new RoleNotFoundException();

    const user = this.usersRepository.create({
      ...data,
      role,
    });
    return this.toResponse(await this.usersRepository.save(user));
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
