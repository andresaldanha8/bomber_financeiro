import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService, formatProfessorNome } from '../services/financeService';
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
  const { currentUser, users } = useAuth();
  const professores = users.filter((u) => u.role === 'PROFESSOR');

  const [professorId, setProfessorId] = useState(professores[0]?.id || '');
  const [competencia, setCompetencia] = useState('Agosto/2026');
  const [valor, setValor] = useState('');
  const [dataPagamento, setDataPagamento] = useState('2026-09-03');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const profSelecionado = professores.find((p) => p.id === professorId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!professorId) {
      setErrorMsg('Selecione um professor.');
      return;
    }

    const valorNum = parseFloat(valor.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      setErrorMsg('Informe um valor de repasse válido.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      financeService.cadastrarPagamentoProfessor(
        {
          professorId,
          competencia,
          valor: valorNum,
          dataPagamento,
          formaPagamento,
        },
        currentUser
      );
      onSuccess(formatProfessorNome(profSelecionado?.name || 'Professor'));
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao registrar pagamento de professor.');
    } finally {
      setLoading(false);
    }
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
            <h2 className="text-base font-black text-white tracking-tight">Pagar Professor</h2>
          </div>
          <button
            id="btn-close-teacher-payment-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

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
                type="text"
                id="input-repasse-competencia"
                required
                placeholder="Ex: Agosto/2026"
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
                Data do Pagamento *
              </label>
              <input
                type="date"
                id="input-repasse-data"
                required
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
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
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white"
              >
                <option value="PIX" className="bg-[#18181b] text-white">PIX</option>
                <option value="Dinheiro" className="bg-[#18181b] text-white">Dinheiro</option>
                <option value="Transferência" className="bg-[#18181b] text-white">Transferência Bancária</option>
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
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-sm shadow-lg shadow-lime-500/20 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-lime-400 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Lançar Pagamento do Professor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
