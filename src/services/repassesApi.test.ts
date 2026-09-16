import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { repassesApi, RepassesApiError, type RepasseProfessor } from './repassesApi';

// Executar: npx tsx --test src/services/repassesApi.test.ts (sem banco ou servidor).
test('Cliente de repasses: contrato, paginação, cancelamento e erros (B–J)', async (t) => {
  const repasse: RepasseProfessor = {
    id: 'r1', professorId: 'p1', professorNome: 'Professor', competencia: '2026-09',
    valor: 123.45, dataRepasse: '2026-09-15', formaPagamento: 'PIX',
    status: 'AGUARDANDO_RECEBIMENTO', registradoPorId: 'a1', registradoPorNome: 'Admin',
    registradoEm: '2026-09-15T13:00:00.000Z', confirmadoPorId: null, confirmadoPorNome: null, confirmadoEm: null,
  };
  const calls: { url: URL; init: RequestInit }[] = [];
  let respond = (_url: URL, _init: RequestInit): Response => Response.json({ repasses: [repasse] });
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    const parsed = new URL(url, 'http://localhost');
    calls.push({ url: parsed, init });
    return respond(parsed, init);
  });
  const signal = new AbortController().signal;
  const filters = { status: 'AGUARDANDO_RECEBIMENTO' as const, competencia: '2026-09',
    dataInicio: '2026-09-01', dataFim: '2026-09-30', professorId: 'p & 1', limit: 7, offset: 0 };
  assert.deepEqual(await repassesApi.list(filters, signal), [repasse]);
  assert.deepEqual(Object.fromEntries(calls.at(-1)!.url.searchParams),
    Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, String(value)])));
  await repassesApi.list({ status: undefined }, signal);
  assert.equal(calls.at(-1)!.url.search, '');
  assert.equal(calls.at(-1)!.url.pathname, '/api/repasses');

  const start = calls.length;
  respond = (url) => {
    const offset = Number(url.searchParams.get('offset'));
    assert.equal(url.searchParams.get('limit'), '1000');
    assert.equal(url.searchParams.get('competencia'), '2026-09');
    assert.equal(url.searchParams.get('status'), filters.status);
    assert(!url.searchParams.has('professorId'));
    return Response.json({ repasses: Array.from({ length: offset < 2000 ? 1000 : 3 }, (_, i) => ({ ...repasse, id: `r${offset + i}` })) });
  };
  const all = await repassesApi.listAll({ competencia: filters.competencia, status: filters.status }, signal);
  assert.equal(all.length, 2003);
  assert.deepEqual(calls.slice(start).map((c) => c.url.searchParams.get('offset')), ['0', '1000', '2000']);
  assert.equal(all[2002].id, 'r2002');
  respond = () => Response.json({ repasses: [] });
  assert.deepEqual(await repassesApi.listAll({}, signal), []);
  const fullPage = Array.from({ length: 1000 }, (_, i) => ({ ...repasse, id: `r${i}` }));
  respond = () => Response.json({ repasses: fullPage });
  await assert.rejects(repassesApi.listAll({}, signal), /sem progresso/);
  respond = (url) => Response.json({ repasses: url.searchParams.get('offset') === '0' ? fullPage : [] });
  const exactStart = calls.length;
  assert.equal((await repassesApi.listAll({}, signal)).length, 1000);
  assert.equal(calls.length - exactStart, 2);

  respond = () => Response.json({ repasse });
  const input = { professorId: 'p1', competencia: '2026-09', valor: 123.45,
    dataRepasse: '2026-09-15', formaPagamento: 'PIX' as const };
  const created = await repassesApi.create({ ...input, status: 'IGNORAR', registradoPorId: 'forjado' } as typeof input, signal);
  assert.deepEqual(created, repasse);
  assert.deepEqual(JSON.parse(calls.at(-1)!.init.body as string), input);
  assert.equal(calls.at(-1)!.init.method, 'POST');
  assert.equal(created.dataRepasse, input.dataRepasse);
  assert.equal(typeof created.valor, 'number');
  assert.equal(created.registradoEm, repasse.registradoEm);
  assert.equal(created.confirmadoEm, null);
  assert.deepEqual(await repassesApi.getById('id/a b', signal), repasse);
  assert.equal(calls.at(-1)!.url.pathname, '/api/repasses/id%2Fa%20b');
  assert.equal(calls.at(-1)!.init.method, 'GET');
  const confirmed = { ...repasse, status: 'RECEBIMENTO_CONFIRMADO', confirmadoPorId: 'p1', confirmadoPorNome: 'Professor', confirmadoEm: '2026-09-16T12:00:00.000Z' };
  respond = () => Response.json({ repasse: confirmed });
  assert.deepEqual(await repassesApi.confirmReceipt('id/a b', signal), confirmed);
  assert.equal(calls.at(-1)!.url.pathname, '/api/repasses/id%2Fa%20b/confirmacao');
  assert.equal(calls.at(-1)!.init.method, 'POST');
  assert.equal(calls.at(-1)!.init.body, undefined);
  for (const call of calls) {
    assert.equal(call.init.credentials, 'include');
    assert.equal(call.init.signal, signal);
  }

  for (const status of [400, 401, 403, 404, 500]) {
    respond = () => Response.json({ message: 'Mensagem do backend.' }, { status });
    await assert.rejects(repassesApi.list(), (error) => error instanceof RepassesApiError && error.status === status && error.message === 'Mensagem do backend.');
  }
  respond = () => new Response('indisponível', { status: 503 });
  await assert.rejects(repassesApi.list(), (error) => error instanceof RepassesApiError && error.status === 503 && error.message.includes('HTTP 503'));
  respond = () => { throw new TypeError('fetch failed'); };
  await assert.rejects(repassesApi.list(), /Não foi possível conectar/);

  const controller = new AbortController();
  const reason = new DOMException('Cancelado', 'AbortError');
  respond = () => {
    controller.abort(reason);
    return Response.json({ repasses: fullPage });
  };
  const beforeAbort = calls.length;
  await assert.rejects(repassesApi.listAll({}, controller.signal), (error) => error === reason);
  assert.equal(calls.length, beforeAbort + 1);
  await assert.rejects(repassesApi.create(input, controller.signal), (error) => error === reason);
  assert.equal(calls.length, beforeAbort + 1);
  const source = await readFile(new URL('./repassesApi.ts', import.meta.url), 'utf8');
  assert(!/localStorage|financeService|INITIAL_/.test(source));
  console.log('PASS B–J: filtros, páginas, término, AbortSignal, POSTs, erros e transporte sem fallback.');
});
