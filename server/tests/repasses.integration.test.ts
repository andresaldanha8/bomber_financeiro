// Executar: npx tsx --test server/tests/repasses.integration.test.ts
// Usa DATABASE_URL, usuários/sessões temporários e cleanup em finally. Não executar com tráfego concorrente.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import express from 'express';
import cookieParser from 'cookie-parser';
import { prisma } from '../lib/prisma';
import { createSession } from '../services/auth.service';
import repassesRoutes from '../routes/repasses.routes';

test('RDD-002.6.3 + regressão 002.6.2: HTTP + autenticação real + PostgreSQL', { timeout: 60000 }, async (t) => {
  assert(prisma.repasseProfessor, 'Execute npx prisma generate antes dos testes.');
  const ids = Array.from({ length: 4 }, () => randomUUID());
  const [adminId, professorId, outroId, inativoId] = ids;
  const app = express();
  app.use(express.json(), cookieParser());
  app.use('/api/repasses', repassesRoutes);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/repasses`;
  const cookies: Record<string, string> = {};
  async function request(method: string, path: string, userId?: string, body?: unknown) {
    const response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(userId ? { Cookie: cookies[userId] } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text };
  }
  async function checkStatus(method: string, path: string, userId: string | undefined, body: unknown, expected: number) {
    const result = await request(method, path, userId, body);
    assert.equal(result.status, expected, JSON.stringify(result.body));
    return result.body;
  }
  const payload = { professorId, competencia: '2026-09', valor: 123.45, dataRepasse: '2024-02-29', formaPagamento: 'PIX' };
  const passed = (letters: string) => console.log(`PASS regressão 002.6.2: ${letters}`);
  const passedCaixa = (letters: string) => console.log(`PASS 002.6.3: ${letters}`);
  const movimentos = () => prisma.movimentoCaixa.findMany({ orderBy: { id: 'asc' } });
  async function verificarSaida(repasseId: string) {
    const repasse = await prisma.repasseProfessor.findUniqueOrThrow({ where: { id: repasseId }, include: { professor: true } });
    const rows = await prisma.movimentoCaixa.findMany({ where: { referenciaId: repasse.id } });
    assert.equal(rows.length, 1);
    const movimento = rows[0];
    assert.equal(movimento.tipo, 'SAIDA');
    assert.equal(movimento.origem, 'REPASSE_PROFESSOR');
    assert(movimento.valor.equals(repasse.valor));
    assert.equal(movimento.dataFinanceira.getTime(), repasse.dataRepasse.getTime());
    assert.equal(movimento.dataFinanceira.toISOString(), '2024-02-29T00:00:00.000Z');
    assert.equal(movimento.referenciaId, repasse.id);
    assert.equal(movimento.chaveIdempotencia, `REPASSE_PROFESSOR:${repasse.id}`);
    assert.equal(movimento.criadoPorId, adminId);
    assert.equal(movimento.descricao, `Repasse - ${repasse.professor.name} - ${repasse.competencia}`);
    assert.equal(movimento.observacao, null);
  }
  try {
    const caixaAntes = await prisma.movimentoCaixa.findMany({ orderBy: { id: 'asc' } });
    for (const [i, id] of ids.entries()) {
      await prisma.user.create({ data: {
        id, name: `Teste repasse ${i}`, username: `teste-repasse-${id}`, passwordHash: 'sem-login-por-senha',
        role: i === 0 ? 'ADMIN' : 'PROFESSOR', active: i !== 3,
      } });
      cookies[id] = `bomber_session=${(await createSession(id)).token}`;
    }
    await checkStatus('GET', '', undefined, undefined, 401);
    await checkStatus('POST', '', undefined, payload, 401);
    await checkStatus('GET', '', inativoId, undefined, 401);

    const created = (await checkStatus('POST', '', adminId, payload, 201)).repasse;
    assert.equal(await prisma.repasseProfessor.count({ where: { registradoPorId: adminId } }), 1);
    assert.equal(await prisma.movimentoCaixa.count({ where: { criadoPorId: adminId } }), 1);
    await verificarSaida(created.id);
    passedCaixa('A–K');
    const path = `/${created.id}`;
    assert.equal(created.valor, 123.45);
    assert.equal(created.dataRepasse, payload.dataRepasse);
    assert.equal(created.professorNome, 'Teste repasse 1');
    assert(!JSON.stringify(created).includes('passwordHash'));
    assert(!JSON.stringify(created).includes('sessions'));
    passed('A');
    assert.equal(created.status, 'AGUARDANDO_RECEBIMENTO');
    assert.equal(created.confirmadoPorId, null);
    assert.equal(created.confirmadoEm, null);
    passed('B');
    assert.equal(created.registradoPorId, adminId);
    for (const campo of ['registradoPorId', 'registradoEm', 'status', 'confirmadoPorId', 'confirmadoEm', 'role']) {
      await checkStatus('POST', '', adminId, { ...payload, [campo]: outroId }, 400);
    }
    passed('C');
    await checkStatus('POST', '', adminId, { ...payload, professorId: randomUUID() }, 400); passed('D');
    await checkStatus('POST', '', adminId, { ...payload, professorId: adminId }, 400); passed('E');
    await checkStatus('POST', '', adminId, { ...payload, professorId: inativoId }, 400); passed('F');
    for (const competencia of ['', '2026-00', '2026-13', '2026-9', '26-09', '2026-09\n', null, []]) {
      await checkStatus('POST', '', adminId, { ...payload, competencia }, 400);
    }
    passed('G');
    for (const valor of [0, -1, 0.001, 100000000, '123.45', null, {}, true]) {
      await checkStatus('POST', '', adminId, { ...payload, valor }, 400);
    }
    passed('H');
    for (const dataRepasse of ['2026-02-29', '2026-04-31', '2026-9-15', '2026-09-15T00:00:00Z', '0000-01-01', null, []]) {
      await checkStatus('POST', '', adminId, { ...payload, dataRepasse }, 400);
    }
    passed('I');
    await checkStatus('POST', '', adminId, { ...payload, formaPagamento: 'CARTAO' }, 400); passed('J');
    for (const campo of Object.keys(payload)) {
      const missing: Record<string, unknown> = { ...payload };
      delete missing[campo];
      await checkStatus('POST', '', adminId, missing, 400);
    }
    await checkStatus('POST', '', professorId, payload, 403); passed('K');
    const other = (await checkStatus('POST', '', adminId, { ...payload, professorId: outroId, formaPagamento: 'TRANSFERENCIA' }, 201)).repasse;
    const adminList = (await checkStatus('GET', '?limit=1000', adminId, undefined, 200)).repasses;
    assert(adminList.some((r: { id: string }) => r.id === created.id));
    assert(adminList.some((r: { id: string }) => r.id === other.id));
    assert.deepEqual((await checkStatus('GET', path, adminId, undefined, 200)).repasse, created);
    passed('L');
    const own = (await checkStatus('GET', '', professorId, undefined, 200)).repasses;
    assert.equal(own.length, 1);
    assert(own.every((r: { professorId: string }) => r.professorId === professorId));
    await checkStatus('GET', `?professorId=${outroId}`, professorId, undefined, 403);
    passed('M');
    const forbidden = await checkStatus('GET', `/${other.id}`, professorId, undefined, 404);
    assert.deepEqual(forbidden, await checkStatus('GET', '/inexistente', professorId, undefined, 404));
    await checkStatus('POST', `/${other.id}/confirmacao`, professorId, {}, 404);
    passed('N');
    await checkStatus('POST', `${path}/confirmacao`, professorId, { confirmadoPorId: outroId }, 400);
    const antesConfirmacao = await movimentos();
    const confirmed = (await checkStatus('POST', `${path}/confirmacao`, professorId, {}, 200)).repasse;
    assert.deepEqual(await movimentos(), antesConfirmacao);
    passedCaixa('N–O');
    passed('O');
    assert.equal(confirmed.status, 'RECEBIMENTO_CONFIRMADO');
    assert.equal(confirmed.confirmadoPorId, professorId);
    assert(Number.isFinite(Date.parse(confirmed.confirmadoEm)));
    for (const campo of ['professorId', 'competencia', 'valor', 'dataRepasse', 'formaPagamento', 'registradoPorId', 'registradoEm']) {
      assert.equal(confirmed[campo], created[campo]);
    }
    const persisted = await prisma.repasseProfessor.findUniqueOrThrow({ where: { id: created.id } });
    assert.equal(persisted.confirmadoEm?.toISOString(), confirmed.confirmadoEm);
    assert.equal(persisted.confirmadoPorId, professorId);
    passed('P');
    assert.deepEqual((await checkStatus('POST', `${path}/confirmacao`, professorId, undefined, 200)).repasse, confirmed);
    assert.deepEqual(await movimentos(), antesConfirmacao);
    passedCaixa('P');
    passed('Q');

    const concurrent = (await checkStatus('POST', '', adminId, { ...payload, formaPagamento: 'DINHEIRO', valor: 99999999.99 }, 201)).repasse;
    await verificarSaida(concurrent.id);
    const antesConcorrencia = await movimentos();
    // Segura a linha até as duas requisições estarem esperando no PostgreSQL.
    let release!: () => void;
    let locked!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const ready = new Promise<void>((resolve) => { locked = resolve; });
    const blocker = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM repasses_professores WHERE id = ${concurrent.id} FOR UPDATE`;
      locked();
      await gate;
    }, { timeout: 15000 });
    let requests: ReturnType<typeof request>[] = [];
    try {
      await Promise.race([ready, blocker]);
      requests = [1, 2].map(() => request('POST', `/${concurrent.id}/confirmacao`, professorId, {}));
      const deadline = Date.now() + 3500;
      let waiting = 0;
      do {
        const [activity] = await prisma.$queryRaw<{ count: bigint }[]>`
          SELECT count(*) FROM pg_stat_activity
          WHERE datname = current_database() AND pid <> pg_backend_pid()
            AND wait_event_type = 'Lock' AND query LIKE '%repasses_professores%FOR UPDATE%'
        `;
        waiting = Number(activity.count);
        if (waiting < 2) await new Promise((resolve) => setTimeout(resolve, 20));
      } while (waiting < 2 && Date.now() < deadline);
      assert(waiting >= 2, 'Duas confirmações devem estar simultaneamente aguardando o lock.');
    } finally {
      release();
      await blocker;
      await Promise.allSettled(requests);
    }
    const responses = await Promise.all(requests);
    assert(responses.every((r) => r.status === 200));
    assert.equal(responses[0].body.repasse.status, 'RECEBIMENTO_CONFIRMADO');
    assert.deepEqual(responses[0].body, responses[1].body);
    const receipt = await prisma.repasseProfessor.findUniqueOrThrow({ where: { id: concurrent.id } });
    assert.equal(receipt.confirmadoEm?.toISOString(), responses[0].body.repasse.confirmadoEm);
    assert.equal(receipt.confirmadoPorId, professorId);
    assert.deepEqual((await checkStatus('POST', `/${concurrent.id}/confirmacao`, professorId, {}, 200)).repasse, responses[0].body.repasse);
    assert.deepEqual(await movimentos(), antesConcorrencia);
    passedCaixa('Q');
    passed('R');
    await checkStatus('POST', `${path}/confirmacao`, adminId, {}, 403);
    await checkStatus('POST', `/${other.id}/confirmacao`, adminId, {}, 403);
    passed('S');

    for (const query of ['status=INVALIDO', 'competencia=2026-13', 'dataInicio=2026-02-30', 'dataInicio=2026-10-01&dataFim=2026-09-01', 'limit=0', 'limit=1001', 'offset=-1', 'limit=1&limit=2', 'status[x]=a']) {
      await checkStatus('GET', `?${query}`, adminId, undefined, 400);
    }
    const filtered = (await checkStatus('GET', `?professorId=${professorId}&status=RECEBIMENTO_CONFIRMADO&competencia=2026-09&dataInicio=2024-02-29&dataFim=2024-02-29&limit=1&offset=0`, adminId, undefined, 200)).repasses;
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].professorId, professorId);
    for (const method of ['PATCH', 'PUT', 'DELETE']) await checkStatus(method, path, adminId, {}, 404);
    const duplicate = (await checkStatus('POST', '', adminId, payload, 201)).repasse;
    assert.notEqual(duplicate.id, created.id);
    assert.equal(await prisma.repasseProfessor.count({ where: {
      professorId, competencia: payload.competencia, valor: payload.valor,
      dataRepasse: new Date(`${payload.dataRepasse}T00:00:00.000Z`),
    } }), 2);
    await verificarSaida(created.id);
    await verificarSaida(duplicate.id);
    await verificarSaida(other.id);
    passedCaixa('R–S');

    // Falha real de FK no INSERT do movimento, injetada somente nesta requisição.
    // O repasse existe dentro da transação antes da falha e deve desaparecer no rollback.
    const repassesAntesFalha = await prisma.repasseProfessor.findMany({ where: { registradoPorId: adminId }, orderBy: { id: 'asc' } });
    const caixaAntesFalha = await movimentos();
    let repasseRevertido: string | undefined;
    const originalTransaction = prisma.$transaction;
    const transaction = originalTransaction.bind(prisma);
    // Prisma usa propriedades dinâmicas; o proxy mantém a transação real e só troca o FK do INSERT.
    prisma.$transaction = ((operation, options) => transaction(async (tx) => operation(new Proxy(tx, {
      get(target, property, receiver) {
        if (property !== 'movimentoCaixa') return Reflect.get(target, property, receiver);
        return new Proxy(target.movimentoCaixa, {
          get(delegate, method, delegateReceiver) {
            if (method !== 'create') return Reflect.get(delegate, method, delegateReceiver);
            return async (args) => {
              repasseRevertido = args.data.referenciaId;
              assert(await tx.repasseProfessor.findUnique({ where: { id: repasseRevertido } }));
              return delegate.create({ ...args, data: { ...args.data, criadoPorId: randomUUID() } });
            };
          },
        });
      },
    })), options)) as typeof prisma.$transaction;
    const errorMock = t.mock.method(console, 'error', () => {});
    try {
      const failure = await checkStatus('POST', '', adminId, payload, 500);
      assert.equal(failure.repasse, undefined);
      assert(repasseRevertido, 'A falha deve acontecer após a criação transacional do repasse.');
      assert.equal(errorMock.mock.calls.length, 1);
      assert.equal((errorMock.mock.calls[0].arguments[1] as { code: string }).code, 'P2003');
    } finally {
      prisma.$transaction = originalTransaction;
      errorMock.mock.restore();
    }
    assert.equal(await prisma.repasseProfessor.findUnique({ where: { id: repasseRevertido } }), null);
    assert.deepEqual(await prisma.repasseProfessor.findMany({ where: { registradoPorId: adminId }, orderBy: { id: 'asc' } }), repassesAntesFalha);
    assert.deepEqual(await movimentos(), caixaAntesFalha);
    assert.equal(await prisma.movimentoCaixa.count({ where: { referenciaId: repasseRevertido } }), 0);
    passedCaixa('L–M');

    assert.equal(await prisma.repasseProfessor.count({ where: { registradoPorId: adminId } }), 4);
    assert.equal(await prisma.movimentoCaixa.count({ where: { criadoPorId: adminId } }), 4);
    assert.deepEqual((await movimentos()).filter((m) => m.criadoPorId !== adminId), caixaAntes);
    const service = await readFile(new URL('../services/repasses.service.ts', import.meta.url), 'utf8');
    assert(!/localStorage|financeService/.test(service));
    passedCaixa('T — backend sem localStorage');
    passed('T adaptado: uma SAÍDA por criação; zero novos movimentos na confirmação');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    try {
      await prisma.$transaction(async (tx) => {
        await tx.movimentoCaixa.deleteMany({ where: { criadoPorId: adminId } });
        await tx.repasseProfessor.deleteMany({ where: { registradoPorId: adminId } });
        await tx.session.deleteMany({ where: { userId: { in: ids } } });
        await tx.user.deleteMany({ where: { id: { in: ids } } });
      });
      assert.equal(await prisma.user.count({ where: { id: { in: ids } } }), 0);
      assert.equal(await prisma.repasseProfessor.count({ where: { registradoPorId: adminId } }), 0);
      assert.equal(await prisma.movimentoCaixa.count({ where: { criadoPorId: adminId } }), 0);
      assert.equal(await prisma.session.count({ where: { userId: { in: ids } } }), 0);
      console.log('Cleanup confirmado: usuários, sessões, repasses e movimentos temporários removidos.');
    } finally { await prisma.$disconnect(); }
  }
});
