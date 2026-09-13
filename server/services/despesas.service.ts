import { prisma } from '../lib/prisma';
import { executarTransacaoComRetry } from './transactionRetry';
import { normalizarDataCivil } from '../domain/financeDates';
import { Prisma } from '../../src/generated/prisma/client';
import { DespesaCategoria } from '../../src/generated/prisma/enums';

// Fonte única de categorias técnicas aceitas para despesas
export const VALID_CATEGORIES: string[] = [
  'PROFESSORES',
  'ENERGIA',
  'AGUA',
  'INTERNET',
  'ALUGUEL',
  'MANUTENCAO',
  'EQUIPAMENTOS',
  'PRODUTOS_MATERIAL',
  'IMPOSTOS_TAXAS',
  'OUTROS',
];

export function isValidCategoria(c: unknown) {
  return typeof c === 'string' && VALID_CATEGORIES.includes(c);
}

// Helper local: cria um movimento de CAIXA do tipo SAIDA para a despesa dentro
// da transação `tx`. Recebe campos já persistidos/normalizados da despesa.
export async function criarSaidaDespesa(
  tx: Prisma.TransactionClient,
  despesa: { id: string; valor: Prisma.Decimal; dataDespesa: Date; dataPagamento: Date | null; categoria: string; descricao: string },
  dataFinanceira: Date,
  adminId: string,
) {
  await tx.movimentoCaixa.create({ data: {
    tipo: 'SAIDA',
    origem: 'DESPESA',
    valor: despesa.valor,
    dataFinanceira,
    referenciaId: despesa.id,
    chaveIdempotencia: `DESPESA:${despesa.id}:PAGAMENTO`,
    criadoPorId: adminId,
    descricao: `${despesa.categoria} - ${despesa.descricao}`,
    observacao: null,
  } });
}

export type DespesaCreateInput = {
  descricao: string;
  categoria: string;
  valor: number | string | Prisma.Decimal;
  dataDespesa: string; // YYYY-MM-DD
};

export async function listarDespesas(filter: {
  status?: string;
  categoria?: string;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};
  if (filter.status) where.status = filter.status;
  if (filter.categoria) {
    if (!isValidCategoria(filter.categoria)) throw new Error('categoria inválida');
    where.categoria = filter.categoria;
  }
  if (filter.dataInicio || filter.dataFim) {
    where.dataDespesa = {};
    if (filter.dataInicio) where.dataDespesa.gte = normalizarDataCivil(filter.dataInicio);
    if (filter.dataFim) where.dataDespesa.lte = normalizarDataCivil(filter.dataFim);
  }

  const rows = await prisma.despesa.findMany({
    where,
    orderBy: [{ dataDespesa: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    take: filter.limit ?? 50,
    skip: filter.offset ?? 0,
    include: { criadoPor: { select: { id: true, name: true } }, pagoPor: { select: { id: true, name: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    descricao: r.descricao,
    categoria: r.categoria,
    valor: Number(r.valor),
    dataDespesa: r.dataDespesa.toISOString().slice(0, 10),
    status: r.status,
    criadoPorId: r.criadoPorId,
    criadoPorNome: r.criadoPor?.name ?? null,
    createdAt: r.createdAt,
    dataPagamento: r.dataPagamento ? r.dataPagamento.toISOString().slice(0, 10) : null,
    formaPagamento: r.formaPagamento ?? null,
    pagoPorId: r.pagoPorId ?? null,
    pagoPorNome: r.pagoPor?.name ?? null,
    pagoEm: r.pagoEm ?? null,
    observacao: r.observacao ?? null,
  }));
}

export async function getDespesaById(id: string) {
  const r = await prisma.despesa.findUnique({ where: { id }, include: { criadoPor: { select: { id: true, name: true } }, pagoPor: { select: { id: true, name: true } } } });
  if (!r) return null;
  return {
    id: r.id,
    descricao: r.descricao,
    categoria: r.categoria,
    valor: Number(r.valor),
    dataDespesa: r.dataDespesa.toISOString().slice(0, 10),
    status: r.status,
    criadoPorId: r.criadoPorId,
    criadoPorNome: r.criadoPor?.name ?? null,
    createdAt: r.createdAt,
    dataPagamento: r.dataPagamento ? r.dataPagamento.toISOString().slice(0, 10) : null,
    formaPagamento: r.formaPagamento ?? null,
    pagoPorId: r.pagoPorId ?? null,
    pagoPorNome: r.pagoPor?.name ?? null,
    pagoEm: r.pagoEm ?? null,
    observacao: r.observacao ?? null,
  };
}

export async function criarDespesa(input: DespesaCreateInput, adminId: string) {
  // validações básicas
  if (!input || typeof input !== 'object') throw new Error('Payload inválido');
  const descricao = typeof input.descricao === 'string' ? input.descricao.trim() : '';
  if (!descricao) throw new Error('descricao inválida');
  if (!input.categoria || typeof input.categoria !== 'string') throw new Error('categoria inválida');
  if (!isValidCategoria(input.categoria)) throw new Error('categoria inválida');
  // valor
  const valor = new Prisma.Decimal(input.valor as any);
  if (!valor || !Number.isFinite(Number(valor))) throw new Error('valor inválido');
  if (valor.lessThanOrEqualTo(0)) throw new Error('valor deve ser maior que zero');
  if (valor.decimalPlaces() > 2) throw new Error('valor possui mais de 2 casas decimais');

  // dataDespesa
  const data = normalizarDataCivil(input.dataDespesa);

  const created = await prisma.despesa.create({ data: {
    descricao,
    categoria: input.categoria as DespesaCategoria,
    valor,
    dataDespesa: data,
    status: 'PENDENTE',
    criadoPorId: adminId,
  } });

  return {
    id: created.id,
    descricao: created.descricao,
    categoria: created.categoria,
    valor: Number(created.valor),
    dataDespesa: created.dataDespesa.toISOString().slice(0,10),
    status: created.status,
    criadoPorId: created.criadoPorId,
    createdAt: created.createdAt,
    dataPagamento: null,
    formaPagamento: null,
    pagoPorId: null,
    pagoEm: null,
    observacao: null,
  };
}

export async function registrarPagamentoDespesa(despesaId: string, dataPagamento: string, formaPagamento: string, observacao: string | undefined, adminId: string) {
  return executarTransacaoComRetry(prisma, async (tx) => {
    // lock despesa
    const rows: any[] = await tx.$queryRaw`
      SELECT id, status, valor, data_despesa, data_pagamento, forma_pagamento, pago_por_id, pago_em, observacao FROM despesas WHERE id = ${despesaId} FOR UPDATE
    `;
    if (rows.length === 0) throw new Error('Despesa não encontrada.');
    const d = rows[0];
    if (d.status === 'PAGA') {
      // idempotente: retornar atual
      const existing = await tx.despesa.findUnique({ where: { id: despesaId }, include: { criadoPor: { select: { id: true, name: true } }, pagoPor: { select: { id: true, name: true } } } });
      return {
        id: existing!.id,
        descricao: existing!.descricao,
        categoria: existing!.categoria,
        valor: Number(existing!.valor),
        dataDespesa: existing!.dataDespesa.toISOString().slice(0,10),
        status: existing!.status,
        criadoPorId: existing!.criadoPorId,
        criadoPorNome: existing!.criadoPor?.name ?? null,
        createdAt: existing!.createdAt,
        dataPagamento: existing!.dataPagamento ? existing!.dataPagamento.toISOString().slice(0,10) : null,
        formaPagamento: existing!.formaPagamento ?? null,
        pagoPorId: existing!.pagoPorId ?? null,
        pagoPorNome: existing!.pagoPor?.name ?? null,
        pagoEm: existing!.pagoEm ?? null,
        observacao: existing!.observacao ?? null,
        message: 'Despesa já está paga.'
      };
    }

    // validar inputs
    const dataPag = normalizarDataCivil(dataPagamento);
    if (!formaPagamento || typeof formaPagamento !== 'string' || !formaPagamento.trim()) throw new Error('formaPagamento inválida');
    if (observacao !== undefined && typeof observacao !== 'string') throw new Error('observacao inválida');

    // atualizar para PAGA
    await tx.$queryRaw`
      UPDATE despesas SET status = 'PAGA', data_pagamento = ${dataPag}, forma_pagamento = ${formaPagamento.trim()}, pago_por_id = ${adminId}, pago_em = now(), observacao = ${observacao ?? null} WHERE id = ${despesaId}
    `;

    const updated = await tx.despesa.findUnique({ where: { id: despesaId }, include: { criadoPor: { select: { id: true, name: true } }, pagoPor: { select: { id: true, name: true } } } });

    // criar MovimentoCaixa SAIDA referenciando a despesa, dentro da mesma transação
    if (updated) {
      await criarSaidaDespesa(tx, updated as any, dataPag, adminId);
    }

    return {
      id: updated!.id,
      descricao: updated!.descricao,
      categoria: updated!.categoria,
      valor: Number(updated!.valor),
      dataDespesa: updated!.dataDespesa.toISOString().slice(0,10),
      status: updated!.status,
      criadoPorId: updated!.criadoPorId,
      criadoPorNome: updated!.criadoPor?.name ?? null,
      createdAt: updated!.createdAt,
      dataPagamento: updated!.dataPagamento ? updated!.dataPagamento.toISOString().slice(0,10) : null,
      formaPagamento: updated!.formaPagamento ?? null,
      pagoPorId: updated!.pagoPorId ?? null,
      pagoPorNome: updated!.pagoPor?.name ?? null,
      pagoEm: updated!.pagoEm ?? null,
      observacao: updated!.observacao ?? null,
    };
  });
}