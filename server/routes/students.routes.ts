import { Router } from 'express';

import { prisma } from '../lib/prisma';

import {
  AuthenticatedRequest,
  requireAuth,
} from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

const ENTRY_CONDITIONS = ['INDIVIDUAL', 'DUPLA', 'TRIO_MAIS'] as const;
const STUDENT_STATUS = ['ATIVO', 'INATIVO'] as const;

function parseOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

function parseEntryDate(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const date = new Date(`${normalized}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const [year, month, day] = normalized.split('-').map(Number);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

const studentSelect = {
  id: true,
  name: true,
  phone: true,
  notes: true,
  entryCondition: true,
  dueDay: true,
  entryDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
    },
  },
} as const;

/**
 * Lista todos os alunos da academia.
 * ADMIN e PROFESSOR possuem acesso.
 */
router.get('/', async (_req, res) => {
  try {
    const students = await prisma.student.findMany({
      orderBy: {
        name: 'asc',
      },
      select: studentSelect,
    });

    return res.status(200).json({
      students,
    });
  } catch (error) {
    console.error('Erro ao listar alunos:', error);

    return res.status(500).json({
      message: 'Erro interno ao listar alunos.',
    });
  }
});

/**
 * Cadastra aluno.
 * ADMIN e PROFESSOR possuem acesso.
 *
 * O autor do cadastro vem obrigatoriamente da sessão autenticada.
 */
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.authUser) {
      return res.status(401).json({
        message: 'Não autenticado.',
      });
    }

    const name =
      typeof req.body?.name === 'string'
        ? req.body.name.trim()
        : '';

    const phone = parseOptionalString(req.body?.phone);
    const notes = parseOptionalString(req.body?.notes);

    const entryCondition = req.body?.entryCondition;
    const dueDay = req.body?.dueDay;
    const entryDate = parseEntryDate(req.body?.entryDate);

    if (!name) {
      return res.status(400).json({
        message: 'Nome do aluno é obrigatório.',
      });
    }

    if (
      !ENTRY_CONDITIONS.includes(
        entryCondition as (typeof ENTRY_CONDITIONS)[number],
      )
    ) {
      return res.status(400).json({
        message: 'Condição de entrada inválida.',
      });
    }

    if (
      !Number.isInteger(dueDay) ||
      dueDay < 1 ||
      dueDay > 31
    ) {
      return res.status(400).json({
        message: 'O dia de vencimento deve estar entre 1 e 31.',
      });
    }

    if (!entryDate) {
      return res.status(400).json({
        message: 'Data de entrada inválida.',
      });
    }

    const student = await prisma.student.create({
      data: {
        name,
        phone,
        notes,
        entryCondition,
        dueDay,
        entryDate,
        status: 'ATIVO',
        createdById: req.authUser.id,
      },
      select: studentSelect,
    });

    return res.status(201).json({
      student,
    });
  } catch (error) {
    console.error('Erro ao cadastrar aluno:', error);

    return res.status(500).json({
      message: 'Erro interno ao cadastrar aluno.',
    });
  }
});

/**
 * Atualiza aluno.
 *
 * PROFESSOR:
 * - nome
 * - telefone
 * - observações
 *
 * ADMIN:
 * - todos os campos acima
 * - condição de entrada
 * - dia-base de vencimento
 * - data de entrada
 * - status
 */
router.patch('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.authUser) {
      return res.status(401).json({
        message: 'Não autenticado.',
      });
    }

    const studentId = req.params.id;

    const existingStudent = await prisma.student.findUnique({
      where: {
        id: studentId,
      },
    });

    if (!existingStudent) {
      return res.status(404).json({
        message: 'Aluno não encontrado.',
      });
    }

    const isAdmin = req.authUser.role === 'ADMIN';

    const forbiddenProfessorFields = [
      'entryCondition',
      'dueDay',
      'entryDate',
      'status',
    ];

    if (
      !isAdmin &&
      forbiddenProfessorFields.some((field) =>
        Object.prototype.hasOwnProperty.call(req.body ?? {}, field),
      )
    ) {
      return res.status(403).json({
        message:
          'Professor não possui permissão para alterar dados administrativos do aluno.',
      });
    }

    const data: {
      name?: string;
      phone?: string | null;
      notes?: string | null;
      entryCondition?: 'INDIVIDUAL' | 'DUPLA' | 'TRIO_MAIS';
      dueDay?: number;
      entryDate?: Date;
      status?: 'ATIVO' | 'INATIVO';
    } = {};

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'name')) {
      const name =
        typeof req.body.name === 'string'
          ? req.body.name.trim()
          : '';

      if (!name) {
        return res.status(400).json({
          message: 'Nome do aluno é obrigatório.',
        });
      }

      data.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'phone')) {
      data.phone = parseOptionalString(req.body.phone);
    }

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'notes')) {
      data.notes = parseOptionalString(req.body.notes);
    }

    if (
      isAdmin &&
      Object.prototype.hasOwnProperty.call(req.body ?? {}, 'entryCondition')
    ) {
      const entryCondition = req.body.entryCondition;

      if (
        !ENTRY_CONDITIONS.includes(
          entryCondition as (typeof ENTRY_CONDITIONS)[number],
        )
      ) {
        return res.status(400).json({
          message: 'Condição de entrada inválida.',
        });
      }

      data.entryCondition = entryCondition;
    }

    if (
      isAdmin &&
      Object.prototype.hasOwnProperty.call(req.body ?? {}, 'dueDay')
    ) {
      const dueDay = req.body.dueDay;

      if (
        !Number.isInteger(dueDay) ||
        dueDay < 1 ||
        dueDay > 31
      ) {
        return res.status(400).json({
          message: 'O dia de vencimento deve estar entre 1 e 31.',
        });
      }

      data.dueDay = dueDay;
    }

    if (
      isAdmin &&
      Object.prototype.hasOwnProperty.call(req.body ?? {}, 'entryDate')
    ) {
      const entryDate = parseEntryDate(req.body.entryDate);

      if (!entryDate) {
        return res.status(400).json({
          message: 'Data de entrada inválida.',
        });
      }

      data.entryDate = entryDate;
    }

    if (
      isAdmin &&
      Object.prototype.hasOwnProperty.call(req.body ?? {}, 'status')
    ) {
      const status = req.body.status;

      if (
        !STUDENT_STATUS.includes(
          status as (typeof STUDENT_STATUS)[number],
        )
      ) {
        return res.status(400).json({
          message: 'Status do aluno inválido.',
        });
      }

      data.status = status;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: 'Nenhuma alteração válida foi informada.',
      });
    }

    const student = await prisma.student.update({
      where: {
        id: studentId,
      },
      data,
      select: studentSelect,
    });

    return res.status(200).json({
      student,
    });
  } catch (error) {
    console.error('Erro ao atualizar aluno:', error);

    return res.status(500).json({
      message: 'Erro interno ao atualizar aluno.',
    });
  }
});

export default router;