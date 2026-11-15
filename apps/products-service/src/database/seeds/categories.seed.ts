import { Category } from '../../categories/entities/category.entity.js';
import { AppDataSource } from '../data-source.js';

const CATEGORIES = [
  {
    id: 'FR',
    name: 'Frutas frescas',
  },
  {
    id: 'VR',
    name: 'Verdura orgánica',
  },
  {
    id: 'PO',
    name: 'Producto orgánico',
  },
  {
    id: 'PL',
    name: 'Producto lácteo',
  },
];

async function categorySeed() {
  await AppDataSource.initialize();

  try {
    const categoryRepository = AppDataSource.getRepository(Category);

    for (const category of CATEGORIES) {
      const exists = await categoryRepository.findOneBy({ id: category.id });

      if (!exists) {
        await categoryRepository.save(
          categoryRepository.create({ id: category.id, name: category.name }),
        );
        console.log(`Categoría creada ${category.name}: ${category.id}`);
      }
    }
  } finally {
    await AppDataSource.destroy();
  }
}

categorySeed().catch((error) => {
  console.error('Error ejecutando el seed de roles:', error);
  process.exit(1);
});
