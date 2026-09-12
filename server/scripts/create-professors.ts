import 'dotenv/config';

import { prisma } from '../lib/prisma';
import { hashPassword } from '../services/auth.service';

type ProfessorSeed = {
  id: string;
  name: string;
  username: string;
  passwordEnv: string;
  avatar: string;
  chavePix: string;
};

const PROFESSORS: ProfessorSeed[] = [
  {
    id: 'usr-prof-2',
    name: 'Prof. Kawan Duarte',
    username: 'Kawan',
    passwordEnv: 'KAWAN_PASSWORD',
    avatar: 'KD',
    chavePix: 'kawan.silva@pix.com.br',
  },
  {
    id: 'usr-prof-3',
    name: 'Prof. Ryan Duarte',
    username: 'Ryan',
    passwordEnv: 'RYAN_PASSWORD',
    avatar: 'RD',
    chavePix: 'ryan.medeiros@pix.com.br',
  },
];

async function main() {
  for (const professor of PROFESSORS) {
    const password = process.env[professor.passwordEnv];

    if (!password) {
      throw new Error(
        `Variável ${professor.passwordEnv} não configurada no .env.`,
      );
    }

    const existingById = await prisma.user.findUnique({
      where: {
        id: professor.id,
      },
    });

    if (existingById) {
      console.log(
        `${professor.name}: já existe com o ID ${professor.id}. Nenhuma criação necessária.`,
      );
      continue;
    }

    const existingByUsername = await prisma.user.findFirst({
      where: {
        username: {
          equals: professor.username,
          mode: 'insensitive',
        },
      },
    });

    if (existingByUsername) {
      throw new Error(
        `O usuário "${professor.username}" já existe com outro ID (${existingByUsername.id}).`,
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.create({
      data: {
        id: professor.id,
        name: professor.name,
        username: professor.username,
        passwordHash,
        role: 'PROFESSOR',
        active: true,
        avatar: professor.avatar,
        chavePix: professor.chavePix,
      },
    });

    console.log(
      `${professor.name}: criado com sucesso usando o ID ${professor.id}.`,
    );
  }
}

main()
  .catch((error) => {
    console.error('Erro ao criar professores:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });