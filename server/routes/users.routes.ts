import { Router } from 'express';

import { prisma } from '../lib/prisma';
import {
  AuthenticatedRequest,
  requireAdmin,
  requireAuth,
} from '../middleware/auth.middleware';
import { hashPassword } from '../services/auth.service';

const router = Router();

router.use(requireAuth, requireAdmin);

/**
 * Lista contas de PROFESSOR.
 */
router.get('/professors', async (_req, res) => {
  try {
    const professors = await prisma.user.findMany({
      where: {
        role: 'PROFESSOR',
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        active: true,
        avatar: true,
        chavePix: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      users: professors,
    });
  } catch (error) {
    console.error('Erro ao listar professores:', error);

    return res.status(500).json({
      message: 'Erro interno ao listar usuários.',
    });
  }
});

/**
 * Cria uma conta de PROFESSOR.
 */
router.post('/professors', async (req, res) => {
  try {
    const name =
      typeof req.body?.name === 'string'
        ? req.body.name.trim()
        : '';

    const username =
      typeof req.body?.username === 'string'
        ? req.body.username.trim()
        : '';

    const password =
      typeof req.body?.password === 'string'
        ? req.body.password
        : '';

    const chavePix =
      typeof req.body?.chavePix === 'string'
        ? req.body.chavePix.trim()
        : '';

    if (!name || !username || !password) {
      return res.status(400).json({
        message: 'Nome, usuário e senha são obrigatórios.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'A senha deve possuir pelo menos 6 caracteres.',
      });
    }

    const existingUsername = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
    });

    if (existingUsername) {
      return res.status(409).json({
        message: 'Este nome de usuário já está em uso.',
      });
    }

    const passwordHash = await hashPassword(password);

    const professor = await prisma.user.create({
      data: {
        name,
        username,
        passwordHash,
        role: 'PROFESSOR',
        active: true,
        chavePix: chavePix || null,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        active: true,
        avatar: true,
        chavePix: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({
      user: professor,
    });
  } catch (error) {
    console.error('Erro ao criar professor:', error);

    return res.status(500).json({
      message: 'Erro interno ao criar usuário.',
    });
  }
});

/**
 * Bloqueia ou reativa a conta de um PROFESSOR.
 */
router.patch(
  '/professors/:id/status',
  async (req: AuthenticatedRequest, res) => {
    try {
      const professorId = req.params.id;
      const active = req.body?.active;

      if (typeof active !== 'boolean') {
        return res.status(400).json({
          message: 'O status active deve ser booleano.',
        });
      }

      const professor = await prisma.user.findFirst({
        where: {
          id: professorId,
          role: 'PROFESSOR',
        },
      });

      if (!professor) {
        return res.status(404).json({
          message: 'Professor não encontrado.',
        });
      }

      const updatedProfessor = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: {
            id: professorId,
          },
          data: {
            active,
          },
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            active: true,
            avatar: true,
            chavePix: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!active) {
          await tx.session.updateMany({
            where: {
              userId: professorId,
              revokedAt: null,
            },
            data: {
              revokedAt: new Date(),
            },
          });
        }

        return updated;
      });

      return res.status(200).json({
        user: updatedProfessor,
      });
    } catch (error) {
      console.error('Erro ao atualizar status do professor:', error);

      return res.status(500).json({
        message: 'Erro interno ao atualizar usuário.',
      });
    }
  },
);

/**
 * Redefine a senha de um PROFESSOR.
 */
router.patch('/professors/:id/password', async (req, res) => {
  try {
    const professorId = req.params.id;

    const password =
      typeof req.body?.password === 'string'
        ? req.body.password
        : '';

    if (password.length < 6) {
      return res.status(400).json({
        message: 'A nova senha deve possuir pelo menos 6 caracteres.',
      });
    }

    const professor = await prisma.user.findFirst({
      where: {
        id: professorId,
        role: 'PROFESSOR',
      },
    });

    if (!professor) {
      return res.status(404).json({
        message: 'Professor não encontrado.',
      });
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: professorId,
        },
        data: {
          passwordHash,
        },
      }),

      prisma.session.updateMany({
        where: {
          userId: professorId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);

    return res.status(200).json({
      message: 'Senha redefinida com sucesso.',
    });
  } catch (error) {
    console.error('Erro ao redefinir senha do professor:', error);

    return res.status(500).json({
      message: 'Erro interno ao redefinir senha.',
    });
  }
});

export default router;