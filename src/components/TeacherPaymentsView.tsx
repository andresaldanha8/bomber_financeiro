import React, { useEffect, useRef, useState } from 'react';
import { repassesApi, type RepasseProfessor, type RepasseFormaPagamento } from '../services/repassesApi';
import { useAuth } from '../context/AuthContext';
import {
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  formatProfessorNome,
} from '../services/financeService';
import { adiantamentosApi } from '../services/adiantamentosApi';
import type { AdiantamentoProfessor } from '../types';
import {
  Wallet,
  CheckCircle2,
  Clock,
  Check,
  PlusCircle,
  ShieldCheck,
  FileCheck,
  HandCoins,
  AlertCircle,
} from 'lucide-react';
import { RequestAdvanceModal } from './RequestAdvanceModal';

interface TeacherPaymentsViewProps {
  onOpenTeacherPaymentModal?: () => void;
  onSuccessConfirmation?: () => void;
}

const formasRepasse: Record<RepasseFormaPagamento, string> = {
  PIX: 'PIX', DINHEIRO: 'Dinheiro', TRANSFERENCIA: 'Transferência',
};

function formatCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split('-');
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${meses[Number(mes) - 1]}/${ano}`;
}

export const TeacherPaymentsView: React.FC<TeacherPaymentsViewProps> = ({
  onOpenTeacherPaymentModal,
  onSuccessConfirmation,
}) => {
  const { currentUser, isAdmin } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'REPASSES' | 'ADIANTAMENTOS'>('REPASSES');
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());
  const [confirmingAdvanceId, setConfirmingAdvanceId] = useState<string | null>(null);
  const [isRequestAdvanceModalOpen, setIsRequestAdvanceModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [pagamentos, setPagamentos] = useState<RepasseProfessor[]>([]);
  const [loadingRepasses, setLoadingRepasses] = useState(true);
  const [repassesError, setRepassesError] = useState('');
  const [retryRepasses, setRetryRepasses] = useState(0);
  const pendingConfirmations = useRef(new Map<string, AbortController>());
  const pendingAdvanceConfirmation = useRef<AbortController | null>(null);

  useEffect(() => {
    setConfirmingAdvanceId(null);
    return () => {
      pendingAdvanceConfirmation.current?.abort();
      pendingAdvanceConfirmation.current = null;
    };
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    const pending = pendingConfirmations.current;
    setConfirmingIds(new Set());
    return () => {
      pending.forEach((controller) => controller.abort());
      pending.clear();
    };
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    const controller = new AbortController();
    setPagamentos([]);
    setRepassesError('');
    setLoadingRepasses(true);
    if (currentUser) {
      // Sem professorId: a sessão determina o isolamento no backend.
      repassesApi.listAll({}, controller.signal).then((rows) => {
        if (!controller.signal.aborted) setPagamentos(rows);
      }).catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) return;
        setRepassesError(error instanceof Error ? error.message : 'Erro ao carregar repasses.');
      }).finally(() => {
        if (!controller.signal.aborted) setLoadingRepasses(false);
      });
    }
    return () => controller.abort();
  }, [currentUser?.id, currentUser?.role, refreshTick, retryRepasses]);

  // Todos os hooks executam também durante a restauração da sessão.
  if (!currentUser) {
    return (
      <div className="min-h-[200px] flex items-center justify-center text-zinc-400">
        <div className="text-sm font-bold">Carregando usuário...</div>
      </div>
    );
  }

  const triggerLocalRefresh = () => setRefreshTick((prev) => prev + 1);

  // Professor só carrega ESTRITAMENTE seus próprios adiantamentos
  const [adiantamentos, setAdiantamentos] = useState<AdiantamentoProfessor[]>([]);
  const [loadingAdiantamentos, setLoadingAdiantamentos] = useState(true);
  const [adiantamentosError, setAdiantamentosError] = useState('');
  const [retryAdiantamentos, setRetryAdiantamentos] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setAdiantamentos([]);
    setAdiantamentosError('');
    setLoadingAdiantamentos(true);
    if (!isAdmin && currentUser) {
      adiantamentosApi.listAll({}, controller.signal).then((rows) => {
        if (!controller.signal.aborted) setAdiantamentos(rows);
      }).catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) return;
        setAdiantamentosError(error instanceof Error ? error.message : 'Erro ao carregar adiantamentos.');
      }).finally(() => {
        if (!controller.signal.aborted) setLoadingAdiantamentos(false);
      });
    } else {
      setLoadingAdiantamentos(false);
    }
    return () => controller.abort();
  }, [currentUser?.id, currentUser?.role, refreshTick, retryAdiantamentos]);

  // Contadores para badges discretos
  const repassesPendentes = pagamentos.filter(
    (p) => p.status === 'AGUARDANDO_RECEBIMENTO' && p.professorId === currentUser.id
  ).length;

  const adiantamentosAguardandoAcao = adiantamentos.filter(
    (a) => a.status === 'PAGO_AGUARDANDO_CONFIRMACAO'
  ).length;

  // Handler de confirmação de Repasse normal
  const handleConfirmarRecebimento = async (pagamentoId: string) => {
    const repasse = pagamentos.find((item) => item.id === pagamentoId);
    if (currentUser.role !== 'PROFESSOR' || repasse?.professorId !== currentUser.id ||
        repasse.status !== 'AGUARDANDO_RECEBIMENTO' || pendingConfirmations.current.has(pagamentoId)) return;
    const controller = new AbortController();
    pendingConfirmations.current.set(pagamentoId, controller);
    setConfirmingIds((ids) => new Set(ids).add(pagamentoId));
    try {
      const confirmado = await repassesApi.confirmReceipt(pagamentoId, controller.signal);
      if (controller.signal.aborted) return;
      setPagamentos((rows) => rows.map((item) => item.id === confirmado.id ? confirmado : item));
      setFeedbackMessage({
        type: 'success',
        text: 'Recebimento de repasse confirmado com sucesso! Recibo digital emitido.',
      });
    } catch (err: unknown) {
      if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao confirmar recebimento.',
      });
      return;
    } finally {
      if (pendingConfirmations.current.get(pagamentoId) === controller) {
        pendingConfirmations.current.delete(pagamentoId);
        if (!controller.signal.aborted) setConfirmingIds((ids) => {
          const next = new Set(ids); next.delete(pagamentoId); return next;
        });
      }
    }
    onSuccessConfirmation?.();
  };

  // Handler de confirmação de Adiantamento
  const handleConfirmarRecebimentoAdiantamento = async (adiantamentoId: string) => {
    if (!currentUser || currentUser.role !== 'PROFESSOR') return;
    const adiantamento = adiantamentos.find((item) => item.id === adiantamentoId);
    if (!adiantamento || adiantamento.professorId !== currentUser.id ||
        adiantamento.status !== 'PAGO_AGUARDANDO_CONFIRMACAO' || pendingAdvanceConfirmation.current) return;
    const controller = new AbortController();
    pendingAdvanceConfirmation.current = controller;
    setConfirmingAdvanceId(adiantamentoId);
    try {
      const confirmado = await adiantamentosApi.confirmReceipt(adiantamentoId, controller.signal);
      if (controller.signal.aborted) return;
      setAdiantamentos((rows) => rows.map((item) => item.id === adiantamentoId ? confirmado : item));
      setFeedbackMessage({
        type: 'success',
        text: 'Recebimento de adiantamento confirmado! Recibo digital registrado.',
      });
    } catch (err: unknown) {
      if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao confirmar recebimento de adiantamento.',
      });
      return;
    } finally {
      if (pendingAdvanceConfirmation.current === controller) {
        pendingAdvanceConfirmation.current = null;
        if (!controller.signal.aborted) setConfirmingAdvanceId(null);
      }
    }
    onSuccessConfirmation?.();
  };

  const handleAdvanceSuccess = () => {
    triggerLocalRefresh();
    setFeedbackMessage({
      type: 'success',
      text: 'Solicitação de adiantamento enviada para análise da administração!',
    });
  };

  return (
    <div id="teacher-payments-view" key={`view-${refreshTick}`} className="space-y-4 pb-20">
      {/* Sub-navegação exclusiva do PROFESSOR (Mobile-first, compacta e acessível) */}
      {!isAdmin && (
        <div id="teacher-subtabs" className="flex gap-2 border-b border-white/10 pb-3">
          <button
            type="button"
            id="btn-subtab-repasses"
            onClick={() => {
              setActiveSubTab('REPASSES');
              setFeedbackMessage(null);
            }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'REPASSES'
                ? 'bg-lime-400 text-black shadow-md shadow-lime-400/20'
                : 'bg-[#18181b] border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>Repasses</span>
            {repassesPendentes > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeSubTab === 'REPASSES'
                    ? 'bg-black text-lime-400'
                    : 'bg-amber-400 text-black'
                }`}
              >
                {repassesPendentes}
              </span>
            )}
          </button>

          <button
            type="button"
            id="btn-subtab-adiantamentos"
            onClick={() => {
              setActiveSubTab('ADIANTAMENTOS');
              setFeedbackMessage(null);
            }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'ADIANTAMENTOS'
                ? 'bg-lime-400 text-black shadow-md shadow-lime-400/20'
                : 'bg-[#18181b] border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>Adiantamentos</span>
            {adiantamentosAguardandoAcao > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeSubTab === 'ADIANTAMENTOS'
                    ? 'bg-black text-lime-400'
                    : 'bg-amber-400 text-black'
                }`}
              >
                {adiantamentosAguardandoAcao}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Banner de Feedback / Notificação */}
      {feedbackMessage && (
        <div
          id="teacher-payments-feedback"
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
            feedbackMessage.type === 'success'
              ? 'bg-lime-500/10 border-lime-500/20 text-lime-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-lime-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span className="leading-snug">{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-zinc-400 hover:text-white text-xs font-bold shrink-0 ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: REPASSES (Original e intacta para Admin e Professor)              */}
      {/* ========================================================================= */}
      {(isAdmin || activeSubTab === 'REPASSES') && (
        <div className="space-y-4">
          {/* Header de Repasses */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-black text-white leading-tight tracking-tight">
                {isAdmin ? 'Repasses' : 'Recebimentos de Repasses'}
              </h2>
              <p className="text-xs text-zinc-400">
                {isAdmin
                  ? 'Controle de repasses da academia para a equipe técnica'
                  : 'Repasses registrados para você (recibos digitais)'}
              </p>
            </div>

            {isAdmin && onOpenTeacherPaymentModal && (
              <button
                type="button"
                id="btn-admin-novo-repasse"
                onClick={onOpenTeacherPaymentModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-xs shadow-lg shadow-lime-500/20 transition-all active:scale-95 shrink-0"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>+ Registrar Repasse</span>
              </button>
            )}
          </div>

          {/* Informação compacta e discreta de privacidade e recibo */}
          {!isAdmin && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#121214] border border-white/5 text-xs text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-zinc-500 shrink-0" />
              <p className="text-xs text-zinc-300">
                <span>Você visualiza seus próprios repasses. A administração também tem acesso.</span>{' '}
                <span className="text-zinc-500">Ao confirmar, o recebimento ficará registrado como recibo digital.</span>
              </p>
            </div>
          )}

          {/* Lista de Pagamentos de Repasse */}
          {loadingRepasses ? (
            <p role="status" className="p-4 text-xs text-zinc-400">Carregando repasses...</p>
          ) : repassesError ? (
            <div role="alert" className="p-3.5 rounded-2xl border border-red-500/20 bg-red-500/10 text-xs text-red-300">
              {repassesError} <button type="button" onClick={() => setRetryRepasses((value) => value + 1)} className="underline">Tentar novamente</button>
            </div>
          ) : pagamentos.length === 0 ? (
            <div className="p-8 text-center bg-[#18181b] rounded-2xl border border-white/10 space-y-2 text-white">
              <Wallet className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-200">
                Nenhum repasse encontrado.
              </p>
              <p className="text-xs text-zinc-400">
                {isAdmin
                  ? 'Utilize o botão acima para lançar o primeiro repasse de professor.'
                  : 'Nenhum repasse registrado para a sua conta no momento.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagamentos.map((pag) => {
                const isPendente = pag.status === 'AGUARDANDO_RECEBIMENTO';
                const isConfirmado = pag.status === 'RECEBIMENTO_CONFIRMADO';
                const isMyPayment = pag.professorId === currentUser.id;

                return (
                  <div
                    key={pag.id}
                    id={`card-pag-prof-${pag.id}`}
                    className={`p-4 rounded-2xl border transition-all shadow-md shadow-black/20 space-y-3 text-white ${
                      isPendente ? 'border-amber-400/30 bg-[#1e1c12]' : 'border-white/10 bg-[#18181b]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-zinc-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                            {formatCompetencia(pag.competencia)}
                          </span>
                          <span className="text-xs font-semibold text-zinc-400">
                            via {formasRepasse[pag.formaPagamento]}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white mt-1 leading-tight truncate">
                          {isAdmin ? formatProfessorNome(pag.professorNome) : 'Repasse de Aulas / Mensal'}
                        </h3>

                        <p className="text-xs text-zinc-400 mt-0.5">
                          Pago pela academia em {formatDateBR(pag.dataRepasse)}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base sm:text-lg font-black text-white block">
                          {formatCurrency(pag.valor)}
                        </span>
                        {isPendente && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full mt-0.5 border border-amber-400/30">
                            <Clock className="w-3 h-3" />
                            <span>Aguardando confirmação</span>
                          </span>
                        )}
                        {isConfirmado && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded-full mt-0.5 border border-lime-400/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Recebimento confirmado</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Recibo digital ou Botão para Confirmar */}
                    <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-xs text-zinc-400">
                        {isConfirmado ? (
                          <div className="flex items-center gap-1.5 text-lime-400 font-medium">
                            <FileCheck className="w-4 h-4 text-lime-400 shrink-0" />
                            <span>
                              Recebimento confirmado pelo professor em {formatDateTimeBR(pag.confirmadoEm || '')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-300/90">
                            {isAdmin
                              ? 'Aguardando o professor confirmar o recebimento.'
                              : 'Confira se o valor entrou na sua conta bancária.'}
                          </span>
                        )}
                      </div>

                      {/* Somente o PROFESSOR destinatário; backend continua autoridade final. */}
                      {currentUser.role === 'PROFESSOR' && isPendente && isMyPayment && (
                        <button
                          type="button"
                          id={`btn-confirmar-recebimento-${pag.id}`}
                          onClick={() => handleConfirmarRecebimento(pag.id)}
                          disabled={confirmingIds.has(pag.id)}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-xs shadow-lg shadow-lime-500/20 transition-all active:scale-95 shrink-0 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>
                            {confirmingIds.has(pag.id)
                              ? 'Confirmando...'
                              : 'Confirmar que recebi'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: ADIANTAMENTOS (Exclusiva do Professor)                             */}
      {/* ========================================================================= */}
      {!isAdmin && activeSubTab === 'ADIANTAMENTOS' && (
        <div id="section-adiantamentos-professor" className="space-y-4">
          {/* Cabeçalho da Seção Adiantamentos */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white leading-tight tracking-tight">
                Meus Adiantamentos
              </h2>
              <p className="text-xs text-zinc-400">
                Solicitações de adiantamento e confirmação de recebimentos
              </p>
            </div>

            <button
              type="button"
              id="btn-solicitar-adiantamento"
              onClick={() => setIsRequestAdvanceModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-xs shadow-lg shadow-lime-500/20 transition-all active:scale-95 shrink-0"
            >
              <HandCoins className="w-4 h-4 stroke-[2.5]" />
              <span>+ Solicitar Adiantamento</span>
            </button>
          </div>

          {/* Card de Informação e Privacidade */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#121214] border border-white/5 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-zinc-500 shrink-0" />
            <p className="text-xs text-zinc-300">
              <span>Somente você visualiza suas solicitações de adiantamento.</span>{' '}
              <span className="text-zinc-500">A confirmação gera seu recibo digital após pagamento registrado.</span>
            </p>
          </div>

          {/* Lista de Adiantamentos */}
          {loadingAdiantamentos ? (
            <p role="status" className="p-4 text-xs text-zinc-400">Carregando adiantamentos...</p>
          ) : adiantamentosError ? (
            <div role="alert" className="p-3.5 rounded-2xl border border-red-500/20 bg-red-500/10 text-xs text-red-300">
              {adiantamentosError} <button type="button" onClick={() => setRetryAdiantamentos((v) => v + 1)} className="underline">Tentar novamente</button>
            </div>
          ) : adiantamentos.length === 0 ? (
            <div
              id="empty-state-adiantamentos"
              className="p-8 text-center bg-[#18181b] rounded-2xl border border-white/10 space-y-3 text-white"
            >
              <HandCoins className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-200">
                Você ainda não possui solicitações de adiantamento.
              </p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Caso precise antecipar valores, clique no botão acima para enviar uma solicitação para a administração.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {adiantamentos.map((adiant) => {
                const isSolicitado = adiant.status === 'SOLICITADO';
                const isRecusado = adiant.status === 'RECUSADO';
                const isPagoAguardando = adiant.status === 'PAGO_AGUARDANDO_CONFIRMACAO';
                const isConfirmado = adiant.status === 'CONFIRMADO';

                return (
                  <div
                    key={adiant.id}
                    id={`card-adiantamento-${adiant.id}`}
                    className={`p-4 rounded-2xl border transition-all shadow-md shadow-black/20 space-y-3 text-white ${
                      isPagoAguardando
                        ? 'border-amber-400/40 bg-[#1e1c12]'
                        : isRecusado
                        ? 'border-red-500/20 bg-[#181515]'
                        : 'border-white/10 bg-[#18181b]'
                    }`}
                  >
                    {/* Topo do Card: Valor e Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-base sm:text-lg font-black text-white block">
                          {formatCurrency(adiant.valor)}
                        </span>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Solicitado em {formatDateBR(adiant.createdAt)}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {/* 1. SOLICITADO */}
                        {isSolicitado && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-300 bg-amber-400/20 px-2.5 py-1 rounded-full border border-amber-400/30">
                            <Clock className="w-3 h-3" />
                            <span>Aguardando análise</span>
                          </span>
                        )}

                        {/* 2. RECUSADO */}
                        {isRecusado && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                            <AlertCircle className="w-3 h-3" />
                            <span>Solicitação recusada</span>
                          </span>
                        )}

                        {/* 3. PAGO_AGUARDANDO_CONFIRMACAO */}
                        {isPagoAguardando && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-300 bg-amber-400/20 px-2.5 py-1 rounded-full border border-amber-400/30">
                              <Clock className="w-3 h-3" />
                              <span>Aguardando sua confirmação</span>
                            </span>
                            <span className="text-[10px] font-bold text-amber-300/80">
                              Pagamento realizado
                            </span>
                          </div>
                        )}

                        {/* 4. CONFIRMADO */}
                        {isConfirmado && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-lime-400 bg-lime-400/10 px-2.5 py-1 rounded-full border border-lime-400/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Recebimento confirmado</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Observação / Motivo informado pelo professor */}
                    {adiant.motivo && (
                      <div className="text-xs text-zinc-300 bg-white/5 p-2.5 rounded-xl border border-white/5">
                        <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">
                          Motivo informado:
                        </span>
                        <p className="mt-0.5 break-words">{adiant.motivo}</p>
                      </div>
                    )}

                    {/* Se RECUSADO: Exibir motivo da recusa com destaque */}
                    {isRecusado && adiant.motivoRecusa && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-1">
                        <span className="font-bold text-red-200 block text-[11px]">
                          Motivo da recusa:
                        </span>
                        <p className="break-words">{adiant.motivoRecusa}</p>
                        {adiant.analisadoEm && (
                          <span className="text-[10px] text-red-400/70 block mt-1">
                            Analisado em {formatDateBR(adiant.analisadoEm)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Se PAGO_AGUARDANDO_CONFIRMACAO ou CONFIRMADO: Apresentar dados reais do pagamento */}
                    {(isPagoAguardando || isConfirmado) && (
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs space-y-1.5">
                        <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">
                          Dados do Pagamento Realizado:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-zinc-300">
                          <div>
                            <span className="text-zinc-500">Data do Pagamento:</span>{' '}
                            <span className="font-semibold text-white">
                              {adiant.dataPagamento ? formatDateBR(adiant.dataPagamento) : 'Data não informada'}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Forma de Pagamento:</span>{' '}
                            <span className="font-semibold text-white">
                              {adiant.formaPagamento || 'PIX'}
                            </span>
                          </div>
                        </div>

                        {adiant.observacaoPagamento && (
                          <div className="text-xs text-zinc-300 pt-1 border-t border-white/5">
                            <span className="text-zinc-500 text-[10px] block">Observação da Gestão:</span>
                            <p className="mt-0.5 text-zinc-300 italic break-words">
                              "{adiant.observacaoPagamento}"
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rodapé do Card com Ações */}
                    {isPagoAguardando && (
                      <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-xs text-amber-300/90 leading-tight">
                          Confira se o valor de <strong className="text-white">{formatCurrency(adiant.valor)}</strong> entrou na sua conta bancária.
                        </p>
                        <button
                          type="button"
                          id={`btn-confirmar-recebimento-adiantamento-${adiant.id}`}
                          onClick={() => handleConfirmarRecebimentoAdiantamento(adiant.id)}
                          disabled={confirmingAdvanceId !== null}
                          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-xs shadow-lg shadow-lime-500/20 transition-all active:scale-95 shrink-0 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>
                            {confirmingAdvanceId === adiant.id
                              ? 'Confirmando...'
                              : 'Confirmar que Recebi'}
                          </span>
                        </button>
                      </div>
                    )}

                    {isConfirmado && (
                      <div className="pt-2 border-t border-white/10 flex items-center gap-1.5 text-lime-400 font-medium text-xs">
                        <FileCheck className="w-4 h-4 text-lime-400 shrink-0" />
                        <span>
                          Recibo assinado digitalmente em {formatDateTimeBR(adiant.confirmadoEm || '')}
                        </span>
                      </div>
                    )}

                    {isSolicitado && (
                      <div className="pt-2 border-t border-white/10 text-xs text-zinc-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                        <span>Sua solicitação está na fila de análise da administração da academia.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Solicitação de Adiantamento */}
      <RequestAdvanceModal
        isOpen={isRequestAdvanceModalOpen}
        onClose={() => setIsRequestAdvanceModalOpen(false)}
        onSuccess={handleAdvanceSuccess}
      />
    </div>
  );
};
