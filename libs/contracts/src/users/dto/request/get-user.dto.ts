import { IsEmail, MaxLength, MinLength } from 'class-validator';

export class GetUserDto {
  @IsEmail({}, { message: 'Correo inválido' })
  email: string;

  @MinLength(8, { message: 'La contraseña debe tener 8 caracteres mínimo' })
  @MaxLength(100, {
    message: 'La contraseña debe tener menos de 100 caracteres',
  })
  password: string;
}
