import { Prisma } from '../../src/generated/prisma/client';
import type { EntryCondition, Student, User, Mensalidade, StudentActivityPeriod } from '../../src/generated/prisma/client';
import {
  type DataCivil, normalizarDataCivil, compararDatasCivis, obterCompetencia,
  obterCompetenciaSeguinte, calcularVencimento, validarDiaBase,
  primeiraCompetenciaAposReativacao,
} from '../domain/financeDates';

type Actor = Pick<User, 'id'>;

export function valorMensalidadeInicial(condition: EntryCondition): Prisma.Decimal {
  switch (condition) {
    case 'INDIVIDUAL': return new Prisma.Decimal('80.00');
    case 'DUPLA': return new Prisma.Decimal('75.00');
    case 'TRIO_MAIS': return new Prisma.Decimal('70.00');
    default: throw new Error('Condição de entrada inválida.');
  }
}

export function valorMensalidadeRecorrente(): Prisma.Decimal {
  return new Prisma.Decimal('80.00');
}

/**
 * Chamador deve usar transação interativa ReadCommitted e incluir a alteração
 * de Student na mesma transação. O lock dura até commit/rollback.
 * Em Serializable/RepeatableRead, conflitos exigem retry da transação inteira.
 * Não captura P2002 em transação abortada e não oferece update de mensalidade.
 * P2002 propaga: o chamador decide se uma NOVA transação pode reler um
 * resultado equivalente. Conflito real não é sucesso nem retry automático.
 */
async function bloquearStudent(tx: Prisma.TransactionClient, id: string): Promise<Student> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "students" WHERE "id" = ${id} FOR UPDATE
  `;
  if (rows.length === 0) throw new Error('Student não encontrado.');
  return tx.student.findUniqueOrThrow({ where: { id } });
}

/** Exclusiva do fluxo futuro de cadastro: não executar como backfill. */
export async function criarMensalidadeInicial(
  tx: Prisma.TransactionClient, novoStudent: Pick<Student, 'id'>, actor: Actor,
): Promise<Mensalidade> {
  const student = await bloquearStudent(tx, novoStudent.id);
  const existing = await tx.mensalidade.findFirst({
    where: { studentId: student.id, isPagamentoInicial: true },
  });
  if (existing) return existing;
  if (student.status !== 'ATIVO') throw new Error('Cadastro inicial exige Student ATIVO.');
  validarDiaBase(student.dueDay);
  return tx.mensalidade.create({ data: {
    studentId: student.id,
    competencia: obterCompetencia(student.entryDate),
    valor: valorMensalidadeInicial(student.entryCondition),
    dataVencimento: normalizarDataCivil(student.entryDate),
    isPagamentoInicial: true,
    diaBaseNaGeracao: student.dueDay,
    status: 'PENDENTE',
    createdById: actor.id,
  } });
}

async function abrirPeriodo(
  tx: Prisma.TransactionClient, student: Student, actor: Actor,
  effectiveDate: DataCivil | undefined,
): Promise<StudentActivityPeriod> {
  const studentId = student.id;
  if (student.status !== 'ATIVO') throw new Error('Abertura exige Student ATIVO.');
  const open = await tx.studentActivityPeriod.findFirst({
    where: { studentId, endedAt: null },
  });
  if (open) return open;
  const startedAt = normalizarDataCivil(effectiveDate ?? student.entryDate);
  const latest = await tx.studentActivityPeriod.findFirst({
    where: { studentId }, orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
  });
  if (effectiveDate === undefined && latest) {
    throw new Error('Período inicial já encerrado; use reativação.');
  }
  if (compararDatasCivis(startedAt, student.entryDate) < 0 ||
      (latest?.endedAt && compararDatasCivis(startedAt, latest.endedAt) < 0)) {
    throw new Error('Início do período anterior à entrada ou ao encerramento anterior.');
  }
  return tx.studentActivityPeriod.create({ data: { studentId, startedAt, startedById: actor.id } });
}

export async function abrirPeriodoAtivoInicial(
  tx: Prisma.TransactionClient, novoStudent: Pick<Student, 'id'>, actor: Actor,
): Promise<StudentActivityPeriod> {
  const student = await bloquearStudent(tx, novoStudent.id);
  return abrirPeriodo(tx, student, actor, undefined);
}

/** Datas efetivas de atividade são civis; intervalos [startedAt, endedAt). */
async function fecharPeriodoAtivo(
  tx: Prisma.TransactionClient, open: StudentActivityPeriod, actor: Actor, effectiveDate: DataCivil,
): Promise<StudentActivityPeriod> {
  const endedAt = normalizarDataCivil(effectiveDate);
  if (compararDatasCivis(endedAt, open.startedAt) < 0) throw new Error('Encerramento anterior à abertura.');
  return tx.studentActivityPeriod.update({ where: { id: open.id }, data: { endedAt, endedById: actor.id } });
}

export interface TransicaoStatusStudent {
  studentId: string;
  statusAnterior: Student['status'];
  statusNovo: Student['status'];
  dataEfetiva: DataCivil;
  // Período aberto observado (ao inativar) ou último fechado (ao reativar).
  // null é explícito para cadastros anteriores sem histórico de atividade.
  periodoEsperadoId: string | null;
}

/**
 * Única entrada para fechar/reativar. Lê o estado REAL sob um único lock e
 * atualiza status e período na mesma tx. Não atualizar status antes de chamar.
 * O ID observado deve vir da operação original, não ser substituído em retry:
 * status sozinho não detecta ATIVO -> INATIVO -> ATIVO (problema ABA).
 * Sem mudança de status, nenhum período é alterado. Sem período ao inativar,
 * falha explicitamente: não inventa histórico para Students anteriores.
 */
export async function aplicarTransicaoStatusStudent(
  tx: Prisma.TransactionClient, input: TransicaoStatusStudent, actor: Actor,
): Promise<{ student: Student; periodo: StudentActivityPeriod | null; competenciaElegivel: Date | null }> {
  const student = await bloquearStudent(tx, input.studentId);
  if (!['ATIVO', 'INATIVO'].includes(input.statusAnterior) ||
      !['ATIVO', 'INATIVO'].includes(input.statusNovo)) throw new Error('Status inválido.');
  if (student.status === input.statusNovo) {
    return { student, periodo: null, competenciaElegivel: null };
  }
  if (student.status !== input.statusAnterior) throw new Error('Transição obsoleta: status alterado.');
  const open = await tx.studentActivityPeriod.findFirst({ where: { studentId: student.id, endedAt: null } });
  const latest = open ?? await tx.studentActivityPeriod.findFirst({
    where: { studentId: student.id },
    orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
  });
  if ((latest?.id ?? null) !== input.periodoEsperadoId) throw new Error('Transição obsoleta: período alterado.');
  if (input.statusNovo === 'INATIVO') {
    if (!open) throw new Error('Student ATIVO sem período aberto; regularização explícita necessária.');
    const periodo = await fecharPeriodoAtivo(tx, open, actor, input.dataEfetiva);
    const updated = await tx.student.update({ where: { id: student.id }, data: { status: 'INATIVO' } });
    return { student: updated, periodo, competenciaElegivel: null };
  }
  if (open) throw new Error('Student INATIVO com período aberto; histórico inconsistente.');
  const competenciaElegivel = primeiraCompetenciaAposReativacao(input.dataEfetiva, student.dueDay);
  const updated = await tx.student.update({ where: { id: student.id }, data: { status: 'ATIVO' } });
  const periodo = await abrirPeriodo(tx, updated, actor, input.dataEfetiva);
  return { student: updated, periodo, competenciaElegivel };
}

export { primeiraCompetenciaAposReativacao };

export interface ProximoCiclo {
  competencia: Date;
  dataVencimento: Date;
  valor: Prisma.Decimal;
}

/**
 * Retoma somente no período aberto: não recupera lacunas de períodos encerrados.
 * Histórico já gerado permanece consultável, mas não é recriado por esta função.
 * Student INATIVO não é elegível, mesmo com período aberto inconsistente.
 */
export function calcularProximaCompetenciaElegivel(
  student: Pick<Student, 'id' | 'status' | 'dueDay'>,
  mensalidade: Pick<Mensalidade, 'studentId' | 'competencia'>,
  periodos: readonly Pick<StudentActivityPeriod, 'studentId' | 'startedAt' | 'endedAt'>[],
): ProximoCiclo | null {
  if (student.status === 'INATIVO') return null;
  if (mensalidade.studentId !== student.id) throw new Error('Mensalidade pertence a outro Student.');
  const abertos = periodos.filter((p) => p.studentId === student.id && p.endedAt === null);
  if (abertos.length > 1) throw new Error('Mais de um período aberto para Student.');
  const aberto = abertos[0];
  if (!aberto) return null;
  let competencia = obterCompetenciaSeguinte(mensalidade.competencia);
  const retomada = primeiraCompetenciaAposReativacao(aberto.startedAt, student.dueDay);
  // Salto equivalente ao avanço mensal sobre todas as competências inelegíveis.
  if (compararDatasCivis(competencia, retomada) < 0) competencia = retomada;
  return { competencia, dataVencimento: calcularVencimento(competencia, student.dueDay), valor: valorMensalidadeRecorrente() };
}

/** Consulta transacional; nenhuma geração, atualização de status ou persistência. */
export async function consultarProximoCicloElegivel(
  tx: Prisma.TransactionClient, mensalidadeId: string,
): Promise<ProximoCiclo | null> {
  const mensalidade = await tx.mensalidade.findUniqueOrThrow({ where: { id: mensalidadeId } });
  const student = await bloquearStudent(tx, mensalidade.studentId);
  if (student.status === 'INATIVO') return null;
  const periodos = await tx.studentActivityPeriod.findMany({ where: { studentId: student.id } });
  const ciclo = calcularProximaCompetenciaElegivel(student, mensalidade, periodos);
  if (!ciclo) return null;
  // Nunca recalcula uma cobrança que já existe usando o dia-base atual.
  const existing = await tx.mensalidade.findUnique({ where: {
    studentId_competencia: { studentId: student.id, competencia: ciclo.competencia },
  } });
  return existing
    ? { competencia: existing.competencia, dataVencimento: existing.dataVencimento, valor: existing.valor }
    : ciclo;
}
