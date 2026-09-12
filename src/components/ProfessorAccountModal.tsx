import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { adminUsersService, ProfessorAccount } from '../services/adminUsersService';

type Props = {
  professor?: ProfessorAccount;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

// Montado somente enquanto aberto: os campos de senha são descartados ao fechar.
export function ProfessorAccountModal({ professor, onClose, onSuccess }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const close = () => {
    if (submitting.current) return;
    setPassword('');
    setConfirmation('');
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    if (!professor && (!name.trim() || !username.trim())) {
      setError('Nome e usuário são obrigatórios.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve possuir pelo menos 6 caracteres.');
      return;
    }
    if (professor && password !== confirmation) {
      setError('As senhas não coincidem.');
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      if (professor) await adminUsersService.resetPassword(professor.id, password);
      else await adminUsersService.create({ name: name.trim(), username: username.trim(), password, chavePix: chavePix.trim() || undefined });
      setPassword('');
      setConfirmation('');
      onSuccess(professor ? 'Senha redefinida com sucesso.' : 'Professor cadastrado com sucesso.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível salvar.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const inputClass = 'mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400';
  return (
    <dialog ref={dialog} aria-labelledby="professor-modal-title" onCancel={(event) => { event.preventDefault(); close(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-white/10 bg-[#121214] p-0 text-zinc-100 backdrop:bg-black/80">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
        <h2 id="professor-modal-title" className="text-base font-black">{professor ? 'Redefinir Senha' : 'Novo Professor'}</h2>
        <button type="button" aria-label="Fechar" disabled={busy} onClick={close} className="rounded-lg p-2 text-zinc-400 hover:text-white disabled:opacity-50"><X size={20} /></button>
      </div>
      <form onSubmit={submit} className="space-y-4 p-4">
        {professor ? (
          <div className="space-y-2 text-sm"><p className="break-words font-bold">{professor.name}</p><p className="text-xs text-zinc-400">Ao redefinir a senha, as sessões atuais desse professor serão encerradas.</p></div>
        ) : null}
        {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
        <fieldset disabled={busy} className="space-y-3 disabled:opacity-60">
          {!professor && <>
            <label className="block text-xs font-bold text-zinc-300">Nome completo<input autoFocus required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></label>
            <label className="block text-xs font-bold text-zinc-300">Usuário<input required autoComplete="off" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} /></label>
          </>}
          <label className="block text-xs font-bold text-zinc-300">{professor ? 'Nova senha' : 'Senha'}<input autoFocus={!!professor} type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} /></label>
          {professor ? <label className="block text-xs font-bold text-zinc-300">Confirmar nova senha<input type="password" required minLength={6} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={inputClass} /></label>
            : <label className="block text-xs font-bold text-zinc-300">Chave PIX (opcional)<input value={chavePix} onChange={(e) => setChavePix(e.target.value)} className={inputClass} /></label>}
        </fieldset>
        <div className="flex gap-2 pt-2">
          <button type="button" disabled={busy} onClick={close} className="flex-1 rounded-xl border border-white/10 px-3 py-3 text-xs font-bold disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-lime-400 px-3 py-3 text-xs font-black text-black disabled:opacity-50">{busy ? 'Salvando...' : professor ? 'Redefinir Senha' : 'Cadastrar'}</button>
        </div>
      </form>
    </dialog>
  );
}
