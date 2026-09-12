import { FormaPagamento } from '../types';

export type RegisterPaymentPayload = {
  formaPagamento: FormaPagamento;
  dataPagamento: string; // YYYY-MM-DD
  observacao?: string;
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

export default { registerStudentPayment };
