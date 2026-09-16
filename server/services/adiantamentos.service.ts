import { Prisma } from '../../src/generated/prisma/client';
import { prisma } from '../lib/prisma';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { executarTransacaoComRetry } from './transactionRetry';

type Ator = NonNullable<AuthenticatedRequest['authUser']>;

export class AdiantamentoError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function autorizar(ator: Ator, role?: Ator['role']) {
  if (!ator?.active || !['ADMIN', 'PROFESSOR'].includes(ator.role) || (role && ator.role !== role)) {
    throw new AdiantamentoError(403, 'Acesso não permitido.');
  }
}

function objeto(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AdiantamentoError(400, 'Payload inválido.');
  }
  return value as Record<string, unknown>;
}

function somenteCampos(body: Record<string, unknown>, permitidos: string[]) {
  for (const campo of Object.keys(body)) {
    if (!permitidos.includes(campo)) throw new AdiantamentoError(400, `Campo proibido no body: ${campo}`);
  }
}

function textoObrigatorio(value: unknown, campo: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new AdiantamentoError(400, `${campo} inválido.`);
  return value.trim();
}

function textoOpcional(value: unknown, campo: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new AdiantamentoError(400, `${campo} inválido.`);
  const normalizado = value.trim();
  return normalizado || null;
}

function valorMonetario(value: unknown): Prisma.Decimal {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new AdiantamentoError(400, 'valor inválido.');
  const valor = new Prisma.Decimal(value);
  if (valor.lt('0.01') || valor.gt('99999999.99') || valor.decimalPlaces() > 2) {
    throw new AdiantamentoError(400, 'valor deve estar entre 0.01 e 99999999.99, com no máximo duas casas decimais.');
  }
  return valor;
}

const include = {
  professor: { select: { name: true } },
  analisadoPor: { select: { name: true } },
  registradoPor: { select: { name: true } },
  confirmadoPor: { select: { name: true } },
} satisfies Prisma.AdiantamentoProfessorInclude;

function serializar(row: Prisma.AdiantamentoProfessorGetPayload<{ include: typeof include }>) {
  return {
    id: row.id,
    professorId: row.professorId,
    professorNome: row.professor.name,
    valor: Number(row.valor),
    motivo: row.motivo,
    status: row.status,
    createdAt: row.createdAt,
    analisadoPorId: row.analisadoPorId,
    analisadoPorNome: row.analisadoPor?.name ?? null,
    analisadoEm: row.analisadoEm,
    motivoRecusa: row.motivoRecusa,
    dataPagamento: row.dataPagamento?.toISOString().slice(0, 10) ?? null,
    formaPagamento: row.formaPagamento,
    registradoPorId: row.registradoPorId,
    registradoPorNome: row.registradoPor?.name ?? null,
    pagoEm: row.pagoEm,
    observacaoPagamento: row.observacaoPagamento,
    confirmadoPorId: row.confirmadoPorId,
    confirmadoPorNome: row.confirmadoPor?.name ?? null,
    confirmadoEm: row.confirmadoEm,
  };
}

export async function solicitarAdiantamento(input: unknown, ator: Ator) {
  autorizar(ator, 'PROFESSOR');
  const body = objeto(input);
  somenteCampos(body, ['valor', 'motivo']);
  const valor = valorMonetario(body.valor);
  const motivo = textoOpcional(body.motivo, 'motivo');

  const row = await prisma.adiantamentoProfessor.create({
    data: { professorId: ator.id, valor, motivo, status: 'SOLICITADO' },
    include,
  });
  return serializar(row);
}

export async function listarAdiantamentos(filter: Record<string, unknown>, ator: Ator) {
  autorizar(ator);
  const where: Prisma.AdiantamentoProfessorWhereInput = {};
  if (ator.role === 'PROFESSOR') where.professorId = ator.id;
  if (filter.professorId !== undefined) {
    if (typeof filter.professorId !== 'string' || !filter.professorId.trim()) {
      throw new AdiantamentoError(400, 'professorId inválido.');
    }
    if (ator.role !== 'ADMIN') throw new AdiantamentoError(403, 'Filtro professorId restrito ao ADMIN.');
    where.professorId = filter.professorId;
  }
  if (filter.status !== undefined) {
    const status = filter.status;
    const permitidos = ['SOLICITADO', 'RECUSADO', 'PAGO_AGUARDANDO_CONFIRMACAO', 'CONFIRMADO'];
    if (typeof status !== 'string' || !permitidos.includes(status)) throw new AdiantamentoError(400, 'status inválido.');
    where.status = status as Prisma.EnumAdiantamentoProfessorStatusFilter['equals'];
  }
  function paginacao(campo: 'limit' | 'offset', padrao: number, min: number, max: number) {
    const raw = filter[campo];
    if (raw === undefined) return padrao;
    if (typeof raw !== 'string' || !/^\d+$/.test(raw)) throw new AdiantamentoError(400, `${campo} inválido.`);
    const numero = Number(raw);
    if (!Number.isSafeInteger(numero) || numero < min || numero > max) throw new AdiantamentoError(400, `${campo} inválido.`);
    return numero;
  }
  const rows = await prisma.adiantamentoProfessor.findMany({
    where,
    include,
    take: paginacao('limit', 50, 1, 1000),
    skip: paginacao('offset', 0, 0, 2147483647),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  return rows.map(serializar);
}

export async function getAdiantamentoById(id: string, ator: Ator) {
  autorizar(ator);
  const row = await prisma.adiantamentoProfessor.findFirst({
    where: { id, ...(ator.role === 'PROFESSOR' ? { professorId: ator.id } : {}) },
    include,
  });
  if (!row) throw new AdiantamentoError(404, 'Adiantamento não encontrado.');
  return serializar(row);
}

export async function recusarAdiantamento(id: string, input: unknown, ator: Ator) {
  autorizar(ator, 'ADMIN');
  const body = objeto(input);
  somenteCampos(body, ['motivoRecusa']);
  const motivoRecusa = textoObrigatorio(body.motivoRecusa, 'motivoRecusa');

  return executarTransacaoComRetry(prisma, async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM adiantamentos_professores WHERE id = ${id} FOR UPDATE
    `;
    if (!locked.length) throw new AdiantamentoError(404, 'Adiantamento não encontrado.');
    const atual = await tx.adiantamentoProfessor.findUniqueOrThrow({ where: { id } });
    if (atual.status !== 'SOLICITADO') {
      throw new AdiantamentoError(409, 'Somente adiantamento SOLICITADO pode ser recusado.');
    }
    return serializar(await tx.adiantamentoProfessor.update({
      where: { id },
      data: { status: 'RECUSADO', analisadoPorId: ator.id, analisadoEm: new Date(), motivoRecusa },
      include,
    }));
  });
}

export async function confirmarRecebimento(id: string, ator: Ator) {
  autorizar(ator, 'PROFESSOR');
  return executarTransacaoComRetry(prisma, async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM adiantamentos_professores
      WHERE id = ${id} AND professor_id = ${ator.id} FOR UPDATE
    `;
    if (!locked.length) throw new AdiantamentoError(404, 'Adiantamento não encontrado.');
    const atual = await tx.adiantamentoProfessor.findUniqueOrThrow({ where: { id }, include });
    if (atual.status === 'CONFIRMADO' && atual.confirmadoPorId === ator.id && atual.confirmadoEm) {
      return serializar(atual);
    }
    if (atual.status !== 'PAGO_AGUARDANDO_CONFIRMACAO') {
      throw new AdiantamentoError(409, 'Adiantamento não está aguardando confirmação.');
    }
    return serializar(await tx.adiantamentoProfessor.update({
      where: { id },
      data: { status: 'CONFIRMADO', confirmadoPorId: ator.id, confirmadoEm: new Date() },
      include,
    }));
  });
}
