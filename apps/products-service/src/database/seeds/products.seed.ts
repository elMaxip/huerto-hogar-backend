import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Category } from '../../categories/entities/category.entity.js';
import { Product } from '../../products/entities/product.entity.js';
import { AppDataSource } from '../data-source.js';
import {
  createStorage,
  storageConfigFromEnv,
} from '../../../../../libs/storage/src/storage.js';

const PRODUCTS = [
  {
    id: 'FR001',
    name: 'Manzanas Fuji',
    categoryId: 'FR',
    price: 1200,
    discount: 20,
    unidadVenta: 'por kilo',
    img: 'manzanas-fuji.webp',
    stock: 150,
    description:
      'Manzanas Fuji crujientes y dulces, cultivadas en el Valle del Maule. Perfectas para meriendas saludables o como ingrediente en postres. Estas manzanas son conocidas por su textura firme y su sabor equilibrado entre dulce y ácido.',
  },
  {
    id: 'FR002',
    name: 'Naranjas Valencia',
    categoryId: 'FR',
    price: 1000,
    unidadVenta: 'por kilo',
    img: 'naranjas-valencia.webp',
    stock: 200,
    description:
      'Jugosas y ricas en vitamina C, estas naranjas Valencia son ideales para zumos frescos y refrescantes. Cultivadas en condiciones climáticas óptimas que aseguran su dulzura y jugosidad.',
  },
  {
    id: 'FR003',
    name: 'Plátanos Cavendish',
    categoryId: 'FR',
    price: 800,
    unidadVenta: 'por kilo',
    img: 'platanos-cavendish.webp',
    stock: 250,
    description:
      'Plátanos maduros y dulces, perfectos para el desayuno o como snack energético. Estos plátanos son ricos en potasio y vitaminas, ideales para mantener una dieta equilibrada.',
  },
  {
    id: 'VR001',
    name: 'Zanahorias Orgánicas',
    categoryId: 'VR',
    price: 900,
    discount: 35,
    unidadVenta: 'por kilo',
    img: 'zanahorias-organicas.webp',
    stock: 100,
    description:
      "Zanahorias crujientes cultivadas sin pesticidas en la Región de O'Higgins. Excelente fuente de vitamina A y fibra, ideales para ensaladas, jugos o como snack saludable.",
  },
  {
    id: 'VR002',
    name: 'Espinacas Frescas',
    categoryId: 'VR',
    price: 700,
    unidadVenta: 'por bolsa de 500g',
    img: 'espinacas-frescas.webp',
    stock: 80,
    description:
      'Espinacas frescas y nutritivas, perfectas para ensaladas y batidos verdes. Estas espinacas son cultivadas bajo prácticas orgánicas que garantizan su calidad y valor nutricional.',
  },
  {
    id: 'VR003',
    name: 'Pimientos Tricolores',
    categoryId: 'VR',
    price: 1500,
    unidadVenta: 'por kilo',
    img: 'pimientos-tricolores.webp',
    stock: 120,
    description:
      'Pimientos rojos, amarillos y verdes, ideales para salteados y platos coloridos. Ricos en antioxidantes y vitaminas, estos pimientos añaden un toque vibrante y saludable a cualquier receta.',
  },
  {
    id: 'PO001',
    name: 'Miel Orgánica',
    categoryId: 'PO',
    price: 5000,
    discount: 10,
    unidadVenta: 'por frasco de 500g',
    img: 'miel-organica.webp',
    stock: 50,
    description:
      'Miel pura y orgánica producida por apicultores locales. Rica en antioxidantes y con un sabor inigualable, perfecta para endulzar de manera natural tus comidas y bebidas.',
  },
];

const IMAGES_DIR = new URL('./images/', import.meta.url);

async function productsSeed() {
  const storage = createStorage(storageConfigFromEnv(process.env));

  await AppDataSource.initialize();

  try {
    const productRepository = AppDataSource.getRepository(Product);
    const categoryRepository = AppDataSource.getRepository(Category);

    for (const { categoryId, img, discount, ...data } of PRODUCTS) {
      const category = await categoryRepository.findOneBy({ id: categoryId });

      if (!category) {
        throw new Error(
          `No existe la categoría ${categoryId}, ejecuta primero pnpm seed:categories`,
        );
      }

      const number = Number(data.id.slice(categoryId.length));
      if (category.lastProductNumber < number) {
        category.lastProductNumber = number;
        await categoryRepository.save(category);
      }

      if (await productRepository.existsBy({ id: data.id })) {
        console.log(`El producto ${data.id} ya existe, no se modificó`);
        continue;
      }

      const key = `products/${img}`;
      const file = await readFile(fileURLToPath(new URL(img, IMAGES_DIR)));
      await storage.put(key, file, 'image/webp');

      await productRepository.save(
        productRepository.create({
          ...data,
          discount: discount ?? null,
          img: key,
          category,
        }),
      );
      console.log(`Producto creado ${data.id}: ${data.name}`);
    }
  } finally {
    await AppDataSource.destroy();
  }
}

productsSeed().catch((error) => {
  console.error('Error ejecutando el seed de productos:', error);
  process.exit(1);
});
