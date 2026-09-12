import { Mensalidade as LegacyMensalidade } from '../types';

export type MensalidadeApi = {
  id: string;
  studentId: string;
  competencia: string; // "Setembro/2026"
  anoMes?: string; // optional
  valor: string | number; // Decimal comes as string from server in many setups
  dataVencimento: string; // YYYY-MM-DD
  isPagamentoInicial: boolean;
  diaBaseNaGeracao?: number | null;
  status: 'PENDENTE' | 'AGUARDANDO_CONFIRMACAO' | 'QUITADA' | 'ATRASADA';
  createdAt?: string;
  updatedAt?: string;
};

type QueryFilters = {
  studentId?: string;
  status?: string;
  competencia?: string;
};

async function handleResponse(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || 'Erro ao consultar mensalidades.');
  }
  return res.json();
}

export async function getMensalidadesByStudent(studentId: string): Promise<MensalidadeApi[]> {
  const res = await fetch(`/api/students/${encodeURIComponent(studentId)}/mensalidades`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await handleResponse(res);
  return data.mensalidades as MensalidadeApi[];
}

export async function getMensalidadeById(id: string): Promise<MensalidadeApi> {
  const res = await fetch(`/api/mensalidades/${encodeURIComponent(id)}`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await handleResponse(res);
  return data.mensalidade as MensalidadeApi;
}

export async function queryMensalidades(filters?: QueryFilters): Promise<MensalidadeApi[]> {
  const params = new URLSearchParams();
  if (filters?.studentId) params.set('studentId', filters.studentId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.competencia) params.set('competencia', filters.competencia);

  const url = `/api/mensalidades${params.toString() ? `?${params.toString()}` : ''}`;

  const res = await fetch(url, { method: 'GET', credentials: 'include' });
  const data = await handleResponse(res);
  return data.mensalidades as MensalidadeApi[];
}

export default {
  getMensalidadesByStudent,
  getMensalidadeById,
  queryMensalidades,
};
