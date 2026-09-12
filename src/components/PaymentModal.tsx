import React, { useState, useRef, useEffect } from 'react';
import { Aluno, FormaPagamento, Mensalidade } from '../types';
import { useAuth } from '../context/AuthContext';
import pagamentosApi, { RegisterPaymentPayload } from '../services/pagamentosApi';
import {
  X,
  QrCode,
  Banknote,
  Calendar,
  Check,
  AlertCircle,
  Sparkles,
  Info,
  AlertTriangle,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  aluno: Aluno;
  mensalidade?: Mensalidade & { isPagamentoInicial?: boolean; diaBaseNaGeracao?: number };
  onSuccess: (forma: FormaPagamento) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  aluno,
  mensalidade,
  onSuccess,
}) => {
  const { isAdmin, isProfessor } = useAuth();
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  // Garante que ao abrir o modal o scroll inicie no topo absoluto (scrollTop = 0)
  useEffect(() => {
    if (isOpen && scrollBodyRef.current) {
      scrollBodyRef.current.scrollTop = 0;
    }
  }, [isOpen, aluno?.id, mensalidade?.id]);

  if (!isOpen) return null;

  // PaymentModal MUST receive the mensalidade prop (use provided mensalidade)
  const currentMensalidade = mensalidade;

  const valor = currentMensalidade ? currentMensalidade.valor : aluno.valorMensalidade;
  const competencia = currentMensalidade ? currentMensalidade.competencia : 'Outubro/2026';
  const dataVenc = currentMensalidade
    ? currentMensalidade.dataVencimento
    : `2026-10-${String(aluno.diaVencimento).padStart(2, '0')}`;

  // Today's date in application timezone (America/Sao_Paulo) as YYYY-MM-DD
  const getTodayDateStrLocal = (): string => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')!.value;
    const m = parts.find((p) => p.type === 'month')!.value;
    const d = parts.find((p) => p.type === 'day')!.value;
    return `${y}-${m}-${d}`;
  };

  const hoje = getTodayDateStrLocal();
  const isAdminLocal = isAdmin;

  const isPagamentoInicial = !!currentMensalidade && !!currentMensalidade.isPagamentoInicial && currentMensalidade.status === 'PENDENTE';

  // Classificação do momento do pagamento (operacional / visual)
  const isAntecipado = !isPagamentoInicial && !!dataVenc && hoje < dataVenc;
  const isNoVencimento = !isPagamentoInicial && !!dataVenc && hoje === dataVenc;
  const isAposVencimento = !isPagamentoInicial && !!dataVenc && hoje > dataVenc;

  const formatCurrency = (val: any) => {
    const n = typeof val === 'string' ? parseFloat(val) : val;
    if (Number.isNaN(n)) return String(val);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const formatCompetencia = (comp?: string) => {
    if (!comp) return '';
    // Handle ISO-like 'YYYY-MM' or 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:..' -> MM/YYYY
    const isoMatch = comp.match(/^(\d{4})-(\d{2})/);
    if (isoMatch) return `${isoMatch[2]}/${isoMatch[1]}`;

    // Already in MM/YYYY
    if (/^\d{2}\/\d{4}$/.test(comp)) return comp;

    // Month name like 'Setembro/2026' -> map to MM/YYYY
    const parts = comp.split('/');
    if (parts.length === 2) {
      const mesNome = parts[0].trim().toLowerCase();
      const ano = parts[1].trim();
      const meses: Record<string,string> = {
        janeiro: '01', fevereiro: '02', março: '03', abril: '04', maio: '05', junho: '06',
        julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
      };
      if (meses[mesNome]) return `${meses[mesNome]}/${ano}`;
    }

    return comp;
  };

  const handleSubmit = async (formaEscolhida?: FormaPagamento) => {
    const forma = formaEscolhida || formaPagamento;
    if (!currentMensalidade) {
      setErrorMsg('Não foi encontrada mensalidade em aberto para este aluno.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      if (isAdminLocal) {
        // Admin financial flow is disabled during this homologation.
        setErrorMsg('Fluxo de registro/confirmacao pelo ADMIN está temporariamente desabilitado.');
        return;
      }

      if (!isProfessor) {
        setErrorMsg('Somente professores podem registrar pagamentos nesta versão.');
        return;
      }

      // PROFESSOR: call real API with typed payload
      const payload: RegisterPaymentPayload = {
        formaPagamento: forma,
        dataPagamento: hoje,
        observacao: observacao?.trim() || undefined,
      };

      await pagamentosApi.registerStudentPayment(currentMensalidade.id, payload);

      onSuccess(forma);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao processar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="payment-modal-backdrop"
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150"
    >
      <div
        id="payment-modal-content"
        className="w-full sm:max-w-md bg-[#18181b] rounded-3xl shadow-2xl border border-white/10 max-h-[calc(100dvh-1.5rem)] sm:max-h-[90dvh] flex flex-col overflow-hidden animate-in slide-in-from-top-3 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 text-white my-auto sm:my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/40 text-white shrink-0">
          <div>
            {isAntecipado ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black tracking-wider uppercase text-amber-400 bg-amber-400/15 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {isAdmin ? 'Recebimento Antecipado' : 'Registro Antecipado'}
              </span>
            ) : isAposVencimento ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-red-400 bg-red-400/10 px-2.5 py-0.5 rounded-full border border-red-400/25">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                {isAdmin ? 'Recebimento em Atraso' : 'Registro de Atraso'}
              </span>
            ) : (
              <span className="text-[11px] font-bold tracking-wider uppercase text-lime-400">
                {isAdmin ? 'Confirmar Recebimento' : 'Registrar Pagamento'}
              </span>
            )}
            <h2 className="text-base font-black text-white leading-tight tracking-tight mt-1">
              {aluno.nome}
            </h2>
          </div>
          <button
            id="btn-close-payment-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body com scroll interno independente e garantido no topo */}
        <div
          ref={scrollBodyRef}
          id="payment-modal-body"
          className="p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain"
        >
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Dados com Aluno, Competência, Vencimento, Valor */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Aluno:</span>
              <span className="text-xs font-bold text-zinc-200">
                {aluno.nome}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Competência:</span>
                <span className="text-xs font-bold text-zinc-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                {formatCompetencia(competencia)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                {isPagamentoInicial ? 'Vencimento Recorrente:' : 'Vencimento:'}
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span className={isAposVencimento ? 'font-bold text-red-400' : 'font-semibold text-zinc-200'}>
                  {formatDateBR(dataVenc)}
                </span>
                {isAntecipado && (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-400/15 px-1.5 py-0.5 rounded border border-amber-400/30">
                    Antecipado
                  </span>
                )}
                {isAposVencimento && (
                  <span className="text-[10px] font-bold text-red-400 bg-red-400/15 px-1.5 py-0.5 rounded border border-red-400/30">
                    Vencido
                  </span>
                )}
              </div>
            </div>

            {isPagamentoInicial && (
              <div className="flex items-center justify-between text-[11px] text-amber-300/90 pt-1">
                <span>Tipo:</span>
                <span className="font-semibold">Pagamento de Entrada</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
              <span className="text-xs font-semibold text-zinc-400">Valor da Mensalidade:</span>
                <span className="text-lg font-black text-lime-400">
                {formatCurrency(valor)}
              </span>
            </div>
          </div>

          {/* Aviso discreto de Pagamento Antecipado (conforme solicitado) */}
          {isAntecipado && !isPagamentoInicial && (
            <div
              id="alerta-pagamento-antecipado"
              className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/25 text-amber-200/90 text-xs leading-relaxed"
            >
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                O aluno está em dia. Este recebimento corresponde à próxima mensalidade e está sendo pago antecipadamente.
              </p>
            </div>
          )}

          {/* Seleção Direta: PIX ou DINHEIRO */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-2">
              Escolha a forma de pagamento:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-select-pix"
                onClick={() => setFormaPagamento('PIX')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center ${
                  formaPagamento === 'PIX'
                    ? 'border-lime-400 bg-lime-400/10 text-white font-black shadow-md shadow-lime-500/10'
                    : 'border-white/10 bg-black/30 hover:bg-white/5 text-zinc-400'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${
                    formaPagamento === 'PIX'
                      ? 'bg-lime-400 text-black'
                      : 'bg-white/10 text-zinc-400'
                  }`}
                >
                  <QrCode className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="text-sm font-black leading-none text-white">PIX</span>
                <span className="text-[11px] text-zinc-400 mt-1">Comprovante</span>
              </button>

              <button
                type="button"
                id="btn-select-dinheiro"
                onClick={() => setFormaPagamento('DINHEIRO')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center ${
                  formaPagamento === 'DINHEIRO'
                    ? 'border-lime-400 bg-lime-400/10 text-white font-black shadow-md shadow-lime-500/10'
                    : 'border-white/10 bg-black/30 hover:bg-white/5 text-zinc-400'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${
                    formaPagamento === 'DINHEIRO'
                      ? 'bg-lime-400 text-black'
                      : 'bg-white/10 text-zinc-400'
                  }`}
                >
                  <Banknote className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="text-sm font-black leading-none text-white">DINHEIRO</span>
                <span className="text-[11px] text-zinc-400 mt-1">Em mãos</span>
              </button>
            </div>
          </div>

          {/* Observação opcional */}
          <div>
            <label
              htmlFor="input-pagamento-obs"
              className="block text-xs font-semibold text-zinc-400 mb-1"
            >
              Observação (opcional)
            </label>
            <input
              type="text"
              id="input-pagamento-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: entregue na recepção, comprovante no WhatsApp..."
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Rodapé informativo adaptado ao perfil */}
          {isAdmin ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] leading-relaxed">
              <p className="font-bold text-emerald-300">Recebimento Direto (ADMIN):</p>
              <p className="text-emerald-300/90 mt-0.5">
                Após confirmar, o recebimento será lançado no Caixa na data de hoje ({formatDateBR(hoje)}) e a mensalidade será quitada.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] leading-relaxed">
              <p className="font-bold text-amber-300">Fluxo de Conferência (PROFESSOR):</p>
              <p className="text-amber-300/80 mt-0.5">
                O pagamento será enviado para conferência do ADMIN. A entrada no caixa só é efetivada após o Admin conferir o PIX ou o valor em espécie.
              </p>
            </div>
          )}

          {/* Botão de Confirmação/Registro */}
          <button
            type="button"
            id="btn-confirmar-registro-pagamento"
            onClick={() => handleSubmit()}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-sm shadow-lg shadow-lime-500/20 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-lime-400 disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {loading
                ? (isAdmin ? 'Confirmando...' : 'Registrando...')
                : isAdmin
                ? `Confirmar Recebimento (${formaPagamento})`
                : `Registrar Pagamento (${formaPagamento})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
