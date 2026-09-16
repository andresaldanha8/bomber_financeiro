export type RepasseProfessorStatus = 'AGUARDANDO_RECEBIMENTO' | 'RECEBIMENTO_CONFIRMADO';
export type RepasseFormaPagamento = 'PIX' | 'DINHEIRO' | 'TRANSFERENCIA';

export interface RepasseProfessor {
  id: string;
  professorId: string;
  professorNome: string;
  competencia: string; // YYYY-MM
  valor: number;
  dataRepasse: string; // Data civil YYYY-MM-DD
  formaPagamento: RepasseFormaPagamento;
  status: RepasseProfessorStatus;
  registradoPorId: string;
  registradoPorNome: string;
  registradoEm: string; // ISO
  confirmadoPorId: string | null;
  confirmadoPorNome: string | null;
  confirmadoEm: string | null; // ISO
}

export interface CriarRepasseInput {
  professorId: string;
  competencia: string;
  valor: number;
  dataRepasse: string;
  formaPagamento: RepasseFormaPagamento;
}

export interface RepassesFilters {
  status?: RepasseProfessorStatus;
  competencia?: string;
  dataInicio?: string;
  dataFim?: string;
  professorId?: string; // Somente ADMIN; nunca preenchido automaticamente.
  limit?: number;
  offset?: number;
}

export class RepassesApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

async function request<T>(path: string, method: string, signal?: AbortSignal, body?: CriarRepasseInput): Promise<T> {
  signal?.throwIfAborted();
  let response: Response;
  try {
    response = await fetch(`/api/repasses${path}`, {
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
    throw new RepassesApiError(
      typeof data?.message === 'string' && data.message.trim()
        ? data.message : `Não foi possível concluir a operação de repasses (HTTP ${response.status}).`,
      response.status,
    );
  }
  if (!data) throw new Error('Resposta inválida do servidor.');
  return data as T;
}

/** Uma única página. O isolamento por usuário é aplicado pelo backend. */
async function list(filters: RepassesFilters = {}, signal?: AbortSignal): Promise<RepasseProfessor[]> {
  const query = new URLSearchParams();
  for (const key of ['status', 'competencia', 'dataInicio', 'dataFim', 'professorId', 'limit', 'offset'] as const) {
    const value = filters[key];
    if (value !== undefined) query.set(key, String(value));
  }
  const result = await request<{ repasses: RepasseProfessor[] }>(query.size ? `?${query}` : '', 'GET', signal);
  if (!Array.isArray(result.repasses)) throw new Error('Resposta inválida do servidor.');
  return result.repasses;
}

/** Coleção completa: controla a própria paginação, começando no offset zero. */
async function listAll(filters: Omit<RepassesFilters, 'limit' | 'offset'> = {}, signal?: AbortSignal): Promise<RepasseProfessor[]> {
  const result: RepasseProfessor[] = [];
  const seen = new Set<string>();
  const limit = 1000;
  for (let offset = 0; offset <= 2147483647; offset += limit) {
    signal?.throwIfAborted();
    const page = await list({ ...filters, limit, offset }, signal);
    if (page.length > limit || (page.length === limit && page.every((row) => seen.has(row.id)))) {
      throw new Error('Paginação de repasses sem progresso ou inválida.');
    }
    result.push(...page);
    if (page.length < limit) return result;
    page.forEach((row) => seen.add(row.id));
  }
  throw new Error('Limite de paginação de repasses excedido.');
}

async function getById(id: string, signal?: AbortSignal): Promise<RepasseProfessor> {
  return (await request<{ repasse: RepasseProfessor }>(`/${encodeURIComponent(id)}`, 'GET', signal)).repasse;
}

async function create(input: CriarRepasseInput, signal?: AbortSignal): Promise<RepasseProfessor> {
  const { professorId, competencia, valor, dataRepasse, formaPagamento } = input;
  return (await request<{ repasse: RepasseProfessor }>('', 'POST', signal, {
    professorId, competencia, valor, dataRepasse, formaPagamento,
  })).repasse;
}

async function confirmReceipt(id: string, signal?: AbortSignal): Promise<RepasseProfessor> {
  return (await request<{ repasse: RepasseProfessor }>(`/${encodeURIComponent(id)}/confirmacao`, 'POST', signal)).repasse;
}

export const repassesApi = { list, listAll, getById, create, confirmReceipt };
