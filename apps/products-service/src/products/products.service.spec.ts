import { formatProductId, ProductsService } from './products.service';
import type { Product } from './entities/product.entity';
import type { Category } from '../categories/entities/category.entity';
import type { Storage } from '@app/storage';

const frutas: Category = {
  id: 'FR',
  name: 'Frutas frescas',
  lastProductNumber: 1,
};

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'FR001',
    name: 'Manzanas',
    category: frutas,
    price: 1200,
    discount: 20,
    unidadVenta: 'por kilo',
    img: 'products/manzanas.webp',
    stock: 10,
    description: 'Manzanas',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  };
}

function setup(initial: Product[] = [product()]) {
  let stored = initial;

  const productsRepository = {
    find: vi.fn(async () => stored),
    findOne: vi.fn(
      async ({ where }: { where: { id: string } }) =>
        stored.find(({ id }) => id === where.id) ?? null,
    ),
    findOneBy: vi.fn(
      async ({ id }: { id: string }) => stored.find((p) => p.id === id) ?? null,
    ),
    existsBy: vi.fn(async ({ img }: { img: string }) =>
      stored.some((p) => p.img === img),
    ),
    merge: vi.fn((target: Product, data: Partial<Product>) =>
      Object.assign(target, data),
    ),
    save: vi.fn(async (p: Product) => p),
    delete: vi.fn(async (id: string) => {
      stored = stored.filter((p) => p.id !== id);
      return { affected: 1 };
    }),
  };
  const categoriesRepository = { findOneBy: vi.fn(), find: vi.fn() };
  const storage: Storage = {
    put: vi.fn(),
    delete: vi.fn(async () => {}),
    publicUrl: (key) => `https://cdn.test/${key}`,
  };

  const service = new ProductsService(
    productsRepository as never,
    categoriesRepository as never,
    {} as never,
    storage,
  );

  return { service, productsRepository, storage };
}

describe('formatProductId', () => {
  it('usa el prefijo de la categoría y 3 dígitos', () => {
    expect(formatProductId('FR', 1)).toBe('FR001');
    expect(formatProductId('PL', 42)).toBe('PL042');
    expect(formatProductId('VR', 1234)).toBe('VR1234');
  });
});

describe('ProductsService', () => {
  it('devuelve la URL pública de la imagen y las fechas en ISO', async () => {
    const { service } = setup();

    await expect(service.findOne('FR001')).resolves.toMatchObject({
      img: 'https://cdn.test/products/manzanas.webp',
      categoryId: 'FR',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  it('entrega solo id y updatedAt para validar la caché del cliente', async () => {
    const { service } = setup();

    await expect(service.findVersions()).resolves.toEqual([
      { id: 'FR001', updatedAt: '2026-01-02T00:00:00.000Z' },
    ]);
  });

  it('descuento 0 quita el descuento', async () => {
    const { service, productsRepository } = setup();

    await service.update({ productId: 'FR001', data: { discount: 0 } });

    expect(productsRepository.save.mock.calls[0][0].discount).toBeNull();
  });

  it('al cambiar la imagen borra la anterior del almacenamiento', async () => {
    const { service, storage } = setup();

    await service.update({
      productId: 'FR001',
      data: { img: 'products/nueva.webp' },
    });

    expect(storage.delete).toHaveBeenCalledWith('products/manzanas.webp');
  });

  it('no borra imágenes externas (URLs completas)', async () => {
    const { service, storage } = setup([
      product({ img: 'https://otro-sitio.cl/foto.jpg' }),
    ]);

    await service.delete('FR001');

    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('al eliminar el producto borra su imagen', async () => {
    const { service, storage } = setup();

    await service.delete('FR001');

    expect(storage.delete).toHaveBeenCalledWith('products/manzanas.webp');
  });

  it('responde 404 al eliminar un producto inexistente', async () => {
    const { service } = setup([]);

    await expect(service.delete('XX999')).rejects.toMatchObject({
      error: { statusCode: 404 },
    });
  });
});
