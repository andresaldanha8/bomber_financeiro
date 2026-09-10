import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  financeService,
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  formatProfessorNome,
} from '../services/financeService';
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

export const TeacherPaymentsView: React.FC<TeacherPaymentsViewProps> = ({
  onOpenTeacherPaymentModal,
  onSuccessConfirmation,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'REPASSES' | 'ADIANTAMENTOS'>('REPASSES');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmingAdvanceId, setConfirmingAdvanceId] = useState<string | null>(null);
  const [isRequestAdvanceModalOpen, setIsRequestAdvanceModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const triggerLocalRefresh = () => setRefreshTick((prev) => prev + 1);

  // Se professor: busca ESTRITAMENTE os pagamentos e adiantamentos dele!
  // Se admin: busca todos os pagamentos da equipe
  const pagamentos = isAdmin
    ? financeService.getPagamentosProfessores()
    : financeService.getPagamentosProfessores(currentUser.id);

  // Professor só carrega ESTRITAMENTE seus próprios adiantamentos
  const adiantamentos = isAdmin
    ? []
    : financeService.getAdiantamentosProfessores(currentUser.id);

  // Contadores para badges discretos
  const repassesPendentes = pagamentos.filter(
    (p) => p.status === 'AGUARDANDO_RECEBIMENTO' && p.professorId === currentUser.id
  ).length;

  const adiantamentosAguardandoAcao = adiantamentos.filter(
    (a) => a.status === 'PAGO_AGUARDANDO_CONFIRMACAO'
  ).length;

  // Handler de confirmação de Repasse normal
  const handleConfirmarRecebimento = (pagamentoId: string) => {
    try {
      setConfirmingId(pagamentoId);
      financeService.confirmarRecebimentoProfessor(pagamentoId, currentUser);
      triggerLocalRefresh();
      setFeedbackMessage({
        type: 'success',
        text: 'Recebimento de repasse confirmado com sucesso! Recibo digital emitido.',
      });
      if (onSuccessConfirmation) onSuccessConfirmation();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Erro ao confirmar recebimento.',
      });
    } finally {
      setConfirmingId(null);
    }
  };

  // Handler de confirmação de Adiantamento
  const handleConfirmarRecebimentoAdiantamento = (adiantamentoId: string) => {
    try {
      setConfirmingAdvanceId(adiantamentoId);
      financeService.confirmarRecebimentoAdiantamento(adiantamentoId, currentUser);
      triggerLocalRefresh();
      setFeedbackMessage({
        type: 'success',
        text: 'Recebimento de adiantamento confirmado! Recibo digital registrado.',
      });
      if (onSuccessConfirmation) onSuccessConfirmation();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Erro ao confirmar recebimento de adiantamento.',
      });
    } finally {
      setConfirmingAdvanceId(null);
    }
  };

  const handleAdvanceSuccess = () => {
    triggerLocalRefresh();
    setFeedbackMessage({
      type: 'success',
      text: 'Solicitação de adiantamento enviada para análise da administração!',
    });
    if (onSuccessConfirmation) onSuccessConfirmation();
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
                {isAdmin ? 'Repasses e Pagamentos aos Professores' : 'Recebimentos de Repasses'}
              </h2>
              <p className="text-xs text-zinc-400">
                {isAdmin
                  ? 'Controle de pagamentos da academia para a equipe técnica'
                  : 'Pagamentos que a academia realiza para você (recibos digitais)'}
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
                <span>Somente você visualiza seus recebimentos.</span>{' '}
                <span className="text-zinc-500">Ao confirmar, o recebimento ficará registrado como recibo digital.</span>
              </p>
            </div>
          )}

          {/* Lista de Pagamentos de Repasse */}
          {pagamentos.length === 0 ? (
            <div className="p-8 text-center bg-[#18181b] rounded-2xl border border-white/10 space-y-2 text-white">
              <Wallet className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-200">
                Nenhum registro de pagamento encontrado.
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
                            {pag.competencia}
                          </span>
                          <span className="text-xs font-semibold text-zinc-400">
                            via {pag.formaPagamento}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white mt-1 leading-tight truncate">
                          {isAdmin ? formatProfessorNome(pag.professorNome) : 'Repasse de Aulas / Mensal'}
                        </h3>

                        <p className="text-xs text-zinc-400 mt-0.5">
                          Pago pela academia em {formatDateBR(pag.dataPagamento)}
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
                            <span>Confirmado</span>
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
                              Recibo assinado pelo professor em {formatDateTimeBR(pag.confirmadoEm || '')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-300/90">
                            {isAdmin
                              ? 'Aguardando o professor assinar o recibo no app dele.'
                              : 'Confira se o valor entrou na sua conta bancária.'}
                          </span>
                        )}
                      </div>

                      {/* Apenas o professor dono do pagamento (ou admin testando) pode clicar no botão */}
                      {isPendente && isMyPayment && (
                        <button
                          type="button"
                          id={`btn-confirmar-recebimento-${pag.id}`}
                          onClick={() => handleConfirmarRecebimento(pag.id)}
                          disabled={confirmingId === pag.id}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-xs shadow-lg shadow-lime-500/20 transition-all active:scale-95 shrink-0 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>
                            {confirmingId === pag.id
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
          {adiantamentos.length === 0 ? (
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
                          Solicitado em {formatDateBR(adiant.dataSolicitacao)}
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
                          disabled={confirmingAdvanceId === adiant.id}
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
                          Recibo assinado digitalmente em {formatDateTimeBR(adiant.confirmadoRecebimentoEm || '')}
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

