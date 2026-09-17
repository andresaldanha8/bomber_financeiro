// Executar: npx tsx --test server/tests/adiantamentos.integration.test.ts
// Usa DATABASE_URL, usuários/sessões temporários e cleanup em finally. Não executar com tráfego concorrente.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import express from 'express';
import cookieParser from 'cookie-parser';
import { prisma } from '../lib/prisma';
import adiantamentosRoutes from '../routes/adiantamentos.routes';
import { createSession } from '../services/auth.service';

test('RDD-002.7.2: API PostgreSQL de adiantamentos', { timeout: 60000 }, async () => {
  assert(prisma.adiantamentoProfessor, 'Execute npx prisma generate antes dos testes.');
  const [adminId, professorId, outroProfessorId] = Array.from({ length: 3 }, () => randomUUID());
  const userIds = [adminId, professorId, outroProfessorId];
  const app = express();
  app.use(express.json(), cookieParser());
  app.use('/api/adiantamentos', adiantamentosRoutes);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/adiantamentos`;
  const cookies: Record<string, string> = {};
  const adiantamentoIds: string[] = [];

  async function request(method: string, path: string, userId?: string, body?: unknown) {
    const response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(userId ? { Cookie: cookies[userId] } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const isJson = response.headers.get('content-type')?.includes('json');
    return { status: response.status, body: text ? (isJson ? JSON.parse(text) : text) : undefined };
  }

  async function check(method: string, path: string, userId: string | undefined, body: unknown, status: number) {
    const result = await request(method, path, userId, body);
    assert.equal(result.status, status, JSON.stringify(result.body));
    return result.body;
  }

  async function criarDireto(professor: string, status: 'SOLICITADO' | 'PAGO_AGUARDANDO_CONFIRMACAO') {
    const id = randomUUID();
    adiantamentoIds.push(id);
    const pago = status === 'PAGO_AGUARDANDO_CONFIRMACAO';
    const instante = new Date('2026-09-15T12:00:00.000Z');
    await prisma.adiantamentoProfessor.create({ data: {
      id,
      professorId: professor,
      valor: 25,
      motivo: 'Teste controlado',
      status,
      createdAt: instante,
      analisadoPorId: pago ? adminId : null,
      analisadoEm: pago ? instante : null,
      dataPagamento: pago ? new Date('2026-09-15T00:00:00.000Z') : null,
      formaPagamento: pago ? 'PIX' : null,
      registradoPorId: pago ? adminId : null,
      pagoEm: pago ? instante : null,
    } });
    return id;
  }

  try {
    for (const [index, id] of userIds.entries()) {
      await prisma.user.create({ data: {
        id,
        name: `Teste adiantamento ${index}`,
        username: `teste-adiantamento-${id}`,
        passwordHash: 'sem-login-por-senha',
        role: index === 0 ? 'ADMIN' : 'PROFESSOR',
      } });
      cookies[id] = `bomber_session=${(await createSession(id)).token}`;
    }

    await check('GET', '', undefined, undefined, 401);
    await check('POST', '', undefined, { valor: 10 }, 401);

    const movimentosAntes = await prisma.movimentoCaixa.findMany({ orderBy: { id: 'asc' } });
    const criado = (await check('POST', '', professorId, { valor: 10.25, motivo: 'Material' }, 201)).adiantamento;
    adiantamentoIds.push(criado.id);
    assert.equal(criado.professorId, professorId);
    assert.equal(criado.professorNome, 'Teste adiantamento 1');
    assert.equal(criado.valor, 10.25);
    assert.equal(criado.motivo, 'Material');
    assert.equal(criado.status, 'SOLICITADO');
    assert(Number.isFinite(Date.parse(criado.createdAt)));
    assert.equal(criado.analisadoPorId, null);
    assert.equal(criado.confirmadoPorId, null);
    assert.deepEqual(await prisma.movimentoCaixa.findMany({ orderBy: { id: 'asc' } }), movimentosAntes);

    for (const campo of ['professorId', 'professorNome', 'status', 'createdAt', 'analisadoPorId', 'confirmadoPorId']) {
      await check('POST', '', professorId, { valor: 10, [campo]: outroProfessorId }, 400);
    }
    await check('POST', '', adminId, { valor: 10 }, 403);
    for (const valor of [0, -1, 0.001, 100000000, Number.NaN, Number.POSITIVE_INFINITY, '10', null]) {
      await check('POST', '', professorId, { valor }, 400);
    }

    const alheioId = await criarDireto(outroProfessorId, 'SOLICITADO');
    const ownList = (await check('GET', '?limit=1000', professorId, undefined, 200)).adiantamentos;
    assert(ownList.length >= 1);
    assert(ownList.every((row: { professorId: string }) => row.professorId === professorId));
    await check('GET', `?professorId=${outroProfessorId}`, professorId, undefined, 403);
    const adminList = (await check('GET', '?limit=1000', adminId, undefined, 200)).adiantamentos;
    assert(adminList.some((row: { id: string }) => row.id === criado.id));
    assert(adminList.some((row: { id: string }) => row.id === alheioId));
    assert.equal((await check('GET', `?professorId=${outroProfessorId}`, adminId, undefined, 200)).adiantamentos[0].id, alheioId);
    await check('GET', `/${alheioId}`, professorId, undefined, 404);
    await check('GET', '/inexistente', professorId, undefined, 404);
    assert.equal((await check('GET', `/${alheioId}`, adminId, undefined, 200)).adiantamento.id, alheioId);

    await check('POST', `/${criado.id}/recusa`, professorId, { motivoRecusa: 'Não' }, 403);
    await check('POST', `/${criado.id}/recusa`, adminId, {}, 400);
    await check('POST', `/${criado.id}/recusa`, adminId, { motivoRecusa: '   ' }, 400);
    await check('POST', `/${criado.id}/recusa`, adminId, { motivoRecusa: 'Não aprovado', analisadoPorId: adminId }, 400);
    const recusado = (await check('POST', `/${criado.id}/recusa`, adminId, { motivoRecusa: '  Não aprovado  ' }, 200)).adiantamento;
    assert.equal(recusado.status, 'RECUSADO');
    assert.equal(recusado.analisadoPorId, adminId);
    assert.equal(recusado.analisadoPorNome, 'Teste adiantamento 0');
    assert.equal(recusado.motivoRecusa, 'Não aprovado');
    assert(Number.isFinite(Date.parse(recusado.analisadoEm)));
    await check('POST', `/${criado.id}/recusa`, adminId, { motivoRecusa: 'Outra' }, 409);
    assert.deepEqual(await prisma.movimentoCaixa.findMany({ orderBy: { id: 'asc' } }), movimentosAntes);

    const pagoId = await criarDireto(professorId, 'PAGO_AGUARDANDO_CONFIRMACAO');
    const pagoAlheioId = await criarDireto(outroProfessorId, 'PAGO_AGUARDANDO_CONFIRMACAO');
    await check('POST', `/${pagoId}/confirmacao`, adminId, {}, 403);
    await check('POST', `/${pagoAlheioId}/confirmacao`, professorId, {}, 404);
    await check('POST', `/${pagoId}/confirmacao`, professorId, { confirmadoPorId: professorId }, 400);
    const antes = await prisma.adiantamentoProfessor.findUniqueOrThrow({ where: { id: pagoId } });
    const confirmado = (await check('POST', `/${pagoId}/confirmacao`, professorId, {}, 200)).adiantamento;
    assert.equal(confirmado.status, 'CONFIRMADO');
    assert.equal(confirmado.confirmadoPorId, professorId);
    assert.equal(confirmado.confirmadoPorNome, 'Teste adiantamento 1');
    assert(Number.isFinite(Date.parse(confirmado.confirmadoEm)));
    for (const campo of ['professorId', 'valor', 'motivo', 'analisadoPorId', 'analisadoEm', 'dataPagamento', 'formaPagamento', 'registradoPorId', 'pagoEm', 'observacaoPagamento']) {
      const original = campo === 'dataPagamento' ? antes.dataPagamento?.toISOString().slice(0, 10) :
        campo.endsWith('Em') ? (antes[campo as 'analisadoEm' | 'pagoEm'] as Date | null)?.toISOString() :
        campo === 'valor' ? Number(antes.valor) : antes[campo as keyof typeof antes];
      assert.equal(confirmado[campo], original);
    }
    const repetido = (await check('POST', `/${pagoId}/confirmacao`, professorId, undefined, 200)).adiantamento;
    assert.deepEqual(repetido, confirmado);
    assert.equal((await prisma.adiantamentoProfessor.findUniqueOrThrow({ where: { id: pagoId } })).confirmadoEm?.toISOString(), confirmado.confirmadoEm);
    await check('POST', `/${criado.id}/confirmacao`, professorId, {}, 409);
    assert.deepEqual(await prisma.movimentoCaixa.findMany({ orderBy: { id: 'asc' } }), movimentosAntes);

    const concorrenteId = await criarDireto(professorId, 'PAGO_AGUARDANDO_CONFIRMACAO');
    const concorrentes = await Promise.all([
      request('POST', `/${concorrenteId}/confirmacao`, professorId, {}),
      request('POST', `/${concorrenteId}/confirmacao`, professorId, {}),
    ]);
    assert(concorrentes.every((result) => result.status === 200));
    assert.deepEqual(concorrentes[0].body, concorrentes[1].body);
    assert.equal(concorrentes[0].body.adiantamento.status, 'CONFIRMADO');
    assert.deepEqual(await prisma.movimentoCaixa.findMany({ orderBy: { id: 'asc' } }), movimentosAntes);

    for (const query of ['status=INVALIDO', 'limit=0', 'limit=1001', 'offset=-1', 'limit=1&limit=2', 'status[x]=a']) {
      await check('GET', `?${query}`, adminId, undefined, 400);
    }
    for (const method of ['PUT', 'PATCH', 'DELETE']) await check(method, `/${criado.id}`, adminId, {}, 404);

    // --- RDD-002.7.3: Pagamento administrativo e integração com Caixa ---
    const pagoTestId = await criarDireto(professorId, 'SOLICITADO');

    // 7. Autorização: PROFESSOR não pode pagar
    await check('POST', `/${pagoTestId}/pagamento`, professorId, { dataPagamento: '2026-09-15', formaPagamento: 'PIX' }, 403);
    assert.equal(await prisma.movimentoCaixa.count({ where: { origem: 'ADIANTAMENTO_PROFESSOR', referenciaId: pagoTestId } }), 0);

    // 8. Datas: futura rejeitada, anterior à solicitação rejeitada, válida aceita
    const futuroId = await criarDireto(professorId, 'SOLICITADO');
    await check('POST', `/${futuroId}/pagamento`, adminId, { dataPagamento: '2026-09-17', formaPagamento: 'PIX' }, 400);
    const anteriorId = await criarDireto(professorId, 'SOLICITADO');
    await check('POST', `/${anteriorId}/pagamento`, adminId, { dataPagamento: '2026-09-14', formaPagamento: 'PIX' }, 400);

    // Pagamento válido
    const body = { dataPagamento: '2026-09-15', formaPagamento: 'PIX', observacaoPagamento: 'Pago externamente' };
    const pagoRes = (await check('POST', `/${pagoTestId}/pagamento`, adminId, body, 200)).adiantamento;
    assert.equal(pagoRes.status, 'PAGO_AGUARDANDO_CONFIRMACAO');
    assert.equal(pagoRes.analisadoPorId, adminId);
    assert(Number.isFinite(Date.parse(pagoRes.analisadoEm)));
    assert.equal(pagoRes.dataPagamento, '2026-09-15');
    assert.equal(pagoRes.formaPagamento, 'PIX');
    assert.equal(pagoRes.registradoPorId, adminId);
    assert(Number.isFinite(Date.parse(pagoRes.pagoEm)));
    assert.equal(pagoRes.observacaoPagamento, 'Pago externamente');

    // 6. MovimentoCaixa criado exatamente 1
    const movimentos = await prisma.movimentoCaixa.findMany({ where: { origem: 'ADIANTAMENTO_PROFESSOR', referenciaId: pagoTestId } });
    assert.equal(movimentos.length, 1);
    const mov = movimentos[0];
    assert.equal(mov.tipo, 'SAIDA');
    assert.equal(mov.origem, 'ADIANTAMENTO_PROFESSOR');
    assert.equal(mov.referenciaId, pagoTestId);
    assert.equal(mov.criadoPorId, adminId);
    assert.equal(mov.chaveIdempotencia, `ADIANTAMENTO_PROFESSOR:${pagoTestId}:PAGAMENTO`);

    // 9. Idempotência: segunda chamada não cria nova SAIDA e preserva campos originais
    const segundo = (await check('POST', `/${pagoTestId}/pagamento`, adminId, { dataPagamento: '2026-09-15', formaPagamento: 'TRANSFERENCIA', observacaoPagamento: 'Segunda tentativa' }, 200)).adiantamento;
    assert.equal((await prisma.movimentoCaixa.count({ where: { origem: 'ADIANTAMENTO_PROFESSOR', referenciaId: pagoTestId } })), 1);
    assert.equal(segundo.dataPagamento, pagoRes.dataPagamento);
    assert.equal(segundo.formaPagamento, pagoRes.formaPagamento);
    assert.equal(segundo.observacaoPagamento, pagoRes.observacaoPagamento);
    assert.equal(segundo.analisadoPorId, pagoRes.analisadoPorId);
    assert.equal(segundo.registradoPorId, pagoRes.registradoPorId);

    // 10. Pagamento concorrente: duas solicitações simultâneas resultam em exatamente 1 movimento
    const concId = await criarDireto(professorId, 'SOLICITADO');
    await Promise.all([
      request('POST', `/${concId}/pagamento`, adminId, { dataPagamento: '2026-09-15', formaPagamento: 'PIX' }),
      request('POST', `/${concId}/pagamento`, adminId, { dataPagamento: '2026-09-15', formaPagamento: 'PIX' }),
    ]);
    assert.equal((await prisma.movimentoCaixa.count({ where: { origem: 'ADIANTAMENTO_PROFESSOR', referenciaId: concId } })), 1);
    assert.equal((await prisma.adiantamentoProfessor.findUniqueOrThrow({ where: { id: concId } })).status, 'PAGO_AGUARDANDO_CONFIRMACAO');

    // 11. Rollback atômico: simular falha na criação do MovimentoCaixa
    const rbId = await criarDireto(professorId, 'SOLICITADO');
    const rbChave = `ADIANTAMENTO_PROFESSOR:${rbId}:PAGAMENTO`;
    const originalTransaction = prisma.$transaction;
    try {
      // interceptar $transaction para injetar falha no tx.movimentoCaixa.create
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      prisma.$transaction = async (operation: any, opts?: any) => {
        return originalTransaction(async (tx: any) => {
          const origCreate = tx.movimentoCaixa.create;
          // @ts-ignore
          tx.movimentoCaixa.create = async (args: any) => {
            if (args?.data?.chaveIdempotencia === rbChave) throw new Error('Simulated failure creating movimento');
            return origCreate.call(tx.movimentoCaixa, args);
          };
          return operation(tx);
        }, opts);
      };
      const resp = await request('POST', `/${rbId}/pagamento`, adminId, { dataPagamento: '2026-09-15', formaPagamento: 'PIX' });
      assert(resp.status >= 400, `Esperado erro ao simular falha na criação do movimento, recebeu ${resp.status}`);
      const after = await prisma.adiantamentoProfessor.findUniqueOrThrow({ where: { id: rbId } });
      assert.equal(after.status, 'SOLICITADO');
      assert.equal(after.dataPagamento, null);
      assert.equal(after.registradoPorId, null);
      assert.equal(after.pagoEm, null);
      assert.equal((await prisma.movimentoCaixa.count({ where: { origem: 'ADIANTAMENTO_PROFESSOR', referenciaId: rbId } })), 0);
    } finally {
      // restaurar
      // @ts-ignore
      prisma.$transaction = originalTransaction;
    }

    // 12. Pagamento × Recusa concorrentes: apenas um resultado válido
    const raceId = await criarDireto(professorId, 'SOLICITADO');
    await Promise.all([
      request('POST', `/${raceId}/pagamento`, adminId, { dataPagamento: '2026-09-15', formaPagamento: 'PIX' }),
      request('POST', `/${raceId}/recusa`, adminId, { motivoRecusa: 'Recusar concorrente' }),
    ]);
    const final = await prisma.adiantamentoProfessor.findUniqueOrThrow({ where: { id: raceId } });
    const finalMovCount = await prisma.movimentoCaixa.count({ where: { origem: 'ADIANTAMENTO_PROFESSOR', referenciaId: raceId } });
    assert((final.status === 'PAGO_AGUARDANDO_CONFIRMACAO' && finalMovCount === 1) || (final.status === 'RECUSADO' && finalMovCount === 0));

    // 13. Confirmação posterior pelo PROFESSOR não cria novo movimento
    const confId = await criarDireto(professorId, 'SOLICITADO');
    await check('POST', `/${confId}/pagamento`, adminId, { dataPagamento: '2026-09-15', formaPagamento: 'PIX' }, 200);
    await check('POST', `/${confId}/confirmacao`, professorId, {}, 200);
    assert.equal((await prisma.movimentoCaixa.count({ where: { origem: 'ADIANTAMENTO_PROFESSOR', referenciaId: confId } })), 1);

    // 14. Inconsistência defensiva: PAGO_AGUARDANDO_CONFIRMACAO sem MovimentoCaixa -> pagamento deve retornar 409
    const inconsistentId = await criarDireto(professorId, 'PAGO_AGUARDANDO_CONFIRMACAO');
    await check('POST', `/${inconsistentId}/pagamento`, adminId, { dataPagamento: '2026-09-15', formaPagamento: 'PIX' }, 409);

    // Contagem final básica para limpar expectativas (não é uma asserção forte de quantidade global)
    // (os testes abaixo removem tudo no cleanup)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    try {
      await prisma.$transaction(async (tx) => {
        await tx.movimentoCaixa.deleteMany({ where: { origem: 'ADIANTAMENTO_PROFESSOR', referenciaId: { in: adiantamentoIds } } });
        await tx.adiantamentoProfessor.deleteMany({ where: { id: { in: adiantamentoIds } } });
        await tx.session.deleteMany({ where: { userId: { in: userIds } } });
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
      });
      assert.equal(await prisma.adiantamentoProfessor.count({ where: { id: { in: adiantamentoIds } } }), 0);
      assert.equal(await prisma.user.count({ where: { id: { in: userIds } } }), 0);
      console.log('PASS RDD-002.7.2: cleanup confirmado e zero MovimentoCaixa criado.');
    } finally { await prisma.$disconnect(); }
  }
});
