import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto.js';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { UpdateProductDto } from './update-product.dto.js';
import { Type } from 'class-transformer';

export class UpdateProductMessage {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ValidateNested()
  @Type(() => UpdateProductDto)
  data: UpdateProductDto;
}
