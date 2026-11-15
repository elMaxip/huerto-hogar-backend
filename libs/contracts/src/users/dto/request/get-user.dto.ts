import { IsEmail, MaxLength, MinLength } from 'class-validator';

export class GetUserDto {
  @IsEmail({}, { message: 'Correo inválido' })
  email: string;
}
