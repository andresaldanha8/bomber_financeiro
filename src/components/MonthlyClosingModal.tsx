import React, { useState } from 'react';
import { financeService, formatCurrency } from '../services/financeService';
import {
  X,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react';

interface MonthlyClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MonthlyClosingModal: React.FC<MonthlyClosingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const periodos = financeService.getPeriodosDisponiveis();
  const [mesAno, setMesAno] = useState(periodos[0]?.value || '2026-09');

  if (!isOpen) return null;

  const fechamento = financeService.getFechamentoMensal(mesAno);
  const isPositivo = fechamento.resultadoOperacional >= 0;

  return (
    <div
      id="monthly-closing-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        id="monthly-closing-modal-content"
        className="w-full sm:max-w-lg h-[96dvh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-[#18181b] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/10 overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/40 text-white shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-lime-400" />
            <h2 className="text-base font-black text-white tracking-tight">
              Resumo Financeiro Mensal
            </h2>
          </div>
          <button
            id="btn-close-closing-modal"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content com rolagem suave distribuída */}
        <div className="flex-1 p-4 sm:p-5 space-y-3.5 overflow-y-auto overscroll-contain">
          {/* Seletor do Mês Dinâmico */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-xs font-bold text-zinc-300">Período de Referência:</span>
            <select
              id="select-fechamento-mes"
              value={mesAno}
              onChange={(e) => setMesAno(e.target.value)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-white/10 bg-[#121212] text-white focus:ring-2 focus:ring-lime-400"
            >
              {periodos.map((p) => (
                <option key={p.value} value={p.value} className="bg-[#18181b] text-white">
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Card de Status Operacional do Ciclo Mensal */}
          <div
            id="modal-ciclo-status-card"
            className={`p-3.5 rounded-2xl border ${
              fechamento.ciclo.isAtual
                ? 'bg-lime-500/10 border-lime-500/20'
                : 'bg-zinc-900/90 border-white/10'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  fechamento.ciclo.isAtual
                    ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30'
                    : 'bg-zinc-800 text-zinc-300 border border-white/10'
                }`}
              >
                {fechamento.ciclo.isAtual && (
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                )}
                {fechamento.ciclo.isAtual ? 'PERÍODO ATUAL / CAIXA ABERTO' : 'PERÍODO ENCERRADO'}
              </span>

              {fechamento.ciclo.isAtual && fechamento.ciclo.mensagemContagem && (
                <span className="text-[10px] font-bold text-zinc-200 bg-black/50 px-2.5 py-0.5 rounded-md border border-white/10">
                  {fechamento.ciclo.mensagemContagem}
                </span>
              )}
            </div>

            <div className="mt-2.5 text-xs space-y-1 text-zinc-300">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Vigência do Período:</span>
                <span className="font-semibold text-white">
                  {fechamento.ciclo.dataInicioFormatada} a {fechamento.ciclo.dataFimFormatada}
                </span>
              </div>
              {fechamento.ciclo.isAtual ? (
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">Fechamento previsto:</span>
                  <span className="font-semibold text-lime-300">
                    {fechamento.ciclo.fechamentoPrevistoFormatado}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">Status do Período:</span>
                  <span className="font-semibold text-zinc-300">
                    Encerrado em {fechamento.ciclo.dataFimFormatada}
                  </span>
                </div>
              )}
            </div>

            {/* Indicação de valores parciais vs. consolidados */}
            {fechamento.ciclo.isAtual ? (
              <p className="mt-2 text-[10px] text-zinc-400 pt-2 border-t border-white/5 flex items-center justify-between">
                <span>Valores parciais até o momento</span>
                <span>Atualizado até {fechamento.ciclo.dataAtualFormatada}</span>
              </p>
            ) : (
              <p className="mt-2 text-[10px] text-zinc-400 pt-2 border-t border-white/5">
                Valores consolidados com base no histórico do período
              </p>
            )}
          </div>

          {/* 1. Saldo de Abertura */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-white font-bold text-xs">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Wallet className="w-4 h-4 text-zinc-400" />
                <span>Saldo de Abertura:</span>
              </span>
              <span className="text-sm font-black text-white">
                {formatCurrency(fechamento.saldoAbertura)}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">
              Posição financeira acumulada no Caixa antes do período de apuração
            </p>
          </div>

          {/* 2. Entradas Operacionais */}
          <div className="p-3.5 rounded-2xl bg-lime-500/10 border border-lime-500/20 space-y-2">
            <div className="flex items-center justify-between text-white font-bold text-xs">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-lime-400" />
                <span className="text-lime-300">Entradas Operacionais:</span>
              </span>
              <span className="text-sm font-black text-lime-400">
                {formatCurrency(fechamento.totalEntradasOperacionais)}
              </span>
            </div>
            <div className="text-xs text-zinc-300 space-y-1 pt-1 border-t border-lime-500/20">
              <div className="flex justify-between text-[11px]">
                <span>Mensalidades Confirmadas:</span>
                <span className="font-bold text-white">
                  {formatCurrency(fechamento.mensalidadesConfirmadas)}
                </span>
              </div>
              {fechamento.outrasEntradas > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span>Outras Entradas Operacionais:</span>
                  <span className="font-bold text-white">
                    {formatCurrency(fechamento.outrasEntradas)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Saídas Operacionais */}
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-2">
            <div className="flex items-center justify-between text-white font-bold text-xs">
              <span className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-red-300">Saídas Operacionais:</span>
              </span>
              <span className="text-sm font-black text-red-400">
                {formatCurrency(fechamento.totalSaidasOperacionais)}
              </span>
            </div>
            <div className="text-xs text-zinc-300 space-y-1 pt-1 border-t border-red-500/20 text-[11px]">
              <div className="flex justify-between">
                <span>Despesas Operacionais Pagas:</span>
                <span className="font-bold text-white">
                  {formatCurrency(fechamento.despesasPagas)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Repasses aos Professores:</span>
                <span className="font-bold text-white">
                  {formatCurrency(fechamento.pagamentosProfessores)}
                </span>
              </div>
              {fechamento.adiantamentosProfessores > 0 && (
                <div className="flex justify-between text-amber-300/90">
                  <span>Adiantamentos aos Professores:</span>
                  <span className="font-bold text-amber-300">
                    {formatCurrency(fechamento.adiantamentosProfessores)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 4. Resultado Operacional do Período */}
          <div
            className={`p-3.5 rounded-2xl border text-center space-y-1 ${
              isPositivo
                ? 'bg-black/40 text-white border-white/10'
                : 'bg-red-950/40 text-white border-red-500/30'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              <span>Resultado Operacional do Período</span>
            </div>
            <div
              className={`text-xl font-black ${
                isPositivo ? 'text-lime-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(fechamento.resultadoOperacional)}
            </div>
            <div className="flex items-center justify-center gap-2 pt-0.5">
              <span
                className={`inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                  isPositivo
                    ? 'bg-lime-500/20 text-lime-300 border border-lime-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {isPositivo ? 'Superávit Operacional' : 'Déficit Operacional'}
              </span>
              <span className="text-[10px] text-zinc-400">
                (Entradas Operacionais − Saídas Operacionais)
              </span>
            </div>
          </div>

          {/* 5. Saldo Final / Parcial do Caixa */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#18181b] to-black border-2 border-lime-500/40 space-y-1 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between text-white font-bold text-xs">
              <span className="text-zinc-200 flex items-center gap-1.5 font-black uppercase tracking-wider text-[11px]">
                <Wallet className="w-4 h-4 text-lime-400" />
                {fechamento.ciclo.isAtual ? 'Saldo Parcial do Caixa:' : 'Saldo Final do Caixa:'}
              </span>
              <span className="text-lg font-black text-lime-400">
                {formatCurrency(fechamento.saldoFinal)}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 flex items-center gap-1">
              <span>Saldo de Abertura ({formatCurrency(fechamento.saldoAbertura)})</span>
              <span className="text-zinc-500">+</span>
              <span>Resultado Operacional ({formatCurrency(fechamento.resultadoOperacional)})</span>
            </p>
          </div>
        </div>

        {/* Footer com botão confortável */}
        <div className="p-4 border-t border-white/10 bg-black/40 shrink-0">
          <button
            type="button"
            id="btn-fechar-resumo-mensal"
            onClick={onClose}
            className="w-full py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-black text-xs transition-all active:scale-98"
          >
            Fechar Resumo
          </button>
        </div>
      </div>
    </div>
  );
};
