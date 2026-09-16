import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatProfessorNome, getTodayDateStr } from '../services/financeService';
import { adminUsersService, type ProfessorAccount } from '../services/adminUsersService';
import { repassesApi, RepassesApiError, type RepasseFormaPagamento } from '../services/repassesApi';
import { X, DollarSign, AlertCircle, ShieldCheck } from 'lucide-react';

interface TeacherPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (nomeProfessor: string) => void;
}

export const TeacherPaymentModal: React.FC<TeacherPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();

  const [professores, setProfessores] = useState<ProfessorAccount[]>([]);
  const [professorId, setProfessorId] = useState('');
  const [competencia, setCompetencia] = useState('');
  const [valor, setValor] = useState('');
  const [dataRepasse, setDataRepasse] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<RepasseFormaPagamento>('PIX');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingProfessores, setLoadingProfessores] = useState(true);
  const [professoresError, setProfessoresError] = useState('');
  const [retry, setRetry] = useState(0);
  const submitting = useRef(false);
  const lifecycle = useRef(0);

  useEffect(() => {
    ++lifecycle.current;
    if (isOpen) {
      const hoje = getTodayDateStr();
      setCompetencia(hoje.slice(0, 7));
      setDataRepasse(hoje);
      setValor('');
      setFormaPagamento('PIX');
      setErrorMsg('');
    }
    return () => { ++lifecycle.current; };
  }, [isOpen, currentUser?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setLoadingProfessores(true);
    setProfessoresError('');
    setProfessores([]);
    if (currentUser?.role !== 'ADMIN') {
      setProfessorId('');
      setLoadingProfessores(false);
      setProfessoresError('Acesso permitido somente ao administrador.');
      return () => controller.abort();
    }
    adminUsersService.list(controller.signal).then(({ users }) => {
      if (controller.signal.aborted) return;
      const ativos = users.filter((user) => user.active === true);
      setProfessores(ativos);
      setProfessorId((selected) => ativos.some((user) => user.id === selected) ? selected : ativos[0]?.id ?? '');
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setProfessorId('');
      setProfessoresError(error instanceof Error ? error.message : 'Erro ao carregar professores.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingProfessores(false);
    });
    return () => controller.abort();
  }, [isOpen, currentUser?.id, currentUser?.role, retry]);

  if (!isOpen) return null;

  const profSelecionado = professores.find((p) => p.id === professorId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;

    if (!currentUser) {
      setErrorMsg('Sessão não autenticada.');
      return;
    }

    if (currentUser.role !== 'ADMIN' || loadingProfessores || professoresError || !profSelecionado) {
      setErrorMsg('Selecione um professor.');
      return;
    }

    const valorTexto = valor.trim();
    const valorNum = Number(valorTexto.replace(',', '.'));
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(valorTexto) || !Number.isFinite(valorNum) || valorNum <= 0 || valorNum > 99999999.99) {
      setErrorMsg('Informe um valor positivo de até R$ 99.999.999,99, com no máximo duas casas decimais.');
      return;
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) {
      setErrorMsg('Informe uma competência válida (YYYY-MM).');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataRepasse)) {
      setErrorMsg('Informe a data do repasse.');
      return;
    }
    if (!['PIX', 'DINHEIRO', 'TRANSFERENCIA'].includes(formaPagamento)) {
      setErrorMsg('Forma de pagamento inválida.');
      return;
    }

    submitting.current = true;
    const version = lifecycle.current;
    let nomeProfessor: string;
    try {
      setLoading(true);
      setErrorMsg('');
      const repasse = await repassesApi.create({ professorId, competencia, valor: valorNum, dataRepasse, formaPagamento });
      nomeProfessor = repasse.professorNome;
    } catch (err: unknown) {
      if (version === lifecycle.current) {
        const message = err instanceof Error ? err.message : 'Erro ao registrar repasse.';
        setErrorMsg(err instanceof RepassesApiError && err.status < 500 ? message
          : `${message} Não foi possível confirmar o resultado. Verifique se o repasse foi registrado antes de tentar novamente.`);
      }
      return;
    } finally {
      submitting.current = false;
      if (version === lifecycle.current) setLoading(false);
    }
    if (version !== lifecycle.current) return;
    setValor('');
    onSuccess(formatProfessorNome(nomeProfessor));
    onClose();
  };

  return (
    <div
      id="teacher-payment-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        id="teacher-payment-modal-content"
        className="w-full sm:max-w-md bg-[#18181b] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/10 overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/40 text-white">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-lime-400" />
            <h2 className="text-base font-black text-white tracking-tight">Registrar Repasse</h2>
          </div>
          <button
            id="btn-close-teacher-payment-modal"
            onClick={() => { if (!submitting.current) onClose(); }}
            disabled={loading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div role="alert" className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {loadingProfessores && <p role="status" className="text-xs text-zinc-400">Carregando professores...</p>}
          {professoresError && <div role="alert" className="text-xs text-red-300">{professoresError} <button type="button" disabled={loading} onClick={() => setRetry((value) => value + 1)} className="underline">Tentar novamente</button></div>}
          {!loadingProfessores && !professoresError && professores.length === 0 && <p role="status" className="text-xs text-zinc-400">Nenhum professor ativo disponível.</p>}

          {/* Professor */}
          <div>
            <label
              htmlFor="select-professor-repasse"
              className="block text-xs font-bold text-zinc-300 mb-1"
            >
              Professor Destinatário *
            </label>
            <select
              id="select-professor-repasse"
              value={professorId}
              disabled={loading || loadingProfessores || !!professoresError || professores.length === 0}
              required
              onChange={(e) => setProfessorId(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white font-bold"
            >
              {professores.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#18181b] text-white">
                  {formatProfessorNome(p.name)} {p.chavePix ? `(PIX: ${p.chavePix})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Grid: Competência e Valor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="input-repasse-competencia"
                className="block text-xs font-bold text-zinc-300 mb-1"
              >
                Competência / Ref. *
              </label>
              <input
                type="month"
                id="input-repasse-competencia"
                required
                disabled={loading}
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white"
              />
            </div>

            <div>
              <label
                htmlFor="input-repasse-valor"
                className="block text-xs font-bold text-zinc-300 mb-1"
              >
                Valor (R$) *
              </label>
              <input
                type="text"
                id="input-repasse-valor"
                disabled={loading}
                inputMode="decimal"
                required
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white font-black"
              />
            </div>
          </div>

          {/* Grid: Data e Forma */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="input-repasse-data"
                className="block text-xs font-bold text-zinc-300 mb-1"
              >
                Data do Repasse *
              </label>
              <input
                type="date"
                id="input-repasse-data"
                required
                disabled={loading}
                value={dataRepasse}
                onChange={(e) => setDataRepasse(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white"
              />
            </div>

            <div>
              <label
                htmlFor="select-repasse-forma"
                className="block text-xs font-bold text-zinc-300 mb-1"
              >
                Forma de Pagamento
              </label>
              <select
                id="select-repasse-forma"
                value={formaPagamento}
                disabled={loading}
                onChange={(e) => setFormaPagamento(e.target.value as RepasseFormaPagamento)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white"
              >
                <option value="PIX" className="bg-[#18181b] text-white">PIX</option>
                <option value="DINHEIRO" className="bg-[#18181b] text-white">Dinheiro</option>
                <option value="TRANSFERENCIA" className="bg-[#18181b] text-white">Transferência Bancária</option>
              </select>
            </div>
          </div>

          {/* Regra de Negócio em Destaque */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-zinc-300 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-lime-400">
              <ShieldCheck className="w-4 h-4 text-lime-400" />
              <span>Saída Imediata do Caixa & Recibo Digital</span>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-400">
              A saída do caixa ocorre agora. O status ficará como <strong>"AGUARDANDO CONFIRMAÇÃO DE RECEBIMENTO"</strong> até que o professor acesse a área <em>"Meus Pagamentos"</em> e confirme o recebimento (recibo digital).
            </p>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              id="btn-confirmar-repasse-professor"
              disabled={loading || loadingProfessores || !!professoresError || !profSelecionado}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-sm shadow-lg shadow-lime-500/20 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-lime-400 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Registrar Repasse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
