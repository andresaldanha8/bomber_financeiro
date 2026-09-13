import React, { useState } from 'react';
import { PagamentoAluno } from '../types';
import { useAuth } from '../context/AuthContext';
import pagamentosApi from '../services/pagamentosApi';
import { X, CheckCircle2, RotateCcw, QrCode, Banknote, AlertTriangle, Calendar, Info } from 'lucide-react';

interface ConfirmPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  pagamento: PagamentoAluno | null;
  onSuccess: (acao: 'CONFIRMADO' | 'ESTORNADO') => void;
}

export const ConfirmPaymentModal: React.FC<ConfirmPaymentModalProps> = ({
  isOpen,
  onClose,
  pagamento,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const [motivoEstorno, setMotivoEstorno] = useState('');
  const [showEstornoForm, setShowEstornoForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !pagamento) return null;

  // Helpers locais (não usar financeService)
  const formatDateBR = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const formatDateTimeBR = (iso?: string) => {
    if (!iso) return '-';
    const datePart = iso.split('T')[0];
    const timePart = iso.split('T')[1] ? iso.split('T')[1].slice(0,5) : '';
    const [y,m,d] = datePart.split('-');
    return `${d}/${m}/${y} ${timePart}`.trim();
  };

  // Normaliza apresentação de prefixo Prof./Profª sem alterar o dado persistido
  const formatProfessorPresentation = (name?: string) => {
    if (!name) return '';
    let cleaned = name.trim();
    // Remover duplicações como "Prof. Prof. ..."
    cleaned = cleaned.replace(/^(?:Prof(?:a)?\.\s*)+/i, (m) => m.replace(/\s+/g, ' '));
    // Se já tem prefixo, devolve como está
    if (/^Prof(?:a)?\./i.test(cleaned)) return cleaned;
    // Não forçar prefixo quando o nome já vier completo por outro tipo de usuário
    return cleaned;
  };

  const formatCurrency = (val: any) => {
    const n = typeof val === 'string' ? parseFloat(val) : val;
    if (Number.isNaN(n)) return String(val);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  };

  // dataVencimentoOriginal may be passed via pagamento.dataVencimento, or undefined
  const dataVencimentoOriginal = (pagamento as any).dataVencimento || pagamento.dataVencimento || '';
  const dataPagamentoReal = pagamento.dataPagamento || (pagamento.informadoEm ? pagamento.informadoEm.split('T')[0] : '');

  const isAntecipado = !!dataVencimentoOriginal && !!dataPagamentoReal && dataPagamentoReal < dataVencimentoOriginal;
  const isNoDia = !!dataVencimentoOriginal && !!dataPagamentoReal && dataPagamentoReal === dataVencimentoOriginal;
  const isAposVencimento = !!dataVencimentoOriginal && !!dataPagamentoReal && dataPagamentoReal > dataVencimentoOriginal;

  const handleConfirmar = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await pagamentosApi.confirmPayment(pagamento.id);
      // backend returns { pagamento, mensalidade, proximaMensalidade, message }
      onSuccess('CONFIRMADO');
      onClose();
    } catch (err: any) {
      const status = err?.status;
      if (status === 401) setErrorMsg('Sessão inválida. Faça login novamente.');
      else if (status === 403) setErrorMsg('Você não tem permissão para confirmar pagamentos.');
      else if (status === 404) setErrorMsg('Pagamento não encontrado.');
      else if (status === 409) setErrorMsg(err?.message || 'Conflito ao confirmar pagamento.');
      else setErrorMsg(err?.message || 'Erro ao confirmar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleEstornar = () => {
    setErrorMsg('Estorno não implementado nesta etapa.');
  };

  return (
    <div
      id="confirm-payment-modal-backdrop"
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150"
    >
      <div
        id="confirm-payment-modal-content"
        className="w-full sm:max-w-md bg-[#18181b] rounded-3xl shadow-2xl border border-white/10 max-h-[calc(100dvh-1.5rem)] sm:max-h-[90dvh] flex flex-col overflow-hidden animate-in slide-in-from-top-3 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 text-white my-auto sm:my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/40 text-white shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-lime-400" />
            <h2 className="text-base font-black text-white tracking-tight">Conferência de Pagamento</h2>
          </div>
          <button
            id="btn-close-confirm-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Card Detalhes do Pagamento */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">Aluno:</span>
              <span className="text-sm font-bold text-white">{pagamento.alunoNome}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">Competência:</span>
              <span className="text-xs font-bold text-zinc-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                {pagamento.competencia}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">Forma Informada:</span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-black text-xs bg-lime-400/15 text-lime-300 border border-lime-400/30">
                {pagamento.formaPagamento === 'PIX' ? (
                  <QrCode className="w-3.5 h-3.5" />
                ) : (
                  <Banknote className="w-3.5 h-3.5" />
                )}
                <span>{pagamento.formaPagamento}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">Registrado por:</span>
              <span className="text-xs font-semibold text-zinc-200">
                {formatProfessorPresentation(pagamento.informadoPorNome)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">Data do Pagamento:</span>
              <span className="text-xs font-bold text-emerald-400">
                {formatDateBR(dataPagamentoReal)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">Vencimento Original:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-300">
                  {formatDateBR(dataVencimentoOriginal)}
                </span>
                {isAntecipado && (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-400/15 px-1.5 py-0.5 rounded border border-amber-400/30">
                    Antecipado
                  </span>
                )}
                {isNoDia && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/15 px-1.5 py-0.5 rounded border border-emerald-400/30">
                    No Vencimento
                  </span>
                )}
                {isAposVencimento && (
                  <span className="text-[10px] font-bold text-red-400 bg-red-400/15 px-1.5 py-0.5 rounded border border-red-400/30">
                    Atrasado
                  </span>
                )}
              </div>
            </div>

            {isAntecipado && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-200/90 text-xs">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Recebimento antecipado informado pelo professor. O vencimento original é {formatDateBR(dataVencimentoOriginal)}.
                </span>
              </div>
            )}

            {isAposVencimento && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-400/10 border border-red-400/25 text-red-200/90 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <span>
                  Recebimento realizado após o vencimento original ({formatDateBR(dataVencimentoOriginal)}).
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">Registrado no Sistema em:</span>
              <span className="text-xs text-zinc-300">
                {formatDateTimeBR(pagamento.createdAt || pagamento.informadoEm)}
              </span>
            </div>

            {pagamento.observacao && (
              <div className="pt-2 border-t border-white/10 text-xs">
                <span className="text-zinc-400 font-medium">Observação: </span>
                <span className="text-zinc-200 italic">"{pagamento.observacao}"</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
              <span className="text-xs font-bold text-zinc-400">Valor a Confirmar:</span>
              <span className="text-xl font-black text-lime-400">
                {formatCurrency(pagamento.valor)}
              </span>
            </div>
          </div>

          {/* Explicação da Ação */}
          <div className="text-[11px] text-zinc-400 leading-tight">
            {pagamento.formaPagamento === 'PIX'
              ? 'Verifique no extrato da conta bancária se o PIX caiu antes de confirmar.'
              : 'Verifique se o dinheiro físico foi recolhido do professor ou recepcionista.'}
          </div>

          {/* Formulário de Estorno se acionado */}
          {showEstornoForm ? (
            <div className="space-y-3 p-3.5 rounded-2xl bg-red-950/30 border border-red-500/30">
              <p className="text-xs font-bold text-red-300">Motivo da Recusa / Estorno:</p>
              <textarea
                id="input-motivo-estorno"
                rows={2}
                placeholder="Ex: Comprovante inválido, PIX não localizado na conta..."
                value={motivoEstorno}
                onChange={(e) => setMotivoEstorno(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-red-500/30 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-red-500 text-white placeholder:text-zinc-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  id="btn-cancelar-estorno"
                  onClick={() => setShowEstornoForm(false)}
                  className="flex-1 py-2 text-xs font-bold rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  id="btn-confirmar-estorno"
                  onClick={handleEstornar}
                  disabled={loading}
                  className="flex-1 py-2 text-xs font-black rounded-xl bg-red-500 hover:bg-red-400 text-white shadow-md shadow-red-500/20"
                >
                  Confirmar Recusa
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <button
                type="button"
                id="btn-aprovar-pagamento-admin"
                onClick={handleConfirmar}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-sm shadow-lg shadow-lime-500/20 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-lime-400 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {loading
                    ? 'Confirmando...'
                    : `Confirmar Recebimento (${formatCurrency(pagamento.valor)})`}
                </span>
              </button>

              <button
                type="button"
                id="btn-abrir-estorno"
                onClick={() => setShowEstornoForm(true)}
                className="w-full py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
              >
                Não recebi / Recusar Pagamento
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
