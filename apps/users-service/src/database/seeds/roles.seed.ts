import { Role } from '../../roles/entities/role.entity.js';
import { AppDataSource } from '../data-source.js';

const roles = ['ADMIN', 'CLIENT'];

async function roleSeed() {
  await AppDataSource.initialize();

  try {
    const roleRepository = AppDataSource.getRepository(Role);

    for (const role of roles) {
      const exists = await roleRepository.findOne({
        where: { role },
      });

      if (!exists) {
        await roleRepository.save(roleRepository.create({ role }));
        console.log(`Rol creado: ${role}`);
      }
    }
  } finally {
    await AppDataSource.destroy();
  }
}

roleSeed().catch((error) => {
  console.error('Error ejecutando el seed de roles:', error);
  process.exit(1);
});
