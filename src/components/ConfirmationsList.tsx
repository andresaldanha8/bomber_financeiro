import React from 'react';
import { PagamentoAluno } from '../types';
import {
  financeService,
  formatCurrency,
  formatDateTimeBR,
} from '../services/financeService';
import {
  CheckCircle2,
  QrCode,
  Banknote,
  Clock,
  Check,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

interface ConfirmationsListProps {
  onOpenConfirmModal: (pagamento: PagamentoAluno) => void;
}

export const ConfirmationsList: React.FC<ConfirmationsListProps> = ({
  onOpenConfirmModal,
}) => {
  const pagamentosPendentes = financeService.getPagamentosAguardandoConfirmacao();
  const todosPagamentos = financeService.getTodosPagamentosAlunos();
  const confirmadosRecentes = todosPagamentos
    .filter((p) => p.statusConfirmacao === 'CONFIRMADO')
    .slice(0, 10);

  return (
    <div id="confirmations-list-view" className="space-y-4 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-base font-black text-white leading-tight tracking-tight">
          Pagamentos para Confirmar
        </h2>
        <p className="text-xs text-zinc-400">
          Validação obrigatória do Admin para PIX e Dinheiro antes de lançar no caixa
        </p>
      </div>

      {/* Fila de Pagamentos Pendentes */}
      {pagamentosPendentes.length === 0 ? (
        <div className="p-8 text-center bg-[#1a1a1c] rounded-2xl border border-white/10 space-y-2 text-white">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-white">
            Tudo em dia!
          </p>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Nenhum pagamento informado aguarda conferência no momento.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pagamentosPendentes.map((pag) => (
            <div
              key={pag.id}
              id={`confirm-card-${pag.id}`}
              className="p-4 rounded-2xl bg-[#18181b] border border-white/15 shadow-xl shadow-black/40 space-y-3 text-white"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                        pag.formaPagamento === 'PIX'
                          ? 'bg-lime-400/15 text-lime-300 border border-lime-400/30'
                          : 'bg-white/10 text-zinc-300 border border-white/10'
                      }`}
                    >
                      {pag.formaPagamento === 'PIX' ? (
                        <QrCode className="w-3.5 h-3.5" />
                      ) : (
                        <Banknote className="w-3.5 h-3.5" />
                      )}
                      <span>{pag.formaPagamento}</span>
                    </span>
                    <span className="text-xs font-bold text-zinc-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                      {pag.competencia}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-1.5 leading-tight">
                    {pag.alunoNome}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Informado por <strong className="text-zinc-200">{pag.informadoPorNome}</strong> em {formatDateTimeBR(pag.informadoEm)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-lg font-black text-lime-400 block">
                    {formatCurrency(pag.valor)}
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wide">
                    Aguardando
                  </span>
                </div>
              </div>

              {pag.observacao && (
                <div className="text-xs p-2.5 rounded-xl bg-black/40 border border-white/10 text-zinc-300 italic">
                  "{pag.observacao}"
                </div>
              )}

              {/* Botões de Ação */}
              <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                <button
                  type="button"
                  id={`btn-acao-conferir-${pag.id}`}
                  onClick={() => onOpenConfirmModal(pag)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-xs shadow-lg shadow-lime-500/20 transition-all active:scale-98"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Conferir & Confirmar Recebimento</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Histórico Recente de Pagamentos Confirmados */}
      <div className="pt-4 space-y-2">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Últimas Confirmações Realizadas
        </h3>
        <div className="bg-[#1a1a1c] rounded-2xl border border-white/10 overflow-hidden shadow-md shadow-black/20 divide-y divide-white/5">
          {confirmadosRecentes.map((p) => (
            <div key={p.id} className="p-3 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-white">{p.alunoNome}</p>
                <p className="text-[11px] text-zinc-400">
                  {p.competencia} ({p.formaPagamento}) • Confirmado por {p.confirmadoPorNome}
                </p>
              </div>
              <div className="text-right">
                <span className="font-bold text-emerald-400 block">
                  {formatCurrency(p.valor)}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {p.confirmadoEm ? formatDateTimeBR(p.confirmadoEm) : '-'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
