import React, { useEffect, useState } from 'react';
import { X, Calendar, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { CashSummary, getCashSummary } from '../services/caixaApi';
import { formatCurrency, formatDateBR } from '../services/financeService';

interface MonthlyClosingModalProps { isOpen: boolean; onClose: () => void; }

export const MonthlyClosingModal: React.FC<MonthlyClosingModalProps> = ({ isOpen, onClose }) => {
  const currentMonth = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()).slice(0, 7);
  const [mesAno, setMesAno] = useState(currentMonth);
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setSummary(null);
    setError('');
    if (isOpen && mesAno) getCashSummary(mesAno).then((data) => { if (active) setSummary(data); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Erro ao consultar resumo mensal.'); });
    return () => { active = false; };
  }, [isOpen, mesAno, retry]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="monthly-summary-title" className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10"><h2 id="monthly-summary-title" className="text-base font-bold text-white">Resumo Financeiro Mensal</h2><button type="button" onClick={onClose} aria-label="Fechar resumo" className="text-zinc-400 p-1"><X className="w-5 h-5" /></button></div>
        <div className="p-4 space-y-3 overflow-y-auto">
          <label className="block text-xs text-zinc-300">Período<input aria-label="Período do resumo" type="month" value={mesAno} max={currentMonth} min="0001-01" onChange={(e) => { setSummary(null); setMesAno(e.target.value); }} className="block mt-1 p-2 rounded-xl bg-zinc-900 border border-white/10 text-white w-full" /></label>
          <p className="text-xs text-zinc-400">Repasses e adiantamentos pagos pelo fluxo oficial integram o Caixa PostgreSQL.</p>
          {error ? <p role="alert" className="text-sm text-red-400">{error} <button type="button" onClick={() => setRetry((value) => value + 1)} className="underline">Tentar novamente</button></p> : !summary ? <p role="status" className="text-xs text-zinc-400">{mesAno ? 'Carregando resumo...' : 'Selecione um período.'}</p> : <>
            <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 text-xs"><span className="flex items-center gap-2 text-lime-400 font-bold"><Calendar className="w-4 h-4" />{summary.statusPeriodo === 'CAIXA_ABERTO' ? 'Caixa aberto' : 'Período encerrado'}</span><p className="mt-2 text-zinc-300">{formatDateBR(summary.periodoInicio)} a {formatDateBR(summary.periodoFim)}</p></div>
            {/* Saldo inicial do sistema não é abertura do mês. Sem totais de módulos legados. */}
            {[
              { label: 'Saldo Inicial', value: summary.saldoInicial, Icon: Wallet, color: 'text-zinc-200' },
              { label: 'Entradas do mês', value: summary.entradasMes, Icon: TrendingUp, color: 'text-lime-400' },
              { label: 'Saídas do mês', value: summary.saidasMes, Icon: TrendingDown, color: 'text-red-400' },
              { label: 'Resultado do mês', value: summary.resultadoMes, Icon: TrendingUp, color: 'text-white' },
              { label: 'Saldo disponível', value: summary.saldoDisponivel, Icon: Wallet, color: 'text-white' },
            ].map(({ label, value, Icon, color }) => <div key={label} className="p-3.5 rounded-2xl bg-zinc-900 border border-white/10 flex justify-between items-center gap-2"><span className={`flex items-center gap-1.5 text-xs font-bold ${color}`}><Icon className="w-4 h-4" />{label}</span><span className={`text-sm font-black ${color}`}>{formatCurrency(value)}</span></div>)}
            <p className="text-[11px] text-zinc-400">Saldo Inicial é o registro da implantação, não a abertura do mês. Saldo disponível acumulado até {summary.statusPeriodo === 'CAIXA_ABERTO' ? 'hoje' : formatDateBR(summary.periodoFim)}.</p>
          </>}
        </div>
        <div className="p-4 border-t border-white/10"><button type="button" onClick={onClose} className="w-full p-2.5 rounded-xl bg-zinc-800 text-white text-sm font-bold">Fechar</button></div>
      </div>
    </div>
  );
};
