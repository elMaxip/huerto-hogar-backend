import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Product } from './entities/product.entity.js';
import { Category } from '../categories/entities/category.entity.js';
import {
  CategoryResponse,
  CreateProductDto,
  FindProductsDto,
  ProductResponse,
  ProductVersionResponse,
  UpdateProductMessage,
} from '@app/contracts/products';
import { isStorageKey, STORAGE, type Storage } from '@app/storage';
import { CategoryNotFound } from '../exceptions/category-not-found.js';
import { ProductNotFound } from '../exceptions/product-not-found.js';

export function formatProductId(categoryId: string, number: number): string {
  return `${categoryId}${String(number).padStart(3, '0')}`;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,

    private readonly dataSource: DataSource,

    @Inject(STORAGE) private readonly storage: Storage,
  ) {}

  async findAll(dto: FindProductsDto = {}): Promise<ProductResponse[]> {
    const products = await this.productsRepository.find({
      where: dto.ids ? { id: In(dto.ids) } : {},
      relations: { category: true },
      order: { id: 'ASC' },
    });

    return products.map((product) => this.toResponse(product));
  }

  async findOne(id: string): Promise<ProductResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async findVersions(): Promise<ProductVersionResponse[]> {
    const products = await this.productsRepository.find({
      select: { id: true, updatedAt: true },
      order: { id: 'ASC' },
    });

    return products.map(({ id, updatedAt }) => ({
      id,
      updatedAt: updatedAt.toISOString(),
    }));
  }

  async findCategories(): Promise<CategoryResponse[]> {
    const categories = await this.categoriesRepository.find({
      order: { name: 'ASC' },
    });

    return categories.map(({ id, name }) => ({ id, name }));
  }

  async create(dto: CreateProductDto): Promise<ProductResponse> {
    const { categoryId, discount, ...fields } = dto;

    const id = await this.dataSource.transaction(async (manager) => {
      const category = await manager.findOne(Category, {
        where: { id: categoryId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!category) throw new CategoryNotFound();

      let productId: string;
      do {
        category.lastProductNumber++;
        productId = formatProductId(category.id, category.lastProductNumber);
      } while (await manager.existsBy(Product, { id: productId }));

      await manager.save(category);
      await manager.save(
        manager.create(Product, {
          ...fields,
          discount: discount || null,
          id: productId,
          category,
        }),
      );

      return productId;
    });

    return this.findOne(id);
  }

  async update({
    productId,
    data,
  }: UpdateProductMessage): Promise<ProductResponse> {
    const product = await this.findEntity(productId);
    const previousImg = product.img;
    const { categoryId, discount, ...fields } = data;

    if (categoryId !== undefined && categoryId !== product.category.id) {
      const category = await this.categoriesRepository.findOneBy({
        id: categoryId,
      });

      if (!category) throw new CategoryNotFound();
      product.category = category;
    }

    if (discount !== undefined) product.discount = discount || null;

    this.productsRepository.merge(product, fields);
    await this.productsRepository.save(product);

    if (previousImg !== product.img) await this.deleteImage(previousImg);

    return this.findOne(productId);
  }

  async delete(id: string): Promise<void> {
    const product = await this.productsRepository.findOneBy({ id });

    if (!product) throw new ProductNotFound();

    await this.productsRepository.delete(id);
    await this.deleteImage(product.img);
  }

  private async deleteImage(img: string): Promise<void> {
    if (!isStorageKey(img)) return;

    if (await this.productsRepository.existsBy({ img })) return;

    try {
      await this.storage.delete(img);
    } catch (error) {
      this.logger.warn(`No se pudo eliminar la imagen ${img}: ${String(error)}`);
    }
  }

  private async findEntity(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: { category: true },
    });

    if (!product) throw new ProductNotFound();

    return product;
  }

  private toResponse(product: Product): ProductResponse {
    return {
      id: product.id,
      name: product.name,
      category: product.category.name,
      categoryId: product.category.id,
      price: product.price,
      discount: product.discount ?? undefined,
      unidadVenta: product.unidadVenta,
      img: this.storage.publicUrl(product.img),
      stock: product.stock,
      description: product.description,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }
}
