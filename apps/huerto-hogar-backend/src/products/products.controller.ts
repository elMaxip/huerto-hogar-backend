import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PRODUCTS_SERVICE } from './products.constants.js';
import { ClientProxy } from '@nestjs/microservices';
import {
  CreateProductDto,
  ProductResponse,
  PRODUCTS_PATTERNS,
  UpdateProductDto,
} from '@app/contracts/products';
import { defaultIfEmpty, Observable } from 'rxjs';

@Controller('products')
export class ProductsController {
  constructor(
    @Inject(PRODUCTS_SERVICE) private readonly productsClient: ClientProxy,
  ) {}

  @Get()
  findAll(): Observable<ProductResponse[]> {
    return this.productsClient.send(PRODUCTS_PATTERNS.FIND_ALL, {});
  }

  @Post()
  create(@Body() dto: CreateProductDto): Observable<ProductResponse> {
    return this.productsClient.send(PRODUCTS_PATTERNS.CREATE, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Observable<ProductResponse> {
    return this.productsClient.send(PRODUCTS_PATTERNS.UPDATE, {
      productId: id,
      data: dto,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Observable<void> {
    return this.productsClient
      .send<void>(PRODUCTS_PATTERNS.DELETE, id)
      .pipe(defaultIfEmpty(undefined));
  }
}
