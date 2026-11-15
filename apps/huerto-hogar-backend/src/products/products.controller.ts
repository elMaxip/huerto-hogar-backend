import {
  BadRequestException,
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
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import { defaultIfEmpty, Observable } from 'rxjs';
import {
  CreateProductDto,
  FindProductsDto,
  ProductResponse,
  PRODUCTS_PATTERNS,
  ProductVersionResponse,
  UpdateProductDto,
} from '@app/contracts/products';
import { ROLES } from '@app/contracts/users';
import { STORAGE, type Storage } from '@app/storage';
import { PRODUCTS_SERVICE } from './products.constants.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { detectImageType } from '../uploads/image-type.js';

export const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

interface UploadedImage {
  buffer: Buffer;
  size: number;
}

export interface UploadedImageResponse {
  key: string;
  url: string;
}

@Controller('products')
export class ProductsController {
  constructor(
    @Inject(PRODUCTS_SERVICE) private readonly productsClient: ClientProxy,
    @Inject(STORAGE) private readonly storage: Storage,
  ) {}

  @Get()
  findAll(@Query('ids') ids?: string): Observable<ProductResponse[]> {
    const payload: FindProductsDto = {};

    if (ids !== undefined) {
      payload.ids = ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    }

    return this.productsClient.send(PRODUCTS_PATTERNS.FIND_ALL, payload);
  }

  @Get('versions')
  findVersions(): Observable<ProductVersionResponse[]> {
    return this.productsClient.send(PRODUCTS_PATTERNS.FIND_VERSIONS, {});
  }

  @Get(':id')
  findOne(@Param('id') id: string): Observable<ProductResponse> {
    return this.productsClient.send(PRODUCTS_PATTERNS.FIND_ONE, id);
  }

  @Post('images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_SIZE, files: 1 } }),
  )
  async uploadImage(
    @UploadedFile() file: UploadedImage | undefined,
  ): Promise<UploadedImageResponse> {
    if (!file) throw new BadRequestException('Falta la imagen (campo "image")');

    const type = detectImageType(file.buffer);

    if (!type) {
      throw new BadRequestException(
        'La imagen debe ser JPG, PNG, WEBP, GIF o AVIF',
      );
    }

    const key = `products/${randomUUID()}.${type.ext}`;
    await this.storage.put(key, file.buffer, type.mime);

    return { key, url: this.storage.publicUrl(key) };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  create(@Body() dto: CreateProductDto): Observable<ProductResponse> {
    return this.productsClient.send(PRODUCTS_PATTERNS.CREATE, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Observable<void> {
    return this.productsClient
      .send<void>(PRODUCTS_PATTERNS.DELETE, id)
      .pipe(defaultIfEmpty(undefined));
  }
}
