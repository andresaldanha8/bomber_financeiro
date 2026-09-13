export type CashMovementType = 'SALDO_INICIAL' | 'ENTRADA' | 'SAIDA';
export type CashMovementOrigin = 'SALDO_INICIAL' | 'PAGAMENTO_ALUNO' | 'DESPESA' | 'REPASSE_PROFESSOR' | 'ADIANTAMENTO_PROFESSOR' | 'ESTORNO' | 'AJUSTE';

export interface CashSummary {
  saldoDisponivel: number;
  saldoInicial: number;
  entradasMes: number;
  saidasMes: number;
  resultadoMes: number;
  periodoInicio: string;
  periodoFim: string;
  statusPeriodo: 'CAIXA_ABERTO' | 'PERIODO_ENCERRADO';
}

export interface CashMovement {
  id: string;
  tipo: CashMovementType;
  origem: CashMovementOrigin;
  valor: string | number;
  dataFinanceira: string;
  descricao: string | null;
  referenciaId: string | null;
  observacao: string | null;
  criadoPorId: string;
  criadoPorNome: string | null;
  createdAt: string;
}

export interface CashMovementDetail extends Omit<CashMovement, 'criadoPorNome'> {
  chaveIdempotencia: string;
  criadoPor?: { id: string; name: string };
}

export interface CashMovementFilters {
  tipo?: CashMovementType;
  origem?: CashMovementOrigin;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
  offset?: number;
}

export interface InitialBalancePayload {
  valor: number;
  dataFinanceira: string;
  observacao?: string;
}

export class CashApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new CashApiError(body?.message || `Não foi possível consultar o Caixa (HTTP ${response.status}).`, response.status);
  }
  return response.json();
}

export async function getCashSummary(mes?: string): Promise<CashSummary> {
  const query = mes ? `?${new URLSearchParams({ mes })}` : '';
  return readResponse(await fetch(`/api/caixa/resumo${query}`, { credentials: 'include' }));
}

export async function getCashMovements(filters: CashMovementFilters = {}): Promise<CashMovement[]> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined) query.set(key, String(value));
  return readResponse(await fetch(`/api/caixa/movimentos?${query}`, { credentials: 'include' }));
}

export async function getCashMovementById(id: string): Promise<CashMovementDetail> {
  return readResponse(await fetch(`/api/caixa/movimentos/${encodeURIComponent(id)}`, { credentials: 'include' }));
}

export async function createInitialBalance(payload: InitialBalancePayload): Promise<CashMovementDetail> {
  return readResponse(await fetch('/api/caixa/saldo-inicial', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
}
