import { Aluno } from '../types';

type EntryCondition = 'INDIVIDUAL' | 'DUPLA' | 'TRIO_MAIS';

interface ApiStudent {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  entryCondition: EntryCondition;
  dueDay: number;
  entryDate: string;
  status: 'ATIVO' | 'INATIVO';
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    username: string;
    role: 'ADMIN' | 'PROFESSOR';
  };
}

interface StudentsResponse {
  students: ApiStudent[];
}

function entryConditionToPlanoId(
  entryCondition: EntryCondition,
): string {
  switch (entryCondition) {
    case 'DUPLA':
      return 'plano-dupla';

    case 'TRIO_MAIS':
      return 'plano-trio';

    case 'INDIVIDUAL':
    default:
      return 'plano-individual';
  }
}

export function planoIdToEntryCondition(
  planoId: string,
): EntryCondition {
  switch (planoId) {
    case 'plano-dupla':
      return 'DUPLA';

    case 'plano-trio':
      return 'TRIO_MAIS';

    case 'plano-individual':
    default:
      return 'INDIVIDUAL';
  }
}

function apiStudentToAluno(student: ApiStudent): Aluno {
  return {
    id: student.id,
    nome: student.name,
    telefone: student.phone ?? '',
    dataEntrada: student.entryDate.slice(0, 10),
    diaVencimento: student.dueDay,
    planoId: entryConditionToPlanoId(student.entryCondition),

    // Campo mantido temporariamente apenas por compatibilidade
    // com a interface Aluno existente.
    // O valor financeiro real deverá vir de Mensalidade.valor.
    valorMensalidade: 80,

    status: student.status,
    observacao: student.notes ?? undefined,
    criadoPorId: student.createdBy.id,
    criadoPorNome: student.createdBy.name,
    criadoEm: student.createdAt,
  };
}

export async function getStudents(): Promise<Aluno[]> {
  const response = await fetch('/api/students', {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.message || 'Não foi possível carregar os alunos.',
    );
  }

  const data = (await response.json()) as StudentsResponse;

  return data.students.map(apiStudentToAluno);
}

export interface CreateStudentInput {
  nome: string;
  telefone: string;
  dataEntrada: string;
  diaVencimento: number;
  planoId: string;
  observacao?: string;
}

export interface UpdateStudentInput {
  nome?: string;
  telefone?: string;
  observacao?: string;
  dataEntrada?: string;
  diaVencimento?: number;
  planoId?: string;
  status?: 'ATIVO' | 'INATIVO';
}

export async function createStudent(
  input: CreateStudentInput,
): Promise<Aluno> {
  const response = await fetch('/api/students', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      name: input.nome,
      phone: input.telefone || null,
      notes: input.observacao || null,
      entryCondition: planoIdToEntryCondition(input.planoId),
      dueDay: input.diaVencimento,
      entryDate: input.dataEntrada,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.message || 'Não foi possível cadastrar o aluno.',
    );
  }

  const data = (await response.json()) as {
    student: ApiStudent;
  };

  return apiStudentToAluno(data.student);
}

export async function updateStudent(
  id: string,
  input: UpdateStudentInput,
): Promise<Aluno> {
  const body: Record<string, unknown> = {};

  if (input.nome !== undefined) {
    body.name = input.nome;
  }

  if (input.telefone !== undefined) {
    body.phone = input.telefone || null;
  }

  if (input.observacao !== undefined) {
    body.notes = input.observacao || null;
  }

  if (input.dataEntrada !== undefined) {
    body.entryDate = input.dataEntrada;
  }

  if (input.diaVencimento !== undefined) {
    body.dueDay = input.diaVencimento;
  }

  if (input.planoId !== undefined) {
    body.entryCondition = planoIdToEntryCondition(input.planoId);
  }

  if (input.status !== undefined) {
    body.status = input.status;
  }

  const response = await fetch(`/api/students/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const responseBody = await response.json().catch(() => null);

    throw new Error(
      responseBody?.message || 'Não foi possível atualizar o aluno.',
    );
  }

  const data = (await response.json()) as {
    student: ApiStudent;
  };

  return apiStudentToAluno(data.student);
}