import { prisma } from '../lib/prisma.js';
import { executarTransacaoComRetry } from './transactionRetry.js';
import { normalizarDataCivil } from '../domain/financeDates.js';
import * as mensalidadesService from './mensalidades.service.js';
import type { Prisma } from '@prisma/client';

type PagamentoParaCaixa = {
  id: string;
  valor: Prisma.Decimal;
  dataPagamento: Date;
};

// Chamado somente após a confirmação real, na transação do pagamento.
async function criarEntradaPagamento(
  tx: Prisma.TransactionClient, pagamento: PagamentoParaCaixa, adminId: string,
) {
  await tx.movimentoCaixa.create({ data: {
    tipo: 'ENTRADA',
    origem: 'PAGAMENTO_ALUNO',
    valor: pagamento.valor,
    dataFinanceira: pagamento.dataPagamento,
    referenciaId: pagamento.id,
    chaveIdempotencia: `PAGAMENTO_ALUNO:${pagamento.id}`,
    criadoPorId: adminId,
    descricao: 'Recebimento de pagamento de aluno',
  } });
}

/** Tipos mínimos locais para evitar dependência do client gerado */
export type FormaPagamento = 'PIX' | 'DINHEIRO';
export type StatusConfirmacao = 'AGUARDANDO' | 'CONFIRMADO';

/** Professor registra pagamento: cria PagamentoAluno AGUARDANDO e atualiza Mensalidade -> AGUARDANDO_CONFIRMACAO */
export async function registrarPagamentoProfessor(
  mensalidadeId: string,
  formaPagamento: FormaPagamento,
  dataPagamento: string,
  registradoPorId: string,
) {
  return executarTransacaoComRetry(prisma, async (tx) => {
    // lock mensalidade
    const mensalRows: { id: string; studentId: string; status: string; valor: string; dataVencimento: string }[] = await tx.$queryRaw`
      SELECT id, "studentId", status, valor, "dataVencimento" FROM "mensalidades" WHERE id = ${mensalidadeId} FOR UPDATE
    `;
    if (mensalRows.length === 0) throw new Error('Mensalidade não encontrada.');
    const m = mensalRows[0];
    if (m.status === 'QUITADA') throw new Error('Mensalidade já quitada.');

    // impedir pagamentos concorrentes: verificar pagamentos AGUARDANDO ou CONFIRMADO
    const existing: { id: string }[] = await tx.$queryRaw`
      SELECT id FROM pagamentos_alunos WHERE mensalidade_id = ${mensalidadeId} AND status_confirmacao IN ('AGUARDANDO','CONFIRMADO') LIMIT 1 FOR SHARE
    `;
    if (existing.length > 0) throw new Error('Já existe pagamento em processamento ou confirmado para esta mensalidade.');

    // criar pagamento usando valor da mensalidade (fonte de verdade)
    const dataPag = normalizarDataCivil(dataPagamento).toISOString().slice(0,10);
    const createRes = await tx.$queryRaw`
      INSERT INTO pagamentos_alunos (id, mensalidade_id, valor, forma_pagamento, status_confirmacao, data_pagamento, registrado_por_id, created_at, updated_at)
      VALUES (gen_random_uuid()::text, ${mensalidadeId}, ${m.valor}, ${formaPagamento}, 'AGUARDANDO', ${dataPag}, ${registradoPorId}, now(), now())
      RETURNING id
    `;

    // atualizar mensalidade para AGUARDANDO_CONFIRMACAO
    await tx.$queryRaw`
      UPDATE mensalidades SET status = 'AGUARDANDO_CONFIRMACAO', "updatedAt" = now() WHERE id = ${mensalidadeId}
    `;

    return (createRes as any)[0];
  });
}

/** Admin confirma um pagamento AGUARDANDO -> CONFIRMADO; quita mensalidade e gera próxima se aplicável */
export async function confirmarPagamentoPorAdmin(
  pagamentoId: string,
  confirmadoPorId: string,
) {
  return executarTransacaoComRetry(prisma, async (tx) => {
    // lock pagamento
    const pagamentos = await tx.$queryRaw<(PagamentoParaCaixa & { mensalidade_id: string; status_confirmacao: StatusConfirmacao })[]>`
      SELECT id, mensalidade_id, status_confirmacao, valor, data_pagamento AS "dataPagamento" FROM pagamentos_alunos WHERE id = ${pagamentoId} FOR UPDATE
    `;
    if (pagamentos.length === 0) throw new Error('Pagamento não encontrado.');
    const p = pagamentos[0];
    if (p.status_confirmacao === 'CONFIRMADO') return { ok: true, message: 'Pagamento já confirmado.' };

    // lock mensalidade
    const mensalRows: any[] = await tx.$queryRaw`
      SELECT id, "studentId", status FROM "mensalidades" WHERE id = ${p.mensalidade_id} FOR UPDATE
    `;
    if (mensalRows.length === 0) throw new Error('Mensalidade não encontrada.');
    const m = mensalRows[0];
    if (m.status === 'QUITADA') return { ok: true, message: 'Mensalidade já quitada.' };

    // atualizar pagamento
    await tx.$queryRaw`
      UPDATE pagamentos_alunos SET status_confirmacao = 'CONFIRMADO', confirmado_por_id = ${confirmadoPorId}, confirmado_em = now(), updated_at = now() WHERE id = ${pagamentoId}
    `;

    // quitar mensalidade
    await tx.$queryRaw`
      UPDATE mensalidades SET status = 'QUITADA', "updatedAt" = now() WHERE id = ${p.mensalidade_id}
    `;

    // gerar próxima mensalidade idempotentemente
    const ciclo = await mensalidadesService.consultarProximoCicloElegivel(tx as any, p.mensalidade_id);
    if (ciclo) {
      // verificar existência
      const existing = await tx.$queryRaw`
        SELECT id FROM mensalidades WHERE "studentId" = ${m.studentId} AND competencia = ${ciclo.competencia}
      `;
      if ((existing as any[]).length === 0) {
        await tx.$queryRaw`
          INSERT INTO mensalidades (id, "studentId", competencia, valor, "dataVencimento", "isPagamentoInicial", "diaBaseNaGeracao", status, "createdById", "createdAt", "updatedAt")
          VALUES (gen_random_uuid()::text, ${m.studentId}, ${ciclo.competencia}, ${ciclo.valor}, ${ciclo.dataVencimento}, false, (SELECT "dueDay" FROM students WHERE id = ${m.studentId}), 'PENDENTE', ${confirmadoPorId}, now(), now())
        `;
      }
    }

    await criarEntradaPagamento(tx, p, confirmadoPorId);
    return { ok: true };
  });
}

/** Admin registra pagamento direto: cria Payment CONFIRMADO, quita e gera próxima */
export async function registrarPagamentoAdminDireto(
  mensalidadeId: string,
  formaPagamento: FormaPagamento,
  dataPagamento: string,
  adminId: string,
) {
  return executarTransacaoComRetry(prisma, async (tx) => {
    // lock mensalidade
    const mensalRows: any[] = await tx.$queryRaw`
      SELECT id, "studentId", status, valor FROM "mensalidades" WHERE id = ${mensalidadeId} FOR UPDATE
    `;
    if (mensalRows.length === 0) throw new Error('Mensalidade não encontrada.');
    const m = mensalRows[0];
    if (m.status === 'QUITADA') throw new Error('Mensalidade já quitada.');

    // impedir pagamentos concorrentes
    const existing: { id: string }[] = await tx.$queryRaw`
      SELECT id FROM pagamentos_alunos WHERE mensalidade_id = ${mensalidadeId} AND status_confirmacao IN ('AGUARDANDO','CONFIRMADO') LIMIT 1 FOR SHARE
    `;
    if (existing.length > 0) throw new Error('Já existe pagamento em processamento ou confirmado para esta mensalidade.');

    const dataPag = normalizarDataCivil(dataPagamento).toISOString().slice(0,10);
    const createRes = await tx.$queryRaw<PagamentoParaCaixa[]>`
      INSERT INTO pagamentos_alunos (id, mensalidade_id, valor, forma_pagamento, status_confirmacao, data_pagamento, registrado_por_id, confirmado_por_id, confirmado_em, created_at, updated_at)
      VALUES (gen_random_uuid()::text, ${mensalidadeId}, ${m.valor}, ${formaPagamento}, 'CONFIRMADO', ${dataPag}, ${adminId}, ${adminId}, now(), now(), now())
      RETURNING id, valor, data_pagamento AS "dataPagamento"
    `;

    // quitar mensalidade
    await tx.$queryRaw`
      UPDATE mensalidades SET status = 'QUITADA', "updatedAt" = now() WHERE id = ${mensalidadeId}
    `;

    // gerar próxima mensalidade idempotentemente
    const ciclo = await mensalidadesService.consultarProximoCicloElegivel(tx as any, mensalidadeId);
    if (ciclo) {
      const existing = await tx.$queryRaw`
        SELECT id FROM mensalidades WHERE "studentId" = ${m.studentId} AND competencia = ${ciclo.competencia}
      `;
      if ((existing as any[]).length === 0) {
        await tx.$queryRaw`
          INSERT INTO mensalidades (id, "studentId", competencia, valor, "dataVencimento", "isPagamentoInicial", "diaBaseNaGeracao", status, "createdById", "createdAt", "updatedAt")
          VALUES (gen_random_uuid()::text, ${m.studentId}, ${ciclo.competencia}, ${ciclo.valor}, ${ciclo.dataVencimento}, false, (SELECT "dueDay" FROM students WHERE id = ${m.studentId}), 'PENDENTE', ${adminId}, now(), now())
        `;
      }
    }

    await criarEntradaPagamento(tx, createRes[0], adminId);
    return { id: createRes[0].id };
  });
}
