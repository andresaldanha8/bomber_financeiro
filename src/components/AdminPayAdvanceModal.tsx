import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  financeService,
  formatCurrency,
  getTodayDateStr,
  formatProfessorNome,
} from '../services/financeService';
import { AdiantamentoProfessor } from '../types';
import { X, CheckCircle, AlertCircle, Calendar, CreditCard, User, FileText } from 'lucide-react';

interface AdminPayAdvanceModalProps {
  isOpen: boolean;
  adiantamento: AdiantamentoProfessor | null;
  onClose: () => void;
  onSuccess: (nomeProf: string, valor: number) => void;
}

export const AdminPayAdvanceModal: React.FC<AdminPayAdvanceModalProps> = ({
  isOpen,
  adiantamento,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const [dataPagamento, setDataPagamento] = useState(getTodayDateStr());
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [observacao, setObservacao] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDataPagamento(getTodayDateStr());
      setFormaPagamento('PIX');
      setObservacao('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !adiantamento) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dataPagamento) {
      setError('Informe a data do pagamento.');
      return;
    }

    try {
      setIsSubmitting(true);
      financeService.registrarPagamentoAdiantamento(
        adiantamento.id,
        {
          dataPagamento,
          formaPagamento,
          observacaoPagamento: observacao,
        },
        currentUser
      );
      onSuccess(formatProfessorNome(adiantamento.professorNome), adiantamento.valor);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao registrar pagamento do adiantamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="admin-pay-advance-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="admin-pay-advance-modal"
        className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#121214] border border-white/10 rounded-3xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#18181b]/50 sticky top-0 z-10 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-lime-500/10 text-lime-400 border border-lime-500/20 shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Registrar Pagamento do Adiantamento
              </h2>
              <p className="text-xs text-zinc-400">
                Registre no sistema um pagamento já realizado ao professor.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-admin-pay-advance"
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
              <span className="text-xs text-zinc-400">Valor do Adiantamento:</span>
              <span className="text-base font-black text-rose-400">
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

          {/* Informação Operacional */}
          <div className="p-3.5 rounded-2xl bg-lime-500/10 border border-lime-500/20 text-xs text-lime-300 space-y-1">
            <p className="font-semibold text-[11px]">
              Registre no sistema um pagamento já realizado ao professor.
            </p>
            <p className="text-[10px] text-lime-300/80 leading-relaxed">
              Isso gerará exatamente uma saída financeira no Caixa e disponibilizará o recibo digital para o professor confirmar.
            </p>
          </div>

          {/* Data do Pagamento */}
          <div className="space-y-1.5">
            <label
              htmlFor="input-advance-pay-date"
              className="text-xs font-bold text-zinc-300 flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Data do Pagamento *</span>
            </label>
            <input
              id="input-advance-pay-date"
              type="date"
              required
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#18181b] border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-1.5">
            <label
              htmlFor="select-advance-payment-method"
              className="text-xs font-bold text-zinc-300 flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
              <span>Forma de Pagamento *</span>
            </label>
            <select
              id="select-advance-payment-method"
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#18181b] border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
              <option value="PIX">PIX</option>
              <option value="DINHEIRO">Dinheiro</option>
            </select>
          </div>

          {/* Observação Opcional */}
          <div className="space-y-1.5">
            <label
              htmlFor="input-advance-pay-obs"
              className="text-xs font-bold text-zinc-300 flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Observação do Pagamento (opcional)</span>
              </span>
              <span className="text-[10px] text-zinc-500">Ex: Comprovante PIX 123</span>
            </label>
            <input
              id="input-advance-pay-obs"
              type="text"
              placeholder="Detalhes ou identificador da transferência..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#18181b] border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          {/* Ações */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              id="btn-cancel-admin-pay-advance"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 text-xs font-bold transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-confirm-admin-pay-advance"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-xs shadow-lg shadow-lime-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Registrando...' : 'Confirmar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
