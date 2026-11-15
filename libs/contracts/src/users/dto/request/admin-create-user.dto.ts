import { IsIn } from 'class-validator';
import { ROLES, type Role } from '../../roles.js';
import { CreateUserDto } from './create-user.dto.js';

export class AdminCreateUserDto extends CreateUserDto {
  @IsIn(Object.values(ROLES), { message: 'Rol inválido' })
  role: Role;
}
