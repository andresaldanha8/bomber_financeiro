import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService, formatProfessorNome } from '../services/financeService';
import { X, HandCoins, AlertCircle } from 'lucide-react';

interface RequestAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RequestAdvanceModal: React.FC<RequestAdvanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const [valorStr, setValorStr] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const valorLimpo = valorStr.replace(/\./g, '').replace(',', '.');
    const valorNum = parseFloat(valorLimpo);

    if (isNaN(valorNum) || valorNum <= 0) {
      setError('Informe um valor de adiantamento válido maior que zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      financeService.solicitarAdiantamento(valorNum, motivo, currentUser);
      onSuccess();
      onClose();
      setValorStr('');
      setMotivo('');
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar solicitação de adiantamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="request-advance-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="request-advance-modal"
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#121214] border border-white/10 rounded-3xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#18181b]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Solicitar Adiantamento
              </h2>
              <p className="text-xs text-zinc-400">
                {formatProfessorNome(currentUser.name)}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-request-advance"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Campo Valor */}
          <div className="space-y-1.5">
            <label
              htmlFor="input-advance-amount"
              className="text-xs font-bold text-zinc-300 flex items-center justify-between"
            >
              <span>Valor do Adiantamento *</span>
              <span className="text-[10px] text-zinc-500 font-normal">Ex: 250,00</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
                R$
              </span>
              <input
                id="input-advance-amount"
                type="text"
                inputMode="decimal"
                required
                placeholder="0,00"
                value={valorStr}
                onChange={(e) => setValorStr(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#18181b] border border-white/10 text-white font-black text-lg placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Campo Observação / Motivo (Opcional) */}
          <div className="space-y-1.5">
            <label
              htmlFor="input-advance-reason"
              className="text-xs font-bold text-zinc-300 flex items-center justify-between"
            >
              <span>Observação / Motivo (opcional)</span>
              <span className="text-[10px] text-zinc-500 font-normal">Não obrigatório</span>
            </label>
            <textarea
              id="input-advance-reason"
              rows={3}
              placeholder="Ex: Adiantamento para despesas pessoais / viagem de torneio..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#18181b] border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none transition-all"
            />
          </div>

          {/* Mensagem Informativa de Negócio */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
            <p className="font-semibold text-[11px]">
              Sua solicitação será enviada para análise da administração.
            </p>
            <p className="text-[10px] text-amber-300/80 leading-relaxed">
              Você será notificado pelo app assim que o pagamento for registrado pela gestão para você assinar o recibo digital.
            </p>
          </div>

          {/* Ações */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              id="btn-cancel-request-advance"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 text-xs font-bold transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-submit-request-advance"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs shadow-lg shadow-amber-400/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
