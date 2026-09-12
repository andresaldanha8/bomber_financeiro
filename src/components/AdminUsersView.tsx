import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminUsersService, ProfessorAccount } from '../services/adminUsersService';
import { ProfessorAccountModal } from './ProfessorAccountModal';

export function AdminUsersView() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<ProfessorAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const actionPending = useRef(false);
  const [modal, setModal] = useState<'create' | ProfessorAccount | null>(null);
  const pendingLoad = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    pendingLoad.current?.abort();
    const controller = new AbortController();
    pendingLoad.current = controller;
    setLoading(true);
    setError('');
    try {
      const data = await adminUsersService.list(controller.signal);
      if (!controller.signal.aborted) setUsers(data.users);
    } catch (error) {
      if (!controller.signal.aborted) {
        setUsers([]);
        setError(error instanceof Error ? error.message : 'Não foi possível carregar os professores.');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
    return () => pendingLoad.current?.abort();
  }, [load]);

  const changeStatus = async (user: ProfessorAccount) => {
    if (actionPending.current) return;
    if (user.active && !window.confirm('O professor perderá o acesso ao sistema. O histórico financeiro será preservado.')) return;
    actionPending.current = true;
    setBusyId(user.id);
    setError('');
    setSuccess('');
    try {
      await adminUsersService.setActive(user.id, !user.active);
      setSuccess(user.active ? 'Professor bloqueado com sucesso.' : 'Professor reativado com sucesso.');
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível atualizar o acesso.');
    } finally {
      actionPending.current = false;
      setBusyId(null);
    }
  };

  if (!isAdmin) return null;
  return (
    <section className="space-y-3" aria-labelledby="admin-users-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="admin-users-title" className="text-base font-black text-white">Usuários da Equipe</h2><p className="mt-1 text-xs text-zinc-400">Gerencie o acesso dos professores ao Bomber Financeiro.</p></div>
        <button type="button" disabled={!!busyId || loading} onClick={() => { setSuccess(''); setModal('create'); }} className="rounded-xl bg-lime-400 px-3.5 py-2.5 text-xs font-black text-black disabled:opacity-50">+ Novo Professor</button>
      </div>
      {success && <p role="status" className="rounded-xl border border-lime-500/20 bg-lime-500/10 p-3 text-xs text-lime-300">{success}</p>}
      {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300"><p>{error}</p><button type="button" disabled={loading || !!busyId} onClick={() => void load()} className="mt-2 font-bold underline disabled:opacity-50">Atualizar lista</button></div>}
      {loading ? <p role="status" className="py-8 text-center text-sm text-zinc-400">Carregando professores...</p>
        : !error && users.length === 0 ? <p className="rounded-2xl border border-white/10 bg-[#141416] p-6 text-center text-sm text-zinc-400">Nenhum professor cadastrado.</p>
          : <div className="grid gap-3 sm:grid-cols-2">{users.map((user) => (
            <article key={user.id} className="min-w-0 space-y-3 rounded-2xl border border-white/10 bg-[#141416] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words text-sm font-bold text-white">{user.name}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-black ${user.active ? 'bg-lime-400/10 text-lime-300' : 'bg-red-500/10 text-red-300'}`}>{user.active ? 'ATIVO' : 'BLOQUEADO'}</span></div>
              <p className="break-all text-xs text-zinc-400">@{user.username}</p>
              {user.chavePix && <p className="break-all text-xs text-zinc-300">PIX: {user.chavePix}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!!busyId} onClick={() => { setSuccess(''); setModal(user); }} className="rounded-xl border border-white/10 px-3 py-2.5 text-xs font-bold text-zinc-200 hover:bg-white/5 disabled:opacity-50">Redefinir Senha</button>
                <button type="button" disabled={!!busyId} onClick={() => void changeStatus(user)} className={`rounded-xl border px-3 py-2.5 text-xs font-bold disabled:opacity-50 ${user.active ? 'border-red-500/20 text-red-300 hover:bg-red-500/10' : 'border-lime-400/20 text-lime-300 hover:bg-lime-400/10'}`}>{busyId === user.id ? 'Atualizando...' : user.active ? 'Bloquear' : 'Reativar'}</button>
              </div>
            </article>
          ))}</div>}
      {modal && <ProfessorAccountModal professor={modal === 'create' ? undefined : modal} onClose={() => setModal(null)} onSuccess={(message) => { setModal(null); setSuccess(message); void load(); }} />}
    </section>
  );
}
