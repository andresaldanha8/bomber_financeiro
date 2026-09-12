import { Router } from 'express';

import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { normalizarDataCivil } from '../domain/financeDates';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/students/:id/mensalidades
 * Lista histórico de mensalidades de um aluno
 */
router.get('/students/:id/mensalidades', async (req: AuthenticatedRequest, res) => {
  try {
    const studentId = req.params.id;

    const mensalidades = await prisma.mensalidade.findMany({
      where: { studentId },
      orderBy: [
        { competencia: 'desc' },
        { id: 'asc' },
      ],
      select: {
        id: true,
        studentId: true,
        competencia: true,
        valor: true,
        dataVencimento: true,
        isPagamentoInicial: true,
        diaBaseNaGeracao: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({ mensalidades });
  } catch (error) {
    console.error('Erro ao listar mensalidades do aluno:', error);
    return res.status(500).json({ message: 'Erro interno ao listar mensalidades.' });
  }
});

/**
 * GET /api/mensalidades/:id
 * Obter uma mensalidade específica
 */
router.get('/mensalidades/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id;

    const m = await prisma.mensalidade.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        competencia: true,
        valor: true,
        dataVencimento: true,
        isPagamentoInicial: true,
        diaBaseNaGeracao: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!m) {
      return res.status(404).json({ message: 'Mensalidade não encontrada.' });
    }

    return res.status(200).json({ mensalidade: m });
  } catch (error) {
    console.error('Erro ao obter mensalidade:', error);
    return res.status(500).json({ message: 'Erro interno ao obter mensalidade.' });
  }
});

/**
 * GET /api/mensalidades
 * Consulta geral com filtros simples: studentId, status, competencia
 */
router.get('/mensalidades', async (req: AuthenticatedRequest, res) => {
  try {
    const { studentId, status, competencia } = req.query;

    const where: any = {};

    if (studentId && typeof studentId === 'string') where.studentId = studentId;
    if (status && typeof status === 'string') where.status = status;
    if (competencia && typeof competencia === 'string') {
      // aceitar YYYY-MM ou YYYY-MM-DD; converter para primeiro dia do mês
      const comp = competencia.length === 7 ? `${competencia}-01` : competencia;
      try {
        where.competencia = normalizarDataCivil(comp);
      } catch (_) {
        return res.status(400).json({ message: 'Competência inválida. Use YYYY-MM ou YYYY-MM-DD.' });
      }
    }

    const mensalidades = await prisma.mensalidade.findMany({
      where,
      orderBy: [
        { competencia: 'desc' },
        { id: 'asc' },
      ],
      select: {
        id: true,
        studentId: true,
        competencia: true,
        valor: true,
        dataVencimento: true,
        isPagamentoInicial: true,
        diaBaseNaGeracao: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({ mensalidades });
  } catch (error) {
    console.error('Erro ao consultar mensalidades:', error);
    return res.status(500).json({ message: 'Erro interno ao consultar mensalidades.' });
  }
});

export default router;
