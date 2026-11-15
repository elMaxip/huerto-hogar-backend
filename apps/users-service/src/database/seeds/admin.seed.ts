import bcrypt from 'bcrypt';
import { Role } from '../../roles/entities/role.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { AppDataSource } from '../data-source.js';

const SALT_ROUNDS = 10;

function getAdminConfig() {
  const fullname = process.env.ADMIN_FULLNAME ?? 'Administrador';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Define ADMIN_EMAIL y ADMIN_PASSWORD en apps/users-service/.env',
    );
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres');
  }

  return { fullname, email, password };
}

async function adminSeed() {
  const { fullname, email, password } = getAdminConfig();

  await AppDataSource.initialize();

  try {
    const userRepository = AppDataSource.getRepository(User);
    const roleRepository = AppDataSource.getRepository(Role);

    if (await userRepository.existsBy({ email })) {
      console.log(`El usuario ${email} ya existe, no se modificó`);
      return;
    }

    const adminRole = await roleRepository.findOneBy({ role: 'ADMIN' });

    if (!adminRole) {
      throw new Error(
        'No existe el rol ADMIN, ejecuta primero pnpm seed:users',
      );
    }

    await userRepository.save(
      userRepository.create({
        fullname,
        email,
        password: await bcrypt.hash(password, SALT_ROUNDS),
        role: adminRole,
      }),
    );
    console.log(`Administrador creado: ${email}`);
  } finally {
    await AppDataSource.destroy();
  }
}

adminSeed().catch((error) => {
  console.error('Error ejecutando el seed del administrador:', error);
  process.exit(1);
});
