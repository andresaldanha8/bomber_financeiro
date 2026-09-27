import { Router } from 'express';

import { prisma } from '../lib/prisma.js';
import {
  AuthenticatedRequest,
  requireAuth,
  requireAdmin,
} from '../middleware/auth.middleware.js';
import {
  registrarPagamentoProfessor,
  registrarPagamentoAdminDireto,
  confirmarPagamentoPorAdmin,
} from '../services/pagamentos.service.js';
import { normalizarDataCivil } from '../domain/financeDates.js';

const router = Router();

router.use(requireAuth);

const ALLOWED_FORMA = ['PIX', 'DINHEIRO'] as const;
const ALLOWED_STATUS_FILTER = ['AGUARDANDO', 'CONFIRMADO'] as const;

function isPlainObject(v: any) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

/** POST /api/mensalidades/:mensalidadeId/pagamentos */
router.post('/mensalidades/:mensalidadeId/pagamentos', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.authUser) return res.status(401).json({ message: 'Não autenticado.' });

    if (!isPlainObject(req.body)) return res.status(400).json({ message: 'Body inválido.' });

    // Reject forbidden fields
    const forbidden = ['valor', 'registradoPorId', 'confirmadoPorId', 'statusConfirmacao'];
    for (const f of forbidden) {
      if (Object.prototype.hasOwnProperty.call(req.body, f)) {
        return res.status(400).json({ message: `Campo proibido no body: ${f}` });
      }
    }

    const { formaPagamento, dataPagamento, observacao } = req.body as any;

    if (!formaPagamento || !ALLOWED_FORMA.includes(formaPagamento)) {
      return res.status(400).json({ message: 'Forma de pagamento inválida.' });
    }

    if (!dataPagamento || typeof dataPagamento !== 'string') {
      return res.status(400).json({ message: 'dataPagamento é obrigatório e deve ser YYYY-MM-DD.' });
    }

    let normalizedDate: string;
    try {
      const d = normalizarDataCivil(dataPagamento);
      normalizedDate = d.toISOString().slice(0, 10);
    } catch (e) {
      return res.status(400).json({ message: 'dataPagamento inválida. Use YYYY-MM-DD.' });
    }

    if (observacao !== undefined && typeof observacao !== 'string') {
      return res.status(400).json({ message: 'observacao deve ser texto.' });
    }

    if (typeof observacao === 'string' && observacao.trim().length > 500) {
      return res.status(400).json({ message: 'observacao muito longa (max 500).' });
    }

    const mensalidadeId = req.params.mensalidadeId;

    const isAdmin = req.authUser.role === 'ADMIN';

    let paymentId: string | null = null;

    try {
      if (isAdmin) {
        const resCreate: any = await registrarPagamentoAdminDireto(mensalidadeId, formaPagamento, normalizedDate, req.authUser.id);
        paymentId = resCreate.id ?? null;
      } else {
        const resCreate: any = await registrarPagamentoProfessor(mensalidadeId, formaPagamento, normalizedDate, req.authUser.id);
        paymentId = resCreate.id ?? null;
      }
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg === 'Mensalidade não encontrada.' || msg === 'Pagamento não encontrado.') return res.status(404).json({ message: msg });
      if (msg === 'Mensalidade já quitada.' || msg.includes('Já existe pagamento')) return res.status(409).json({ message: msg });
      console.error('Erro ao registrar pagamento:', e);
      return res.status(500).json({ message: 'Erro interno ao registrar pagamento.' });
    }

    if (!paymentId) {
      return res.status(500).json({ message: 'Erro interno: id do pagamento não retornado.' });
    }

    // buscar pagamento e mensalidade atualizados
    const pagamento = await prisma.pagamentoAluno.findUnique({ where: { id: paymentId } });
    const mensalidade = await prisma.mensalidade.findUnique({ where: { id: mensalidadeId } });

    // tentar encontrar próxima mensalidade gerada (mesma studentId e competencia maior que atual)
    let proxima = null;
    if (mensalidade) {
      const next = await prisma.mensalidade.findFirst({
        where: { studentId: mensalidade.studentId, competencia: { gt: mensalidade.competencia } },
        orderBy: { competencia: 'asc' },
      });
      if (next) proxima = next;
    }

    return res.status(201).json({ pagamento, mensalidade, proximaMensalidade: proxima ?? null });
  } catch (error) {
    console.error('Erro na rota de registro de pagamento:', error);
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

/** POST /api/pagamentos/:pagamentoId/confirmar */
router.post('/pagamentos/:pagamentoId/confirmar', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.authUser) return res.status(401).json({ message: 'Não autenticado.' });

    const pagamentoId = req.params.pagamentoId;

    try {
      const result = await confirmarPagamentoPorAdmin(pagamentoId, req.authUser.id);
      if ((result as any)?.ok) {
        // buscar estados
        const pagamento = await prisma.pagamentoAluno.findUnique({ where: { id: pagamentoId } });
        const mensalidade = pagamento ? await prisma.mensalidade.findUnique({ where: { id: pagamento.mensalidadeId } }) : null;
        let proxima = null;
        if (mensalidade) {
          const next = await prisma.mensalidade.findFirst({ where: { studentId: mensalidade.studentId, competencia: { gt: mensalidade.competencia } }, orderBy: { competencia: 'asc' } });
          if (next) proxima = next;
        }
        return res.status(200).json({ pagamento, mensalidade, proximaMensalidade: proxima ?? null, message: (result as any).message ?? undefined });
      }
      return res.status(500).json({ message: 'Erro interno ao confirmar pagamento.' });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg === 'Pagamento não encontrado.' || msg === 'Mensalidade não encontrada.') return res.status(404).json({ message: msg });
      if (msg === 'Mensalidade já quitada.' || msg.includes('Já existe pagamento')) return res.status(409).json({ message: msg });
      console.error('Erro ao confirmar pagamento:', e);
      return res.status(500).json({ message: 'Erro interno ao confirmar pagamento.' });
    }
  } catch (error) {
    console.error('Erro na rota de confirmar pagamento:', error);
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

/** GET /api/pagamentos/:id */
router.get('/pagamentos/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id;
    const p = await prisma.pagamentoAluno.findUnique({ where: { id } });
    if (!p) return res.status(404).json({ message: 'Pagamento não encontrado.' });
    return res.status(200).json({ pagamento: p });
  } catch (error) {
    console.error('Erro ao obter pagamento:', error);
    return res.status(500).json({ message: 'Erro interno ao obter pagamento.' });
  }
});

/** GET /api/pagamentos */
router.get('/pagamentos', async (req: AuthenticatedRequest, res) => {
  try {
    const { mensalidadeId, statusConfirmacao, formaPagamento } = req.query;
    const where: any = {};
    if (mensalidadeId && typeof mensalidadeId === 'string') where.mensalidadeId = mensalidadeId;
    if (statusConfirmacao && typeof statusConfirmacao === 'string') {
      if (!ALLOWED_STATUS_FILTER.includes(statusConfirmacao as any)) return res.status(400).json({ message: 'statusConfirmacao inválido.' });
      where.statusConfirmacao = statusConfirmacao as any;
    }
    if (formaPagamento && typeof formaPagamento === 'string') {
      if (!ALLOWED_FORMA.includes(formaPagamento as any)) return res.status(400).json({ message: 'formaPagamento inválida.' });
      where.formaPagamento = formaPagamento;
    }

    const pagamentos = await prisma.pagamentoAluno.findMany({ where, orderBy: { createdAt: 'desc' } });
    return res.status(200).json({ pagamentos });
  } catch (error) {
    console.error('Erro ao listar pagamentos:', error);
    return res.status(500).json({ message: 'Erro interno ao listar pagamentos.' });
  }
});

/** GET /api/mensalidades/:mensalidadeId/pagamentos */
router.get('/mensalidades/:mensalidadeId/pagamentos', async (req: AuthenticatedRequest, res) => {
  try {
    const mensalidadeId = req.params.mensalidadeId;
    const pagamentos = await prisma.pagamentoAluno.findMany({ where: { mensalidadeId }, orderBy: { createdAt: 'asc' } });
    return res.status(200).json({ pagamentos });
  } catch (error) {
    console.error('Erro ao listar pagamentos da mensalidade:', error);
    return res.status(500).json({ message: 'Erro interno ao listar pagamentos.' });
  }
});

export default router;
