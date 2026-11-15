import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity.js';
import { Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity.js';
import {
  CreateProductDto,
  ProductResponse,
  UpdateProductDto,
  UpdateProductMessage,
} from '@app/contracts/products';
import { CategoryNotFound } from '../exceptions/category-not-found.js';
import { ProductNotFound } from '../exceptions/product-not-found.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<ProductResponse[]> {
    const products = await this.productsRepository.find({
      relations: { category: true },
    });
    const productsResponse: ProductResponse[] = [];
    for (const product of products) {
      productsResponse.push(this.toResponse(product));
    }

    return productsResponse;
  }

  async create(dto: CreateProductDto): Promise<ProductResponse> {
    const category = await this.categoriesRepository.findOneBy({
      id: dto.categoryId,
    });

    if (!category) throw new CategoryNotFound();

    const product = this.productsRepository.create({
      ...dto,
      id: `${category.id}${category.lastProductNumber}`,
      category,
    });

    category.lastProductNumber++;
    this.categoriesRepository.save(category);
    const savedProduct = await this.productsRepository.save(product);

    return this.toResponse(savedProduct);
  }

  async update(dto: UpdateProductMessage): Promise<ProductResponse> {
    const product = await this.productsRepository.findOne({
      where: {
        id: dto.productId,
      },
      relations: {
        category: true,
      },
    });

    if (!product) throw new ProductNotFound();
    this.productsRepository.merge(product, dto.data);
    return this.toResponse(await this.productsRepository.save(product));
  }

  async delete(id: string): Promise<void> {
    const result = await this.productsRepository.delete(id);
    if (result.affected === 0) throw new ProductNotFound();
  }

  private toResponse(product: Product): ProductResponse {
    return {
      id: product.id,
      name: product.name,
      category: product.category.name,
      price: product.price,
      discount: product.discount,
      unidadVenta: product.unidadVenta,
      img: product.img,
      stock: product.stock,
      description: product.description,
    };
  }
}
