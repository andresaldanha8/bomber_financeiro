import { Router } from 'express';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as DespesasService from '../services/despesas.service.js';
import { normalizarDataCivil } from '../domain/financeDates.js';

const router = Router();

router.use(requireAuth);

router.get('/', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { status, categoria, dataInicio, dataFim } = req.query;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;

    if (status && typeof status !== 'string') return res.status(400).json({ message: 'status inválido' });
    if (categoria && typeof categoria !== 'string') return res.status(400).json({ message: 'categoria inválida' });
    if (categoria && typeof categoria === 'string' && !DespesasService.isValidCategoria(categoria)) return res.status(400).json({ message: 'categoria inválida' });
    if (dataInicio && typeof dataInicio === 'string') {
      try { normalizarDataCivil(dataInicio); } catch { return res.status(400).json({ message: 'dataInicio inválida' }); }
    }
    if (dataFim && typeof dataFim === 'string') {
      try { normalizarDataCivil(dataFim); } catch { return res.status(400).json({ message: 'dataFim inválida' }); }
    }
    if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)) return res.status(400).json({ message: 'limit inválido' });
    if (offset !== undefined && (!Number.isSafeInteger(offset) || offset < 0)) return res.status(400).json({ message: 'offset inválido' });

    const rows = await DespesasService.listarDespesas({ status: status as any, categoria: categoria as any, dataInicio: dataInicio as any, dataFim: dataFim as any, limit, offset });
    return res.status(200).json({ despesas: rows });
  } catch (err) {
    console.error('Erro ao listar despesas:', err);
    return res.status(500).json({ message: 'Erro interno ao listar despesas.' });
  }
});

router.get('/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id;
    const d = await DespesasService.getDespesaById(id);
    if (!d) return res.status(404).json({ message: 'Despesa não encontrada.' });
    return res.status(200).json({ despesa: d });
  } catch (err) {
    console.error('Erro ao obter despesa:', err);
    return res.status(500).json({ message: 'Erro interno ao obter despesa.' });
  }
});

router.post('/', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ message: 'payload inválido' });
    const forbidden = ['status', 'criadoPorId', 'createdAt', 'dataPagamento', 'formaPagamento', 'pagoPorId', 'pagoEm'];
    for (const f of forbidden) if (Object.prototype.hasOwnProperty.call(req.body, f)) return res.status(400).json({ message: `campo proibido no body: ${f}` });

    const { descricao, categoria, valor, dataDespesa } = req.body as any;
    if (!descricao || typeof descricao !== 'string' || !descricao.trim()) return res.status(400).json({ message: 'descricao inválida' });
    if (!categoria || typeof categoria !== 'string') return res.status(400).json({ message: 'categoria inválida' });
    if (!DespesasService.isValidCategoria(categoria)) return res.status(400).json({ message: 'categoria inválida' });
    if (valor === undefined || typeof valor !== 'number') return res.status(400).json({ message: 'valor inválido' });
    try { normalizarDataCivil(dataDespesa); } catch { return res.status(400).json({ message: 'dataDespesa inválida' }); }

    try {
      const created = await DespesasService.criarDespesa({ descricao, categoria, valor, dataDespesa }, req.authUser!.id);
      return res.status(201).json({ despesa: created });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg.includes('valor') || msg.includes('categoria') || msg.includes('data')) return res.status(400).json({ message: msg });
      console.error('Erro ao criar despesa:', e);
      return res.status(500).json({ message: 'Erro interno ao criar despesa.' });
    }
  } catch (err) {
    console.error('Erro na rota de criar despesa:', err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

router.post('/:id/pagamento', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ message: 'payload inválido' });
    const { dataPagamento, formaPagamento, observacao } = req.body as any;
    if (!dataPagamento || typeof dataPagamento !== 'string') return res.status(400).json({ message: 'dataPagamento é obrigatório e deve ser YYYY-MM-DD.' });
    try { normalizarDataCivil(dataPagamento); } catch { return res.status(400).json({ message: 'dataPagamento inválida. Use YYYY-MM-DD.' }); }
    if (!formaPagamento || typeof formaPagamento !== 'string' || !formaPagamento.trim()) return res.status(400).json({ message: 'formaPagamento inválida.' });
    if (observacao !== undefined && typeof observacao !== 'string') return res.status(400).json({ message: 'observacao inválida.' });
    if (typeof observacao === 'string' && observacao.trim().length > 500) return res.status(400).json({ message: 'observacao muito longa (max 500).' });

    try {
      const result = await DespesasService.registrarPagamentoDespesa(req.params.id, dataPagamento, formaPagamento.trim(), observacao?.trim?.() ?? undefined, req.authUser!.id);
      if ((result as any).message === 'Despesa já está paga.') return res.status(200).json({ despesa: result, message: (result as any).message });
      return res.status(200).json({ despesa: result });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg === 'Despesa não encontrada.') return res.status(404).json({ message: msg });
      if (msg.includes('formaPagamento') || msg.includes('data') || msg.includes('valor')) return res.status(400).json({ message: msg });
      console.error('Erro ao registrar pagamento de despesa:', e);
      return res.status(500).json({ message: 'Erro interno ao registrar pagamento.' });
    }
  } catch (err) {
    console.error('Erro na rota de pagamento de despesa:', err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

export default router;
