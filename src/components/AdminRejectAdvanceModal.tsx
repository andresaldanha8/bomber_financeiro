import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  financeService,
  formatCurrency,
  formatProfessorNome,
} from '../services/financeService';
import { AdiantamentoProfessor } from '../types';
import { X, Ban, AlertCircle, User } from 'lucide-react';

interface AdminRejectAdvanceModalProps {
  isOpen: boolean;
  adiantamento: AdiantamentoProfessor | null;
  onClose: () => void;
  onSuccess: (nomeProf: string) => void;
}

export const AdminRejectAdvanceModal: React.FC<AdminRejectAdvanceModalProps> = ({
  isOpen,
  adiantamento,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMotivoRecusa('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !adiantamento) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setIsSubmitting(true);
      financeService.recusarAdiantamento(adiantamento.id, motivoRecusa, currentUser);
      onSuccess(formatProfessorNome(adiantamento.professorNome));
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao recusar adiantamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="admin-reject-advance-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="admin-reject-advance-modal"
        className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#121214] border border-white/10 rounded-3xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#18181b]/50 sticky top-0 z-10 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Recusar Solicitação de Adiantamento
              </h2>
              <p className="text-xs text-zinc-400">
                A solicitação não gerará saída no Caixa
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-admin-reject-advance"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dados do Adiantamento */}
          <div className="p-4 rounded-2xl bg-[#18181b] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-500" />
                Professor:
              </span>
              <span className="text-sm font-bold text-white">
                {formatProfessorNome(adiantamento.professorNome)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-xs text-zinc-400">Valor:</span>
              <span className="text-base font-bold text-white">
                {formatCurrency(adiantamento.valor)}
              </span>
            </div>
            {adiantamento.motivo && (
              <div className="pt-1 border-t border-white/5 text-xs">
                <span className="text-zinc-500 block text-[10px]">Motivo informado:</span>
                <p className="text-zinc-300 italic">"{adiantamento.motivo}"</p>
              </div>
            )}
          </div>

          {/* Motivo da Recusa (Opcional) */}
          <div className="space-y-1.5">
            <label
              htmlFor="input-advance-reject-reason"
              className="text-xs font-bold text-zinc-300 flex items-center justify-between"
            >
              <span>Motivo da Recusa (opcional)</span>
              <span className="text-[10px] text-zinc-500">Será exibido ao professor</span>
            </label>
            <textarea
              id="input-advance-reject-reason"
              rows={3}
              placeholder="Ex: Política interna de caixa / data limite para antecipações atingida..."
              value={motivoRecusa}
              onChange={(e) => setMotivoRecusa(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#18181b] border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none transition-all"
            />
          </div>

          {/* Aviso */}
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 text-xs text-zinc-400 space-y-1">
            <p className="text-[11px] font-semibold text-zinc-300">
              A solicitação será marcada como RECUSADA.
            </p>
            <p className="text-[10px] text-zinc-500">
              Nenhuma movimentação financeira será criada no Caixa.
            </p>
          </div>

          {/* Ações */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              id="btn-cancel-admin-reject-advance"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 text-xs font-bold transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-confirm-admin-reject-advance"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Recusando...' : 'Confirmar Recusa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
