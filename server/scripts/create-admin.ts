import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../services/auth.service';

async function main() {
  const name = process.env.ADMIN_NAME?.trim();
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !username || !password) {
    throw new Error(
      'ADMIN_NAME, ADMIN_USERNAME e ADMIN_PASSWORD devem estar configurados no .env.',
    );
  }

  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: 'ADMIN',
    },
  });

  if (existingAdmin) {
    console.log(
      `ADMIN já existente: ${existingAdmin.name} (${existingAdmin.username})`,
    );
    return;
  }

  const existingUsername = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (existingUsername) {
    throw new Error(`O usuário "${username}" já está em uso.`);
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.create({
    data: {
      name,
      username,
      passwordHash,
      role: 'ADMIN',
      active: true,
    },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      active: true,
    },
  });

  console.log('ADMIN criado com sucesso:');
  console.log(admin);
}

main()
  .catch((error) => {
    console.error('Erro ao criar ADMIN:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });