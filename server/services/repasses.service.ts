import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { normalizarDataCivil } from '../domain/financeDates.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { executarTransacaoComRetry } from './transactionRetry.js';

type Ator = NonNullable<AuthenticatedRequest['authUser']>;

export class RepasseError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function autorizar(ator: Ator, role?: Ator['role']) {
  if (!ator?.active || !['ADMIN', 'PROFESSOR'].includes(ator.role) || (role && ator.role !== role)) {
    throw new RepasseError(403, 'Acesso não permitido.');
  }
}

function texto(value: unknown, campo: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new RepasseError(400, `${campo} inválido.`);
  return value;
}

function competenciaValida(value: unknown): string {
  const competencia = texto(value, 'competencia');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) {
    throw new RepasseError(400, 'competencia inválida. Use YYYY-MM.');
  }
  return competencia;
}

function dataCivil(value: unknown, campo: string): Date {
  const valueText = texto(value, campo);
  try {
    const data = normalizarDataCivil(valueText);
    if (data.getUTCFullYear() === 0) throw new Error('Ano inválido');
    return data;
  } catch {
    throw new RepasseError(400, `${campo} inválida. Use YYYY-MM-DD.`);
  }
}

function valorMonetario(value: unknown): Prisma.Decimal {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new RepasseError(400, 'valor inválido.');
  const valor = new Prisma.Decimal(value);
  if (valor.lte(0) || valor.gt('99999999.99') || valor.decimalPlaces() > 2) {
    throw new RepasseError(400, 'valor deve ser positivo e compatível com Decimal(10,2).');
  }
  return valor;
}

const include = {
  professor: { select: { name: true } },
  registradoPor: { select: { name: true } },
  confirmadoPor: { select: { name: true } },
} satisfies Prisma.RepasseProfessorInclude;

function serializar(r: Prisma.RepasseProfessorGetPayload<{ include: typeof include }>) {
  return {
    id: r.id,
    professorId: r.professorId,
    professorNome: r.professor.name,
    competencia: r.competencia,
    valor: Number(r.valor),
    dataRepasse: r.dataRepasse.toISOString().slice(0, 10),
    formaPagamento: r.formaPagamento,
    status: r.status,
    registradoPorId: r.registradoPorId,
    registradoPorNome: r.registradoPor.name,
    registradoEm: r.registradoEm,
    confirmadoPorId: r.confirmadoPorId,
    confirmadoPorNome: r.confirmadoPor?.name ?? null,
    confirmadoEm: r.confirmadoEm,
  };
}

export async function criarRepasse(input: unknown, ator: Ator) {
  autorizar(ator, 'ADMIN');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RepasseError(400, 'Payload inválido.');
  const body = input as Record<string, unknown>;
  const permitidos = ['professorId', 'competencia', 'valor', 'dataRepasse', 'formaPagamento'];
  for (const campo of Object.keys(body)) {
    if (!permitidos.includes(campo)) throw new RepasseError(400, `Campo proibido no body: ${campo}`);
  }
  const professorId = texto(body.professorId, 'professorId');
  const competencia = competenciaValida(body.competencia);
  const valor = valorMonetario(body.valor);
  const dataRepasse = dataCivil(body.dataRepasse, 'dataRepasse');
  const formaPagamento = texto(body.formaPagamento, 'formaPagamento');
  if (!['PIX', 'DINHEIRO', 'TRANSFERENCIA'].includes(formaPagamento)) {
    throw new RepasseError(400, 'formaPagamento inválida.');
  }

  return executarTransacaoComRetry(prisma, async (tx) => {
    // Impede que uma desativação/alteração de perfil intercale a validação e o cadastro.
    const [professor] = await tx.$queryRaw<{ role: string; active: boolean }[]>`
      SELECT role, active FROM users WHERE id = ${professorId} FOR SHARE
    `;
    if (!professor) throw new RepasseError(400, 'Professor não encontrado.');
    if (professor.role !== 'PROFESSOR') throw new RepasseError(400, 'Destinatário deve ser PROFESSOR.');
    if (!professor.active) throw new RepasseError(400, 'Professor inativo.');

    const repasse = await tx.repasseProfessor.create({
      data: {
        professorId, competencia, valor, dataRepasse, formaPagamento,
        status: 'AGUARDANDO_RECEBIMENTO', registradoPorId: ator.id,
        confirmadoPorId: null, confirmadoEm: null,
      },
      include,
    });
    // O repasse e sua SAÍDA só podem persistir juntos, na mesma transação.
    await tx.movimentoCaixa.create({ data: {
      tipo: 'SAIDA',
      origem: 'REPASSE_PROFESSOR',
      valor: repasse.valor,
      dataFinanceira: repasse.dataRepasse,
      descricao: `Repasse - ${repasse.professor.name} - ${repasse.competencia}`,
      referenciaId: repasse.id,
      chaveIdempotencia: `REPASSE_PROFESSOR:${repasse.id}`,
      criadoPorId: repasse.registradoPorId,
    } });
    return serializar(repasse);
  });
}

export async function listarRepasses(filter: Record<string, unknown>, ator: Ator) {
  autorizar(ator);
  const where: Prisma.RepasseProfessorWhereInput = {};
  if (ator.role === 'PROFESSOR') where.professorId = ator.id;
  if (filter.professorId !== undefined) {
    const id = texto(filter.professorId, 'professorId');
    if (ator.role !== 'ADMIN') throw new RepasseError(403, 'Filtro professorId restrito ao ADMIN.');
    where.professorId = id;
  }
  if (filter.competencia !== undefined) where.competencia = competenciaValida(filter.competencia);
  if (filter.status !== undefined) {
    if (filter.status !== 'AGUARDANDO_RECEBIMENTO' && filter.status !== 'RECEBIMENTO_CONFIRMADO') {
      throw new RepasseError(400, 'status inválido.');
    }
    where.status = filter.status;
  }
  const inicio = filter.dataInicio === undefined ? undefined : dataCivil(filter.dataInicio, 'dataInicio');
  const fim = filter.dataFim === undefined ? undefined : dataCivil(filter.dataFim, 'dataFim');
  if (inicio && fim && inicio > fim) throw new RepasseError(400, 'dataInicio deve ser anterior ou igual a dataFim.');
  if (inicio || fim) where.dataRepasse = { gte: inicio, lte: fim };
  function paginacao(campo: string, padrao: number, min: number, max: number) {
    if (filter[campo] === undefined) return padrao;
    const value = texto(filter[campo], campo);
    const numero = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(numero) || numero < min || numero > max) {
      throw new RepasseError(400, `${campo} inválido.`);
    }
    return numero;
  }
  const take = paginacao('limit', 50, 1, 1000);
  const skip = paginacao('offset', 0, 0, 2147483647);
  const rows = await prisma.repasseProfessor.findMany({
    where, include, take, skip,
    orderBy: [{ dataRepasse: 'desc' }, { registradoEm: 'desc' }, { id: 'desc' }],
  });
  return rows.map(serializar);
}

export async function getRepasseById(id: string, ator: Ator) {
  autorizar(ator);
  const row = await prisma.repasseProfessor.findFirst({
    where: { id, ...(ator.role === 'PROFESSOR' ? { professorId: ator.id } : {}) }, include,
  });
  if (!row) throw new RepasseError(404, 'Repasse não encontrado.');
  return serializar(row);
}

export async function confirmarRecebimento(id: string, ator: Ator) {
  autorizar(ator, 'PROFESSOR');
  return executarTransacaoComRetry(prisma, async (tx) => {
    // O destinatário faz parte da consulta: IDs alheios e inexistentes têm a mesma resposta.
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM repasses_professores
      WHERE id = ${id} AND professor_id = ${ator.id} FOR UPDATE
    `;
    if (!rows.length) throw new RepasseError(404, 'Repasse não encontrado.');
    const repasse = await tx.repasseProfessor.findUniqueOrThrow({ where: { id }, include });
    if (repasse.status === 'RECEBIMENTO_CONFIRMADO') return serializar(repasse);
    return serializar(await tx.repasseProfessor.update({
      where: { id },
      data: { status: 'RECEBIMENTO_CONFIRMADO', confirmadoPorId: ator.id, confirmadoEm: new Date() },
      include,
    }));
  });
}
