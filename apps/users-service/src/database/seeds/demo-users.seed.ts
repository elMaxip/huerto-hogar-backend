import bcrypt from 'bcrypt';
import { Role } from '../../roles/entities/role.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { AppDataSource } from '../data-source.js';

const SALT_ROUNDS = 10;

const DEMO_USERS = [
  {
    fullname: 'Administrador',
    email: 'admin@huertohogar.cl',
    password: 'admin1234',
    role: 'ADMIN',
  },
  {
    fullname: 'Cliente de Prueba',
    email: 'cliente@correo.cl',
    password: 'cliente123',
    role: 'CLIENT',
  },
];

async function demoUsersSeed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('El seed de usuarios de demostración no se ejecuta en producción');
  }

  await AppDataSource.initialize();

  try {
    const userRepository = AppDataSource.getRepository(User);
    const roleRepository = AppDataSource.getRepository(Role);

    for (const { role: roleName, password, ...data } of DEMO_USERS) {
      if (await userRepository.existsBy({ email: data.email })) {
        console.log(`El usuario ${data.email} ya existe, no se modificó`);
        continue;
      }

      const role = await roleRepository.findOneBy({ role: roleName });

      if (!role) {
        throw new Error(
          `No existe el rol ${roleName}, ejecuta primero pnpm seed:users`,
        );
      }

      await userRepository.save(
        userRepository.create({
          ...data,
          password: await bcrypt.hash(password, SALT_ROUNDS),
          role,
        }),
      );
      console.log(`Usuario creado (${roleName}): ${data.email}`);
    }
  } finally {
    await AppDataSource.destroy();
  }
}

demoUsersSeed().catch((error) => {
  console.error('Error ejecutando el seed de usuarios de demostración:', error);
  process.exit(1);
});
