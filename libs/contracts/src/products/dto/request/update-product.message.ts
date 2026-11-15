import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateProductDto } from './update-product.dto.js';

export class UpdateProductMessage {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ValidateNested()
  @Type(() => UpdateProductDto)
  data: UpdateProductDto;
}
