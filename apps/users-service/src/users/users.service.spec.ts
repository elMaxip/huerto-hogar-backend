import bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import type { User } from './entities/user.entity';
import type { Role } from '../roles/entities/role.entity';

const roles: Record<string, Role> = {
  ADMIN: { id: 1, role: 'ADMIN' },
  CLIENT: { id: 2, role: 'CLIENT' },
};

function user(overrides: Partial<User> = {}): User {
  return {
    id: 2,
    fullname: 'Cliente',
    email: 'cliente@correo.cl',
    password: 'hash',
    refreshTokenHash: 'refresh-hash',
    role: roles.CLIENT,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function setup(stored: User[] = [user()]) {
  const usersRepository = {
    findOne: vi.fn(
      async ({ where }: { where: Partial<User> }) =>
        stored.find((u) => u.id === where.id || u.email === where.email) ??
        null,
    ),
    existsBy: vi.fn(async ({ email }: { email: string }) =>
      stored.some((u) => u.email === email),
    ),
    save: vi.fn(async (u: User) => u),
    create: vi.fn((data: Partial<User>) => ({
      id: 99,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    })),
    delete: vi.fn(async () => ({ affected: 1 })),
  };
  const rolesRepository = {
    findOneBy: vi.fn(async ({ role }: { role: string }) => roles[role] ?? null),
  };

  const service = new UsersService(
    usersRepository as never,
    rolesRepository as never,
  );

  return { service, usersRepository };
}

describe('UsersService (gestión de usuarios)', () => {
  it('crea usuarios con la contraseña hasheada y el rol pedido', async () => {
    const { service, usersRepository } = setup();

    const created = await service.createByAdmin({
      fullname: 'Vendedora',
      email: 'vendedora@correo.cl',
      password: 'clave-segura',
      role: 'ADMIN',
    });

    expect(created).toMatchObject({
      email: 'vendedora@correo.cl',
      role: 'ADMIN',
    });
    const saved = usersRepository.save.mock.calls[0][0];
    expect(saved.password).not.toBe('clave-segura');
    expect(await bcrypt.compare('clave-segura', saved.password)).toBe(true);
  });

  it('no permite crear dos usuarios con el mismo correo', async () => {
    const { service } = setup();

    await expect(
      service.createByAdmin({
        fullname: 'Otro',
        email: 'cliente@correo.cl',
        password: 'clave-segura',
        role: 'CLIENT',
      }),
    ).rejects.toMatchObject({ error: { statusCode: 409 } });
  });

  it('no deja que un administrador se quite su propio rol', async () => {
    const admin = user({ id: 1, role: roles.ADMIN });
    const { service } = setup([admin]);

    await expect(
      service.update({ id: 1, actorId: 1, data: { role: 'CLIENT' } }),
    ).rejects.toMatchObject({ error: { statusCode: 403 } });
  });

  it('no deja que un administrador se elimine a sí mismo', async () => {
    const { service, usersRepository } = setup();

    await expect(service.delete({ id: 1, actorId: 1 })).rejects.toMatchObject({
      error: { statusCode: 403 },
    });
    expect(usersRepository.delete).not.toHaveBeenCalled();
  });

  it('al cambiar el rol de otro usuario revoca su refresh token', async () => {
    const { service, usersRepository } = setup();

    const updated = await service.update({
      id: 2,
      actorId: 1,
      data: { role: 'ADMIN' },
    });

    expect(updated.role).toBe('ADMIN');
    expect(usersRepository.save.mock.calls[0][0].refreshTokenHash).toBeNull();
  });

  it('cambiar solo el nombre no cierra la sesión', async () => {
    const { service, usersRepository } = setup();

    await service.update({ id: 2, actorId: 1, data: { fullname: 'Nuevo' } });

    expect(usersRepository.save.mock.calls[0][0]).toMatchObject({
      fullname: 'Nuevo',
      refreshTokenHash: 'refresh-hash',
    });
  });

  it('responde 404 al eliminar un usuario inexistente', async () => {
    const { service, usersRepository } = setup();
    usersRepository.delete.mockResolvedValueOnce({ affected: 0 });

    await expect(service.delete({ id: 50, actorId: 1 })).rejects.toMatchObject({
      error: { statusCode: 404 },
    });
  });
});
