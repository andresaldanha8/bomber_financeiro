import { FormaPagamento } from '../types';

export type RegisterPaymentPayload = {
  formaPagamento: FormaPagamento;
  dataPagamento: string; // YYYY-MM-DD
  observacao?: string;
};

export type PagamentoApi = {
  id: string;
  mensalidadeId: string;
  valor: number | string;
  formaPagamento: FormaPagamento;
  dataPagamento?: string | null;
  informadoPorId?: string | null;
  informadoPorNome?: string | null;
  informadoEm?: string | null;
  observacao?: string | null;
  statusConfirmacao?: 'AGUARDANDO' | 'CONFIRMADO' | 'ESTORNADO';
  createdAt?: string;
  updatedAt?: string;
};

export type GetPaymentsFilters = {
  mensalidadeId?: string;
  statusConfirmacao?: 'AGUARDANDO' | 'CONFIRMADO';
  formaPagamento?: FormaPagamento;
};

async function handleResponse(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.message || `Erro HTTP ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function registerStudentPayment(mensalidadeId: string, payload: RegisterPaymentPayload) {
  const res = await fetch(`/api/mensalidades/${encodeURIComponent(mensalidadeId)}/pagamentos`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}

export async function getPayments(filters?: GetPaymentsFilters): Promise<PagamentoApi[]> {
  const params = new URLSearchParams();
  if (filters?.mensalidadeId) params.set('mensalidadeId', filters.mensalidadeId);
  if (filters?.statusConfirmacao) params.set('statusConfirmacao', filters.statusConfirmacao);
  if (filters?.formaPagamento) params.set('formaPagamento', filters.formaPagamento);

  const url = `/api/pagamentos${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, { method: 'GET', credentials: 'include' });
  const data = await handleResponse(res);
  return data.pagamentos as PagamentoApi[];
}

export async function getPaymentById(id: string): Promise<PagamentoApi> {
  const res = await fetch(`/api/pagamentos/${encodeURIComponent(id)}`, { method: 'GET', credentials: 'include' });
  const data = await handleResponse(res);
  return data.pagamento as PagamentoApi;
}

export async function confirmPayment(pagamentoId: string) {
  const res = await fetch(`/api/pagamentos/${encodeURIComponent(pagamentoId)}/confirmar`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse(res);
}

const pagamentosApi = {
  registerStudentPayment,
  getPayments,
  getPaymentById,
  confirmPayment,
};

export default pagamentosApi;
