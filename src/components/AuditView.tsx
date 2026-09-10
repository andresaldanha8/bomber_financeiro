import React, { useState } from 'react';
import {
  financeService,
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  formatProfessorNome,
  cleanProfDuplication,
} from '../services/financeService';
import {
  ShieldCheck,
  User,
  Clock,
  Search,
  CheckCircle,
  CheckCircle2,
  Ban,
  AlertCircle,
  HandCoins,
} from 'lucide-react';
import { TeacherPaymentsView } from './TeacherPaymentsView';
import { AdminPayAdvanceModal } from './AdminPayAdvanceModal';
import { AdminRejectAdvanceModal } from './AdminRejectAdvanceModal';
import { AdiantamentoProfessor } from '../types';

interface AuditViewProps {
  onOpenTeacherPaymentModal: () => void;
}

type SubTabType = 'REPASSES' | 'ADIANTAMENTOS' | 'AUDITORIA';

export const AuditView: React.FC<AuditViewProps> = ({ onOpenTeacherPaymentModal }) => {
  const [subTab, setSubTab] = useState<SubTabType>('REPASSES');
  const [search, setSearch] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);

  // Modais administrativos de adiantamento
  const [payModalAdiantamento, setPayModalAdiantamento] = useState<AdiantamentoProfessor | null>(null);
  const [rejectModalAdiantamento, setRejectModalAdiantamento] = useState<AdiantamentoProfessor | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  const triggerRefresh = () => setRefreshTick((prev) => prev + 1);

  // Adiantamentos (ADMIN visualiza todos os professores)
  const todosAdiantamentos = financeService.getAdiantamentosProfessores();
  const solicitadosCount = todosAdiantamentos.filter((a) => a.status === 'SOLICITADO').length;

  // Ordenação rígida solicitada:
  // 1. SOLICITADO
  // 2. PAGO_AGUARDANDO_CONFIRMACAO
  // 3. CONFIRMADO
  // 4. RECUSADO
  // Dentro de cada grupo, mais recentes primeiro
  const STATUS_ORDER: Record<string, number> = {
    SOLICITADO: 1,
    PAGO_AGUARDANDO_CONFIRMACAO: 2,
    CONFIRMADO: 3,
    RECUSADO: 4,
  };

  const adiantamentosOrdenados = [...todosAdiantamentos].sort((a, b) => {
    const orderA = STATUS_ORDER[a.status] || 99;
    const orderB = STATUS_ORDER[b.status] || 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return b.dataSolicitacao.localeCompare(a.dataSolicitacao);
  });

  // Logs de auditoria
  const logs = financeService.getAuditoriaLogs();
  const logsFiltrados =
    search.trim() === ''
      ? logs
      : logs.filter(
          (l) =>
            l.acao.toLowerCase().includes(search.toLowerCase()) ||
            l.detalhes.toLowerCase().includes(search.toLowerCase()) ||
            l.usuarioNome.toLowerCase().includes(search.toLowerCase())
        );

  const handlePaySuccess = (nomeProf: string, valor: number) => {
    setPayModalAdiantamento(null);
    triggerRefresh();
    setFeedback({
      type: 'success',
      text: `Pagamento de ${formatCurrency(valor)} para ${formatProfessorNome(nomeProf)} registrado no Caixa com sucesso!`,
    });
  };

  const handleRejectSuccess = (nomeProf: string) => {
    setRejectModalAdiantamento(null);
    triggerRefresh();
    setFeedback({
      type: 'info',
      text: `Solicitação de adiantamento de ${formatProfessorNome(nomeProf)} recusada. Nenhuma saída gerada no Caixa.`,
    });
  };

  return (
    <div id="audit-view" key={`audit-view-${refreshTick}`} className="space-y-4 pb-20">
      {/* Sub-navegação: Repasses | Adiantamentos | Auditoria */}
      <div className="flex gap-1.5 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          type="button"
          id="btn-sub-repasses"
          onClick={() => {
            setSubTab('REPASSES');
            setFeedback(null);
          }}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
            subTab === 'REPASSES'
              ? 'bg-lime-400 text-black shadow-xs'
              : 'bg-[#18181b] border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          Repasses
        </button>

        <button
          type="button"
          id="btn-sub-adiantamentos"
          onClick={() => {
            setSubTab('ADIANTAMENTOS');
            setFeedback(null);
          }}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
            subTab === 'ADIANTAMENTOS'
              ? 'bg-lime-400 text-black shadow-xs'
              : 'bg-[#18181b] border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <span>Adiantamentos</span>
          {solicitadosCount > 0 && (
            <span
              id="badge-adiantamentos-solicitados"
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                subTab === 'ADIANTAMENTOS'
                  ? 'bg-black text-lime-400'
                  : 'bg-amber-400 text-black'
              }`}
            >
              {solicitadosCount}
            </span>
          )}
        </button>

        <button
          type="button"
          id="btn-sub-auditoria"
          onClick={() => {
            setSubTab('AUDITORIA');
            setFeedback(null);
          }}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
            subTab === 'AUDITORIA'
              ? 'bg-lime-400 text-black shadow-xs'
              : 'bg-[#18181b] border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          Auditoria
        </button>
      </div>

      {/* Banner de Feedback da Ação */}
      {feedback && (
        <div
          id="admin-advance-feedback"
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-lime-500/10 border-lime-500/20 text-lime-300'
              : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-lime-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-blue-400" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold hover:underline opacity-80"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 1. SUB-ABA REPASSES (Preservada exatamente como funciona hoje) */}
      {subTab === 'REPASSES' && (
        <TeacherPaymentsView onOpenTeacherPaymentModal={onOpenTeacherPaymentModal} />
      )}

      {/* 2. SUB-ABA ADIANTAMENTOS (Gestão Administrativa dos Professores) */}
      {subTab === 'ADIANTAMENTOS' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-base font-black text-white leading-tight tracking-tight">
                Adiantamentos dos Professores
              </h2>
              <p className="text-xs text-zinc-400">
                Gestão e registro de adiantamentos solicitados pela equipe
              </p>
            </div>
            {solicitadosCount > 0 && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{solicitadosCount} aguardando análise</span>
              </span>
            )}
          </div>

          {/* Lista de Cards Administrativos */}
          {adiantamentosOrdenados.length === 0 ? (
            <div className="p-8 text-center bg-[#18181b] rounded-2xl border border-white/10 space-y-2 text-white">
              <HandCoins className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-200">
                Nenhum adiantamento registrado até o momento.
              </p>
              <p className="text-xs text-zinc-400">
                As solicitações feitas pelos professores aparecerão automaticamente aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {adiantamentosOrdenados.map((adiant) => {
                const isSolicitado = adiant.status === 'SOLICITADO';
                const isPagoAguardando = adiant.status === 'PAGO_AGUARDANDO_CONFIRMACAO';
                const isConfirmado = adiant.status === 'CONFIRMADO';
                const isRecusado = adiant.status === 'RECUSADO';

                return (
                  <div
                    key={adiant.id}
                    id={`admin-card-adiant-${adiant.id}`}
                    className={`p-4 rounded-2xl border transition-all shadow-md shadow-black/20 space-y-3 text-white ${
                      isSolicitado
                        ? 'border-amber-400/40 bg-[#1e1c12]'
                        : isPagoAguardando
                        ? 'border-blue-500/30 bg-[#101928]'
                        : isConfirmado
                        ? 'border-emerald-500/30 bg-[#0f1d16]'
                        : 'border-white/10 bg-[#18181b]'
                    }`}
                  >
                    {/* Linha Superior: Nome do Professor + Status Visual (Layout mobile-first sem sobreposição) */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
                          <User className="w-4 h-4 text-zinc-300" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-white leading-tight break-words">
                            {formatProfessorNome(adiant.professorNome)}
                          </h3>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            Solicitado em {formatDateTimeBR(adiant.dataSolicitacao)}
                          </p>
                        </div>
                      </div>

                      {/* Mapeamento visual estrito de status: badge no mobile ocupa linha própria sem competir com o nome */}
                      <div className="self-start sm:self-auto shrink-0 max-w-full">
                        {isSolicitado && (
                          <span
                            id={`status-adiant-${adiant.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 leading-snug"
                          >
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Aguardando análise</span>
                          </span>
                        )}
                        {isPagoAguardando && (
                          <span
                            id={`status-adiant-${adiant.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 leading-snug"
                          >
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>PAGO — AGUARDANDO CONFIRMAÇÃO</span>
                          </span>
                        )}
                        {isConfirmado && (
                          <span
                            id={`status-adiant-${adiant.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 leading-snug"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>ADIANTAMENTO CONFIRMADO PELO PROFESSOR</span>
                          </span>
                        )}
                        {isRecusado && (
                          <span
                            id={`status-adiant-${adiant.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 leading-snug"
                          >
                            <Ban className="w-3.5 h-3.5 shrink-0" />
                            <span>Solicitação recusada</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Valor do Adiantamento */}
                    <div className="flex items-baseline justify-between pt-1 border-t border-white/5">
                      <span className="text-xs text-zinc-400">Valor do Adiantamento:</span>
                      <span className="text-base sm:text-lg font-black text-white">
                        {formatCurrency(adiant.valor)}
                      </span>
                    </div>

                    {/* Observação / Motivo se existir */}
                    {adiant.motivo && (
                      <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-xs text-zinc-300">
                        <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider mb-0.5">
                          Motivo informado:
                        </span>
                        <p className="italic text-zinc-300">"{adiant.motivo}"</p>
                      </div>
                    )}

                    {/* Detalhes para PAGO_AGUARDANDO_CONFIRMACAO */}
                    {isPagoAguardando && (
                      <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/20 text-xs space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
                          <span className="text-zinc-400">Data real do pagamento:</span>
                          <span className="font-bold text-white">
                            {formatDateBR(adiant.dataPagamento || '')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
                          <span className="text-zinc-400">Forma:</span>
                          <span className="font-bold text-white">{adiant.formaPagamento || 'PIX'}</span>
                        </div>
                        {adiant.observacaoPagamento && (
                          <div className="pt-1 border-t border-white/5 text-[11px]">
                            <span className="text-zinc-400">Observação: </span>
                            <span className="text-zinc-200">{adiant.observacaoPagamento}</span>
                          </div>
                        )}
                        <p className="text-[10px] text-blue-300/80 pt-1">
                          Saída já registrada no Caixa. Aguardando recibo digital do professor.
                        </p>
                      </div>
                    )}

                    {/* Detalhes para CONFIRMADO */}
                    {isConfirmado && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-xs space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
                          <span className="text-zinc-400">Recibo digital assinado em:</span>
                          <span className="font-bold text-emerald-300">
                            {formatDateTimeBR(adiant.confirmadoRecebimentoEm || '')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
                          <span className="text-zinc-400">Data do pagamento:</span>
                          <span className="font-medium text-white">
                            {formatDateBR(adiant.dataPagamento || '')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
                          <span className="text-zinc-400">Forma:</span>
                          <span className="font-medium text-white">{adiant.formaPagamento || 'PIX'}</span>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
                          <span className="text-zinc-400">Valor quitado:</span>
                          <span className="font-bold text-emerald-400">
                            {formatCurrency(adiant.valor)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Detalhes para RECUSADO */}
                    {isRecusado && (
                      <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/20 text-xs space-y-1">
                        {adiant.motivoRecusa ? (
                          <div>
                            <span className="text-[10px] text-red-400 block font-bold uppercase tracking-wider">
                              Motivo da Recusa:
                            </span>
                            <p className="text-zinc-300 italic">"{adiant.motivoRecusa}"</p>
                          </div>
                        ) : (
                          <p className="text-zinc-400 text-[11px]">Solicitação recusada sem motivo registrado.</p>
                        )}
                        {adiant.analisadoEm && (
                          <p className="text-[10px] text-zinc-500 pt-0.5">
                            Analisado em {formatDateTimeBR(adiant.analisadoEm)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Ações para SOLICITADO */}
                    {isSolicitado && (
                      <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/5 flex-wrap">
                        <button
                          type="button"
                          id={`btn-reject-advance-${adiant.id}`}
                          onClick={() => setRejectModalAdiantamento(adiant)}
                          className="px-3.5 py-2 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 font-bold text-xs transition-all flex items-center gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Recusar</span>
                        </button>

                        <button
                          type="button"
                          id={`btn-pay-advance-${adiant.id}`}
                          onClick={() => setPayModalAdiantamento(adiant)}
                          className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs transition-all shadow-md shadow-lime-400/20 flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Registrar Pagamento</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. SUB-ABA AUDITORIA (Trilha de auditoria renomeada visualmente, sem perda de dados) */}
      {subTab === 'AUDITORIA' && (
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-black text-white leading-tight tracking-tight">
              Trilha de Auditoria & Imutabilidade
            </h2>
            <p className="text-xs text-zinc-400">
              Histórico operacional de quem fez, quando fez e o que foi alterado no financeiro.
            </p>
          </div>

          {/* Busca de eventos */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              placeholder="Buscar por usuário, ação ou detalhe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-white/10 bg-[#18181b] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          {/* Lista de Logs */}
          <div className="bg-[#18181b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden shadow-md shadow-black/20">
            {logsFiltrados.map((log) => (
              <div key={log.id} className="p-3 space-y-1 text-white">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{log.acao}</span>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    {formatDateTimeBR(log.dataHora)}
                  </span>
                </div>
                <p className="text-xs text-zinc-300">{cleanProfDuplication(log.detalhes)}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 pt-0.5">
                  <User className="w-3 h-3 text-lime-400" />
                  <span>
                    Operador: <strong className="text-zinc-200">{formatProfessorNome(log.usuarioNome)}</strong>
                  </span>
                  <span>•</span>
                  <span>Entidade: {log.entidade}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Registrar Pagamento de Adiantamento */}
      <AdminPayAdvanceModal
        isOpen={!!payModalAdiantamento}
        adiantamento={payModalAdiantamento}
        onClose={() => setPayModalAdiantamento(null)}
        onSuccess={handlePaySuccess}
      />

      {/* MODAL: Recusar Solicitação de Adiantamento */}
      <AdminRejectAdvanceModal
        isOpen={!!rejectModalAdiantamento}
        adiantamento={rejectModalAdiantamento}
        onClose={() => setRejectModalAdiantamento(null)}
        onSuccess={handleRejectSuccess}
      />
    </div>
  );
};

