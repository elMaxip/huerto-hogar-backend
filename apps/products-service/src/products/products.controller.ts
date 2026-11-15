import { Controller } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateProductDto,
  ProductResponse,
  PRODUCTS_PATTERNS,
  UpdateProductMessage,
} from '@app/contracts/products';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @MessagePattern(PRODUCTS_PATTERNS.FIND_ALL)
  findAll(): Promise<ProductResponse[]> {
    return this.productsService.findAll();
  }

  @MessagePattern(PRODUCTS_PATTERNS.CREATE)
  create(@Payload() dto: CreateProductDto): Promise<ProductResponse> {
    return this.productsService.create(dto);
  }

  @MessagePattern(PRODUCTS_PATTERNS.UPDATE)
  update(@Payload() dto: UpdateProductMessage): Promise<ProductResponse> {
    return this.productsService.update(dto);
  }

  @MessagePattern(PRODUCTS_PATTERNS.DELETE)
  delete(@Payload() id: string) {
    return this.productsService.delete(id);
  }
}
