import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @MinLength(3, {
    message: 'El nombre del producto debe tener mínimo 3 carácteres',
  })
  @MaxLength(100, {
    message: 'El nombre del producto debe tener máximo 100 carácteres',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsInt()
  @Min(1)
  @Max(99999999)
  price: number;

  @IsInt()
  @Min(1)
  @Max(100)
  discount?: number;

  @IsString()
  @IsNotEmpty()
  unidadVenta: string;

  @IsString()
  @IsNotEmpty()
  img: string;

  @IsInt()
  @Min(0)
  stock: number;

  @IsString()
  @IsNotEmpty()
  description: string;
}
