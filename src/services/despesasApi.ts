export type DespesaCategoriaTecnica =
  | 'PROFESSORES'
  | 'ENERGIA'
  | 'AGUA'
  | 'INTERNET'
  | 'ALUGUEL'
  | 'MANUTENCAO'
  | 'EQUIPAMENTOS'
  | 'PRODUTOS_MATERIAL'
  | 'IMPOSTOS_TAXAS'
  | 'OUTROS';

export type DespesaStatus = 'PENDENTE' | 'PAGA';

export interface DespesaApiShape {
  id: string;
  descricao: string;
  categoria: DespesaCategoriaTecnica;
  valor: number;
  dataDespesa: string; // YYYY-MM-DD
  status: DespesaStatus;
  criadoPorId: string;
  criadoPorNome: string | null;
  createdAt: string; // ISO
  dataPagamento?: string | null;
  formaPagamento?: string | null;
  pagoPorId?: string | null;
  pagoPorNome?: string | null;
  pagoEm?: string | null;
  observacao?: string | null;
}

export interface DespesaFrontend {
  id: string;
  descricao: string;
  categoria: string; // label amigável
  valor: number;
  data: string; // YYYY-MM-DD (mapped from dataDespesa)
  status: DespesaStatus;
  criadoPorId: string;
  criadoPorNome: string | null;
  criadoEm: string; // ISO (from createdAt)
  dataPagamento?: string | null;
  formaPagamento?: string | null;
  pagoPorId?: string | null;
  pagoPorNome?: string | null;
  pagoEm?: string | null;
  observacao?: string | null;
}

export const TECH_TO_LABEL: Record<DespesaCategoriaTecnica, string> = {
  PROFESSORES: 'Professores',
  ENERGIA: 'Energia',
  AGUA: 'Água',
  INTERNET: 'Internet',
  ALUGUEL: 'Aluguel',
  MANUTENCAO: 'Manutenção',
  EQUIPAMENTOS: 'Equipamentos',
  PRODUTOS_MATERIAL: 'Produtos/Material',
  IMPOSTOS_TAXAS: 'Impostos/Taxas',
  OUTROS: 'Outros',
};

export const LABEL_TO_TECH: Record<string, DespesaCategoriaTecnica> = Object.entries(TECH_TO_LABEL).reduce((acc, [tech, label]) => {
  acc[label] = tech as DespesaCategoriaTecnica;
  acc[tech] = tech as DespesaCategoriaTecnica; // accept technical as-is
  return acc;
}, {} as Record<string, DespesaCategoriaTecnica>);

export const CATEGORIES_LABELS: string[] = Object.values(TECH_TO_LABEL);

export class DespesasApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new DespesasApiError(body?.message || `Não foi possível consultar Despesas (HTTP ${response.status}).`, response.status);
  }
  return response.json();
}

function serialize(apiObj: DespesaApiShape): DespesaFrontend {
  return {
    id: apiObj.id,
    descricao: apiObj.descricao,
    categoria: TECH_TO_LABEL[apiObj.categoria],
    valor: apiObj.valor,
    data: apiObj.dataDespesa,
    status: apiObj.status,
    criadoPorId: apiObj.criadoPorId,
    criadoPorNome: apiObj.criadoPorNome ?? null,
    criadoEm: apiObj.createdAt,
    dataPagamento: apiObj.dataPagamento ?? null,
    formaPagamento: apiObj.formaPagamento ?? null,
    pagoPorId: apiObj.pagoPorId ?? null,
    pagoPorNome: apiObj.pagoPorNome ?? null,
    pagoEm: apiObj.pagoEm ?? null,
    observacao: apiObj.observacao ?? null,
  };
}

export async function listarDespesas(filters: { status?: DespesaStatus; categoria?: string; dataInicio?: string; dataFim?: string; limit?: number; offset?: number } = {}) {
  const query = new URLSearchParams();
  const f: any = { ...filters };
  if (f.categoria) {
    const cat = LABEL_TO_TECH[f.categoria];
    if (!cat) throw new Error('categoria inválida');
    f.categoria = cat;
  }
  for (const [k, v] of Object.entries(f)) if (v !== undefined) query.set(k, String(v));
  const res = await readResponse<{ despesas: DespesaApiShape[] }>(await fetch(`/api/despesas?${query.toString()}`, { credentials: 'include' }));
  return res.despesas.map(serialize);
}

export async function getDespesa(id: string) {
  const res = await readResponse<{ despesa: DespesaApiShape }>(await fetch(`/api/despesas/${encodeURIComponent(id)}`, { credentials: 'include' }));
  return serialize(res.despesa);
}

export async function criarDespesa(payload: { descricao: string; categoria: string; valor: number; data: string }) {
  if (!payload || typeof payload !== 'object') throw new Error('payload inválido');
  const { descricao, categoria, valor, data } = payload;
  if (!descricao || typeof descricao !== 'string') throw new Error('descricao inválida');
  if (categoria === undefined || typeof categoria !== 'string') throw new Error('categoria inválida');
  const categoriaTec = LABEL_TO_TECH[categoria];
  if (!categoriaTec) throw new Error('categoria inválida');
  if (valor === undefined || typeof valor !== 'number') throw new Error('valor inválido');
  if (!data || typeof data !== 'string') throw new Error('data inválida');

  const body = { descricao, categoria: categoriaTec, valor, dataDespesa: data };
  const res = await readResponse<{ despesa: DespesaApiShape }>(await fetch('/api/despesas', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  return serialize(res.despesa);
}

export async function registrarPagamentoDespesa(id: string, payload: { dataPagamento: string; formaPagamento: string; observacao?: string }) {
  if (!id) throw new Error('id inválido');
  if (!payload || typeof payload !== 'object') throw new Error('payload inválido');
  const { dataPagamento, formaPagamento, observacao } = payload as any;
  if (!dataPagamento || typeof dataPagamento !== 'string') throw new Error('dataPagamento inválida');
  if (!formaPagamento || typeof formaPagamento !== 'string') throw new Error('formaPagamento inválida');
  if (observacao !== undefined && typeof observacao !== 'string') throw new Error('observacao inválida');

  const res = await readResponse<{ despesa: DespesaApiShape; message?: string }>(await fetch(`/api/despesas/${encodeURIComponent(id)}/pagamento`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataPagamento, formaPagamento, observacao }),
  }));
  return { despesa: serialize(res.despesa), message: (res as any).message };
}
