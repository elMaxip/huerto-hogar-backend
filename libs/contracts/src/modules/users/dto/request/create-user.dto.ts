import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MinLength(4, { message: 'El mínimo de caracteres es de 4' })
  @MaxLength(100, { message: 'El máximo de caracteres es de 100' })
  fullname: string;

  @IsEmail({}, { message: 'Correo inválido' })
  email: string;

  @MinLength(8, { message: 'La contraseña debe tener 8 caracteres mínimo' })
  @MaxLength(100, {
    message: 'La contraseña debe tener menos de 100 caracteres',
  })
  password: string;
}
