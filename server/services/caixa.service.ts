import { prisma } from '../lib/prisma';
import { Prisma, type MovimentoCaixa, type TipoMovimentoCaixa, type OrigemMovimentoCaixa } from '../../src/generated/prisma/client';
import { dataCivilDoInstante, normalizarDataCivil } from '../domain/financeDates';

export class CaixaValidationError extends Error {}
export class SaldoInicialConflictError extends Error {
  readonly code = 'SALDO_INITIAL_CONFLICT';
}

export function validarDataCaixa(value: unknown): Date {
  if (typeof value !== 'string' || value.startsWith('0000-')) throw new CaixaValidationError('Data civil inválida');
  try {
    return normalizarDataCivil(value);
  } catch {
    throw new CaixaValidationError('Data civil inválida');
  }
}

export type DefinirSaldoInput = {
  valor: number;
  dataFinanceira: string; // YYYY-MM-DD
  observacao?: string | null;
  actorId: string;
};

export async function definirSaldoInicial(input: DefinirSaldoInput) {
  const chave = 'SALDO_INICIAL';
  if (typeof input.valor !== 'number' || !Number.isFinite(input.valor) || input.valor < 0) {
    throw new CaixaValidationError('valor inválido');
  }
  const valor = new Prisma.Decimal(input.valor);
  if (valor.decimalPlaces() > 2 || valor.greaterThan('99999999.99')) {
    throw new CaixaValidationError('valor deve caber em NUMERIC(10,2), sem arredondamento');
  }
  const dataFinanceira = validarDataCaixa(input.dataFinanceira);
  const conferirExistente = (existing: MovimentoCaixa) => {
    if (existing.valor.equals(valor) && existing.dataFinanceira.getTime() === dataFinanceira.getTime()) return existing;
    throw new SaldoInicialConflictError('Saldo inicial já definido com valores diferentes');
  };

  // check existing
  const existing = await prisma.movimentoCaixa.findUnique({
    where: { chaveIdempotencia: chave },
  });

  if (existing) return conferirExistente(existing);

  // create
  try {
    return await prisma.movimentoCaixa.create({
      data: {
        tipo: 'SALDO_INICIAL',
        origem: 'SALDO_INICIAL',
        valor,
        dataFinanceira,
        descricao: 'Saldo inicial do caixa',
        referenciaId: null,
        chaveIdempotencia: chave,
        criadoPorId: input.actorId,
        observacao: input.observacao ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const concurrent = await prisma.movimentoCaixa.findUnique({ where: { chaveIdempotencia: chave } });
      if (concurrent) return conferirExistente(concurrent);
    }
    throw error;
  }
}

export type ResumoParams = { mes?: string }; // YYYY-MM

export async function resumoCaixa(params: ResumoParams = {}) {
  const hoje = dataCivilDoInstante(new Date());
  const mesAtual = hoje.toISOString().slice(0, 7);
  const mes = params.mes ?? mesAtual;
  if (typeof mes !== 'string' || !/^(?!0000)[0-9]{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new CaixaValidationError('mes inválido');
  if (mes > mesAtual) throw new CaixaValidationError('mes futuro não permitido');
  const isCurrent = mes === mesAtual;
  const periodoInicio = validarDataCaixa(`${mes}-01`);
  const periodoFim = new Date(periodoInicio);
  periodoFim.setUTCMonth(periodoFim.getUTCMonth() + 1);
  periodoFim.setUTCDate(0);
  const dataReferencia = isCurrent ? hoje : periodoFim;

  // saldoInicial
  const saldoInicialRow = await prisma.movimentoCaixa.findUnique({ where: { chaveIdempotencia: 'SALDO_INICIAL', dataFinanceira: { lte: dataReferencia } } });
  const saldoInicial = saldoInicialRow ? Number(saldoInicialRow.valor) : 0;

  // entradas and saidas in month
  const entradasMesAgg = await prisma.movimentoCaixa.aggregate({
    _sum: { valor: true },
    where: {
      tipo: 'ENTRADA',
      dataFinanceira: { gte: periodoInicio, lte: periodoFim },
    },
  });
  const entradasMes = Number(entradasMesAgg._sum.valor ?? 0);

  const saidasMesAgg = await prisma.movimentoCaixa.aggregate({
    _sum: { valor: true },
    where: {
      tipo: 'SAIDA',
      dataFinanceira: { gte: periodoInicio, lte: periodoFim },
    },
  });
  const saidasMes = Number(saidasMesAgg._sum.valor ?? 0);

  // Acumulado de todo o histórico até a referência; totais mensais usam o mês civil.
  const entriesUpTo = await prisma.movimentoCaixa.aggregate({
    _sum: { valor: true },
    where: { tipo: 'ENTRADA', dataFinanceira: { lte: dataReferencia } },
  });
  const entradasUpTo = Number(entriesUpTo._sum.valor ?? 0);
  const exitsUpTo = Number((await prisma.movimentoCaixa.aggregate({ _sum: { valor: true }, where: { tipo: 'SAIDA', dataFinanceira: { lte: dataReferencia } } }))._sum.valor ?? 0);

  const saldoDisponivel = saldoInicial + entradasUpTo - exitsUpTo;

  const resultadoMes = entradasMes - saidasMes;

  return {
    saldoDisponivel,
    entradasMes,
    saidasMes,
    resultadoMes,
    saldoInicial,
    periodoInicio: periodoInicio.toISOString().slice(0, 10),
    periodoFim: periodoFim.toISOString().slice(0, 10),
    statusPeriodo: isCurrent ? 'CAIXA_ABERTO' : 'PERIODO_ENCERRADO',
  };
}

export type MovimentosFilter = {
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string;
  tipo?: TipoMovimentoCaixa;
  origem?: OrigemMovimentoCaixa;
  limit?: number;
  offset?: number;
};

export async function listarMovimentos(filter: MovimentosFilter = {}) {
  const where: Prisma.MovimentoCaixaWhereInput = {};
  if (filter.dataInicio || filter.dataFim) {
    where.dataFinanceira = {};
    if (filter.dataInicio) where.dataFinanceira.gte = validarDataCaixa(filter.dataInicio);
    if (filter.dataFim) where.dataFinanceira.lte = validarDataCaixa(filter.dataFim);
  }
  if (filter.tipo) where.tipo = filter.tipo;
  if (filter.origem) where.origem = filter.origem;

  const rows = await prisma.movimentoCaixa.findMany({
    where,
    orderBy: [{ dataFinanceira: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    take: filter.limit ?? 50,
    skip: filter.offset ?? 0,
    include: { criadoPor: { select: { id: true, name: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    tipo: r.tipo,
    valor: r.valor,
    dataFinanceira: r.dataFinanceira.toISOString().slice(0, 10),
    descricao: r.descricao,
    origem: r.origem,
    referenciaId: r.referenciaId,
    observacao: r.observacao,
    criadoPorId: r.criadoPorId,
    criadoPorNome: r.criadoPor?.name ?? null,
    createdAt: r.createdAt,
  }));
}

export async function getMovimentoById(id: string) {
  const r = await prisma.movimentoCaixa.findUnique({ where: { id }, include: { criadoPor: { select: { id: true, name: true } } } });
  return r;
}
