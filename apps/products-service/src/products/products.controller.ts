import { Controller } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CATEGORIES_PATTERNS,
  CategoryResponse,
  CreateProductDto,
  FindProductsDto,
  ProductResponse,
  PRODUCTS_PATTERNS,
  ProductVersionResponse,
  UpdateProductMessage,
} from '@app/contracts/products';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @MessagePattern(PRODUCTS_PATTERNS.FIND_ALL)
  findAll(@Payload() dto: FindProductsDto): Promise<ProductResponse[]> {
    return this.productsService.findAll(dto);
  }

  @MessagePattern(PRODUCTS_PATTERNS.FIND_ONE)
  findOne(@Payload() id: string): Promise<ProductResponse> {
    return this.productsService.findOne(id);
  }

  @MessagePattern(PRODUCTS_PATTERNS.FIND_VERSIONS)
  findVersions(): Promise<ProductVersionResponse[]> {
    return this.productsService.findVersions();
  }

  @MessagePattern(CATEGORIES_PATTERNS.FIND_ALL)
  findCategories(): Promise<CategoryResponse[]> {
    return this.productsService.findCategories();
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
  delete(@Payload() id: string): Promise<void> {
    return this.productsService.delete(id);
  }
}
