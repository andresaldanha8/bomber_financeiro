export interface ProfessorAccount {
  id: string;
  name: string;
  username: string;
  active: boolean;
  chavePix: string | null;
}

export interface CreateProfessorInput {
  name: string;
  username: string;
  password: string;
  chavePix?: string;
}

const BASE_URL = '/api/admin/users/professors';

async function request<T>(path = '', method = 'GET', body?: object, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Não foi possível conectar ao servidor.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || (response.status === 401
      ? 'Sessão expirada. Entre novamente.'
      : response.status === 403
        ? 'Acesso permitido somente ao administrador.'
        : 'Não foi possível concluir a operação.'));
  }
  if (!data) throw new Error('Resposta inválida do servidor.');
  return data as T;
}

export const adminUsersService = {
  list: (signal?: AbortSignal) => request<{ users: ProfessorAccount[] }>('', 'GET', undefined, signal),
  create: (input: CreateProfessorInput) => request<{ user: ProfessorAccount }>('', 'POST', input),
  setActive: (id: string, active: boolean) => request<{ user: ProfessorAccount }>(`/${encodeURIComponent(id)}/status`, 'PATCH', { active }),
  resetPassword: (id: string, password: string) => request<{ message: string }>(`/${encodeURIComponent(id)}/password`, 'PATCH', { password }),
};
