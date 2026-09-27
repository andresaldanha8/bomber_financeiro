import express from 'express';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as CaixaService from '../services/caixa.service.js';
import { TipoMovimentoCaixa, OrigemMovimentoCaixa } from '@prisma/client';

const router = express.Router();

function queryString(value: unknown, campo: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length === 0) throw new CaixaService.CaixaValidationError(`${campo} inválido`);
  return value;
}

function queryEnum<T extends string>(value: unknown, campo: string, values: readonly T[]): T | undefined {
  const text = queryString(value, campo);
  if (text === undefined) return undefined;
  const match = values.find((item) => item === text);
  if (match === undefined) throw new CaixaService.CaixaValidationError(`${campo} inválido`);
  return match;
}

function queryInteger(value: unknown, campo: string, min: number): number | undefined {
  const text = queryString(value, campo);
  if (text === undefined) return undefined;
  const number = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(number) || number < min || number > 2147483647) {
    throw new CaixaService.CaixaValidationError(`${campo} inválido`);
  }
  return number;
}

router.post('/saldo-inicial', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ message: 'payload inválido' });
    const forbidden = ['tipo', 'origem', 'actor', 'actorId', 'criadoPorId', 'chaveIdempotencia', 'referenciaId'];
    for (const f of forbidden) {
      if (Object.prototype.hasOwnProperty.call(req.body, f)) {
        return res.status(400).json({ message: `campo '${f}' é controlado pelo servidor` });
      }
    }

    const { valor, dataFinanceira, observacao } = req.body;
    if (typeof valor !== 'number' || Number.isNaN(valor) || valor < 0) return res.status(400).json({ message: 'valor inválido' });
    if (observacao != null && typeof observacao !== 'string') return res.status(400).json({ message: 'observacao inválida' });
    if (typeof observacao === 'string' && observacao.length > 500) return res.status(400).json({ message: 'observacao muito longa' });

    CaixaService.validarDataCaixa(dataFinanceira);

    const result = await CaixaService.definirSaldoInicial({ valor, dataFinanceira, observacao, actorId: req.authUser!.id });
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof CaixaService.CaixaValidationError) return res.status(400).json({ message: err.message });
    if (err instanceof CaixaService.SaldoInicialConflictError) return res.status(409).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});

router.get('/resumo', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const mes = queryString(req.query.mes, 'mes');
    const result = await CaixaService.resumoCaixa({ mes });
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof CaixaService.CaixaValidationError) return res.status(400).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});

router.get('/movimentos', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const dataInicio = queryString(req.query.dataInicio, 'dataInicio');
    const dataFim = queryString(req.query.dataFim, 'dataFim');
    const tipo = queryEnum(req.query.tipo, 'tipo', Object.values(TipoMovimentoCaixa));
    const origem = queryEnum(req.query.origem, 'origem', Object.values(OrigemMovimentoCaixa));
    const limit = queryInteger(req.query.limit, 'limit', 1);
    const offset = queryInteger(req.query.offset, 'offset', 0);
    if (dataInicio) CaixaService.validarDataCaixa(dataInicio);
    if (dataFim) CaixaService.validarDataCaixa(dataFim);
    if (dataInicio && dataFim) {
      const d1 = new Date(dataInicio + 'T00:00:00Z');
      const d2 = new Date(dataFim + 'T00:00:00Z');
      if (d1.getTime() > d2.getTime()) return res.status(400).json({ message: 'dataInicio maior que dataFim' });
    }

    const rows = await CaixaService.listarMovimentos({ dataInicio, dataFim, tipo, origem, limit, offset });
    return res.status(200).json(rows);
  } catch (err) {
    if (err instanceof CaixaService.CaixaValidationError) return res.status(400).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});

router.get('/movimentos/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const r = await CaixaService.getMovimentoById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Movimento não encontrado' });
    return res.status(200).json(r);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});

export default router;
