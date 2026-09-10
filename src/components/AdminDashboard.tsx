import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  financeService,
  formatCurrency,
  formatDateTimeBR,
  formatDateBR,
  getFutureDateStr,
} from '../services/financeService';
import { PagamentoAluno } from '../types';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  PlusCircle,
  Receipt,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  QrCode,
  Banknote,
  FileText,
} from 'lucide-react';

interface AdminDashboardProps {
  onOpenConfirmModal: (pagamento: PagamentoAluno) => void;
  onOpenExpenseModal: () => void;
  onOpenStudentModal: () => void;
  onOpenTeacherPaymentModal: () => void;
  onOpenMonthlyClosingModal: () => void;
  onNavigateTab: (tab: any) => void;
  onOpenExtratoCaixa?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenConfirmModal,
  onOpenExpenseModal,
  onOpenStudentModal,
  onOpenTeacherPaymentModal,
  onOpenMonthlyClosingModal,
  onNavigateTab,
  onOpenExtratoCaixa,
}) => {
  const stats = financeService.getDashboardAdminStats();
  const pagamentosPendentes = financeService.getPagamentosAguardandoConfirmacao();
  const ultimasMovimentacoes = financeService.getMovimentacoesCaixa().slice(0, 5);

  const isResultadoPositivo = stats.resultadoMes >= 0;

  return (
    <div id="admin-dashboard-view" className="space-y-4 pb-20">
      {/* Bloco 1: Caixa Atual & KPIs Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Caixa Atual */}
        <div className="p-4 rounded-2xl bg-[#18181b] text-white shadow-xl shadow-black/40 border border-lime-400/30 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                SALDO EM CAIXA
              </span>
              <div className="w-8 h-8 rounded-xl bg-lime-400/15 text-lime-400 border border-lime-400/30 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
              {formatCurrency(stats.saldoCaixa)}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
            <span>Entradas vs. Saídas operacionais</span>
            <button
              type="button"
              id="btn-admin-ver-extrato-caixa"
              onClick={() => {
                if (onOpenExtratoCaixa) {
                  onOpenExtratoCaixa();
                } else {
                  onNavigateTab('caixa');
                }
              }}
              className="text-lime-400 hover:underline font-bold inline-flex items-center gap-1"
            >
              <span>Ver extrato</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Resultado do Mês (Setembro/2026) */}
        <div className="p-4 rounded-2xl bg-[#18181b] border border-white/10 shadow-xl shadow-black/30 flex flex-col justify-between text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Resultado de Setembro/2026
            </span>
            <span
              className={`text-xs font-black px-2 py-0.5 rounded-full ${
                isResultadoPositivo
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {isResultadoPositivo ? 'Superávit' : 'Déficit'}
            </span>
          </div>

          <div className="text-2xl font-black text-white mt-1">
            {formatCurrency(stats.resultadoMes)}
          </div>

          {/* Sub-métricas: Entradas vs Saídas */}
          <div className="grid grid-cols-2 gap-2 pt-3 mt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <div>
                <span className="text-[10px] text-zinc-400 block leading-none font-semibold">Entradas</span>
                <span className="font-bold text-white">{formatCurrency(stats.entradasMes)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <TrendingDown className="w-3.5 h-3.5 shrink-0" />
              <div>
                <span className="text-[10px] text-zinc-400 block leading-none font-semibold">Saídas</span>
                <span className="font-bold text-white">{formatCurrency(stats.saidasMes)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bloco 2: Ações Rápidas (Grandes e Confortáveis para Toque) */}
      <div>
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
          Ações Rápidas
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Confirmar Pagamentos */}
          <button
            type="button"
            id="btn-quick-confirmar-pagamentos"
            onClick={() => onNavigateTab('confirmacoes')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#18181b] border border-amber-400/30 text-white hover:bg-[#202024] hover:border-amber-400 transition-all text-left group shadow-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center shrink-0 font-black shadow-md group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Confirmar</p>
              <p className="text-[11px] text-amber-400 font-semibold">
                {stats.totalAguardandoConfirmacao} pendentes
              </p>
            </div>
          </button>

          {/* Nova Despesa */}
          <button
            type="button"
            id="btn-quick-nova-despesa"
            onClick={onOpenExpenseModal}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#18181b] border border-white/10 text-white hover:bg-[#202024] hover:border-white/20 transition-all text-left group shadow-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-zinc-800 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0 font-black shadow-md group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Nova Despesa</p>
              <p className="text-[11px] text-red-400 font-semibold">+ Lançar saída</p>
            </div>
          </button>

          {/* Cadastrar Aluno */}
          <button
            type="button"
            id="btn-quick-cadastrar-aluno"
            onClick={onOpenStudentModal}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#18181b] border border-lime-400/30 text-white hover:bg-[#202024] hover:border-lime-400 transition-all text-left group shadow-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] text-black flex items-center justify-center shrink-0 font-black shadow-md group-hover:scale-105 transition-transform">
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Novo Aluno</p>
              <p className="text-[11px] text-lime-400 font-semibold">+ Matrícula</p>
            </div>
          </button>

          {/* Registrar Repasse */}
          <button
            type="button"
            id="btn-quick-pagar-professor"
            onClick={onOpenTeacherPaymentModal}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#18181b] border border-white/10 text-white hover:bg-[#202024] hover:border-white/20 transition-all text-left group shadow-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-200 border border-white/15 flex items-center justify-center shrink-0 font-black shadow-md group-hover:scale-105 transition-transform">
              <DollarSign className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Registrar Repasse</p>
              <p className="text-[11px] text-zinc-400 font-semibold">Repasse mensal</p>
            </div>
          </button>
        </div>
      </div>

      {/* Bloco 3: Alerta de Pagamentos Aguardando Confirmação */}
      {pagamentosPendentes.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#18181b] border border-amber-400/30 text-white space-y-3 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400">
              <Clock className="w-4 h-4" />
              <h2 className="text-sm font-bold text-white">
                Pagamentos para Confirmar ({pagamentosPendentes.length})
              </h2>
            </div>
            <button
              type="button"
              id="btn-ver-todos-confirmar"
              onClick={() => onNavigateTab('confirmacoes')}
              className="text-xs font-bold text-amber-400 hover:underline"
            >
              Ver todos
            </button>
          </div>

          <div className="space-y-2.5">
            {pagamentosPendentes.slice(0, 2).map((pag) => (
              <div
                key={pag.id}
                id={`item-aguardando-${pag.id}`}
                className="p-3 bg-[#131315] rounded-xl border border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
              >
                <div className="min-w-0 space-y-1">
                  {/* Linha 1: Nome do aluno */}
                  <p className="text-xs sm:text-sm font-bold text-white break-words">
                    {pag.alunoNome}
                  </p>

                  {/* Linha 2: PIX/DINHEIRO • competência */}
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 flex-wrap">
                    <span className="font-bold text-amber-300 bg-amber-400/15 px-1.5 py-0.5 rounded border border-amber-400/30 text-[10px] tracking-wide">
                      {pag.formaPagamento}
                    </span>
                    <span>•</span>
                    <span className="text-zinc-300 font-medium">{pag.competencia}</span>
                  </div>

                  {/* Linha 3: Informado por Prof. Nome */}
                  <p className="text-[11px] text-zinc-400">
                    Informado por <span className="text-zinc-200 font-medium">{pag.informadoPorNome}</span>
                  </p>
                </div>

                {/* Linha 4 (Mobile) / Lateral (Desktop): Valor e Botão Conferir */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-white/5 sm:border-0 shrink-0">
                  <span className="text-xs sm:text-sm font-black text-white">
                    {formatCurrency(pag.valor)}
                  </span>
                  <button
                    type="button"
                    id={`btn-conferir-${pag.id}`}
                    onClick={() => onOpenConfirmModal(pag)}
                    className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-black font-black text-xs transition-colors shadow-xs"
                  >
                    Conferir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bloco 4: Indicadores de Alunos (Atrasos e Semana) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#18181b] border border-red-500/30 shadow-lg shadow-black/20 text-white">
          <div className="flex items-center gap-1.5 text-red-400 mb-1">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-tight">Em Atraso</span>
          </div>
          <div className="text-2xl font-black text-red-400">
            {stats.totalAtrasados}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Alunos com vencimentos anteriores a hoje
          </p>
          <button
            type="button"
            id="btn-admin-ver-atrasados"
            onClick={() => onNavigateTab('alunos')}
            className="text-xs font-bold text-red-400 hover:underline mt-2 inline-block"
          >
            Ver alunos em atraso →
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#18181b] border border-lime-400/30 shadow-lg shadow-black/20 text-white">
          <div className="flex items-center gap-1.5 text-lime-400 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-tight">PRÓX. 7 DIAS</span>
          </div>
          <div className="text-2xl font-black text-lime-400">
            {stats.totalVencemSemana}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Vencimentos previstos até {formatDateBR(getFutureDateStr(7)).slice(0, 5)}
          </p>
          <button
            type="button"
            id="btn-admin-ver-semana"
            onClick={() => onNavigateTab('alunos')}
            className="text-xs font-bold text-lime-400 hover:underline mt-2 inline-block"
          >
            Acompanhar vencimentos →
          </button>
        </div>
      </div>

      {/* Bloco 5: Últimas Movimentações do Caixa */}
      <div className="p-4 rounded-2xl bg-[#18181b] border border-white/10 shadow-xl shadow-black/30 space-y-3 text-white">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">
            Últimas Movimentações do Caixa
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-fechamento-mensal"
              onClick={onOpenMonthlyClosingModal}
              className="text-xs font-bold text-lime-400 hover:underline flex items-center gap-1 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Fechamento Mensal</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {ultimasMovimentacoes.map((mov) => {
            const isEntrada = mov.tipo === 'ENTRADA';
            return (
              <div
                key={mov.id}
                id={`mov-${mov.id}`}
                className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isEntrada
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {isEntrada ? (
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {mov.descricao}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {formatDateTimeBR(mov.dataHora)} • por {mov.registradoPorNome}
                    </p>
                  </div>
                </div>

                <div
                  className={`text-xs font-black shrink-0 ${
                    isEntrada ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isEntrada ? '+' : '-'} {formatCurrency(mov.valor)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
