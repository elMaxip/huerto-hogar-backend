import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import {
  CATEGORIES_PATTERNS,
  CategoryResponse,
} from '@app/contracts/products';
import { PRODUCTS_SERVICE } from './products.constants.js';

@Controller('categories')
export class CategoriesController {
  constructor(
    @Inject(PRODUCTS_SERVICE) private readonly productsClient: ClientProxy,
  ) {}

  @Get()
  findAll(): Observable<CategoryResponse[]> {
    return this.productsClient.send(CATEGORIES_PATTERNS.FIND_ALL, {});
  }
}
