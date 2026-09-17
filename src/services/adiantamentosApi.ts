import { AdiantamentoProfessor, StatusAdiantamento, AdiantamentoFormaPagamento } from '../types';

export interface AdiantamentosFilters {
  professorId?: string; // Somente ADMIN
  status?: StatusAdiantamento;
  limit?: number;
  offset?: number;
}

export interface CreateAdiantamentoInput {
  valor: number;
  motivo?: string;
}

export interface RecusarAdiantamentoInput {
  motivoRecusa: string;
}

export interface RegistrarPagamentoAdiantamentoInput {
  dataPagamento: string;
  formaPagamento: AdiantamentoFormaPagamento;
  observacaoPagamento?: string;
}

export class AdiantamentosApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

async function request<T>(path: string, method: string, signal?: AbortSignal, body?: unknown): Promise<T> {
  signal?.throwIfAborted();
  let response: Response;
  try {
    response = await fetch(`/api/adiantamentos${path}`, {
      method, credentials: 'include', signal,
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Não foi possível conectar ao servidor.');
  }
  const data = await response.json().catch(() => null);
  signal?.throwIfAborted();
  if (!response.ok) {
    throw new AdiantamentosApiError(
      typeof data?.message === 'string' && data.message.trim()
        ? data.message : `Não foi possível concluir a operação de adiantamentos (HTTP ${response.status}).`,
      response.status,
    );
  }
  if (!data) throw new Error('Resposta inválida do servidor.');
  return data as T;
}

async function list(filters: AdiantamentosFilters = {}, signal?: AbortSignal): Promise<AdiantamentoProfessor[]> {
  const query = new URLSearchParams();
  for (const key of ['professorId', 'status', 'limit', 'offset'] as const) {
    const value = (filters as any)[key];
    if (value !== undefined) query.set(key, String(value));
  }
  const result = await request<{ adiantamentos: AdiantamentoProfessor[] }>(query.size ? `?${query}` : '', 'GET', signal);
  if (!Array.isArray(result.adiantamentos)) throw new Error('Resposta inválida do servidor.');
  return result.adiantamentos;
}

async function listAll(filters: Omit<AdiantamentosFilters, 'limit' | 'offset'> = {}, signal?: AbortSignal): Promise<AdiantamentoProfessor[]> {
  const result: AdiantamentoProfessor[] = [];
  const seen = new Set<string>();
  const limit = 1000;
  for (let offset = 0; offset <= 2147483647; offset += limit) {
    signal?.throwIfAborted();
    const page = await list({ ...filters, limit, offset }, signal);
    if (page.length > limit || (page.length === limit && page.every((row) => seen.has(row.id)))) {
      throw new Error('Paginação de adiantamentos sem progresso ou inválida.');
    }
    result.push(...page);
    if (page.length < limit) return result;
    page.forEach((row) => seen.add(row.id));
  }
  throw new Error('Limite de paginação de adiantamentos excedido.');
}

async function getById(id: string, signal?: AbortSignal): Promise<AdiantamentoProfessor> {
  return (await request<{ adiantamento: AdiantamentoProfessor }>(`/${encodeURIComponent(id)}`, 'GET', signal)).adiantamento;
}

async function create(input: CreateAdiantamentoInput, signal?: AbortSignal): Promise<AdiantamentoProfessor> {
  const { valor, motivo } = input;
  return (await request<{ adiantamento: AdiantamentoProfessor }>(``, 'POST', signal, { valor, motivo })).adiantamento;
}

async function recusar(id: string, input: RecusarAdiantamentoInput, signal?: AbortSignal): Promise<AdiantamentoProfessor> {
  return (await request<{ adiantamento: AdiantamentoProfessor }>(`/${encodeURIComponent(id)}/recusa`, 'POST', signal, input)).adiantamento;
}

async function registrarPagamento(id: string, input: RegistrarPagamentoAdiantamentoInput, signal?: AbortSignal): Promise<AdiantamentoProfessor> {
  return (await request<{ adiantamento: AdiantamentoProfessor }>(`/${encodeURIComponent(id)}/pagamento`, 'POST', signal, input)).adiantamento;
}

async function confirmReceipt(id: string, signal?: AbortSignal): Promise<AdiantamentoProfessor> {
  return (await request<{ adiantamento: AdiantamentoProfessor }>(`/${encodeURIComponent(id)}/confirmacao`, 'POST', signal)).adiantamento;
}

export const adiantamentosApi = { list, listAll, getById, create, recusar, registrarPagamento, confirmReceipt };
