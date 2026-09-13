import React, { useEffect, useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';
import { CashMovementDetail, getCashMovementById } from '../services/caixaApi';
import { formatCurrency, formatDateBR, formatDateTimeBR } from '../services/financeService';

interface CashflowDetailModalProps {
  isOpen: boolean;
  movimentacaoId: string | null;
  onClose: () => void;
}

export const CashflowDetailModal: React.FC<CashflowDetailModalProps> = ({ isOpen, movimentacaoId, onClose }) => {
  const [movement, setMovement] = useState<CashMovementDetail | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setMovement(null);
    setError('');
    if (isOpen && movimentacaoId) {
      getCashMovementById(movimentacaoId).then((row) => { if (active) setMovement(row); })
        .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Erro ao consultar movimento.'); });
    }
    return () => { active = false; };
  }, [isOpen, movimentacaoId, retry]);
  if (!isOpen || !movimentacaoId) return null;
  const mov = movement?.id === movimentacaoId ? movement : null;
  const isInitial = mov?.tipo === 'SALDO_INICIAL';
  const isEntry = mov?.tipo === 'ENTRADA';
  const color = isInitial ? 'text-zinc-200' : isEntry ? 'text-emerald-400' : 'text-rose-400';

  return (
    <div id="cashflow-detail-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div id="cashflow-detail-modal-content" role="dialog" aria-modal="true" aria-labelledby="cashflow-detail-title" className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/40">
          <div><h2 id="cashflow-detail-title" className="text-base font-bold text-white">Detalhes da Movimentação</h2><p className="text-xs text-zinc-400">Extrato oficial e rastreabilidade do Caixa</p></div>
          <button id="btn-close-detail-modal" type="button" aria-label="Fechar detalhe" onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 overflow-y-auto space-y-5">
          {error ? <p role="alert" className="text-sm text-red-400">{error} <button type="button" onClick={() => setRetry((value) => value + 1)} className="underline">Tentar novamente</button></p> : !mov ? <p role="status" className="text-sm text-zinc-400">Carregando movimento...</p> : <>
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
              <div><span className="text-[11px] text-zinc-400 uppercase block mb-1">Valor do Lançamento</span><span className={`text-2xl font-black ${color}`}>{isInitial ? '' : isEntry ? '+ ' : '- '}{formatCurrency(Number(mov.valor))}</span></div>
              <div className={color}>{isInitial ? <Receipt /> : isEntry ? <ArrowDownLeft /> : <ArrowUpRight />}<span className="text-xs">{isInitial ? 'Saldo Inicial' : isEntry ? 'Entrada' : 'Saída'}</span></div>
            </div>
            <dl className="bg-zinc-950/40 rounded-xl border border-zinc-800 divide-y divide-zinc-800/60 text-sm">
              {[
                ['Tipo', isInitial ? 'Saldo Inicial' : isEntry ? 'Entrada' : 'Saída'],
                ['Origem', mov.origem.replaceAll('_', ' ')],
                ['Descrição', mov.descricao],
                ['Data financeira', formatDateBR(mov.dataFinanceira.slice(0, 10))],
                ['Referência', mov.referenciaId],
                ['Registrado por', mov.criadoPor?.name || mov.criadoPorId],
                ['Registro criado em', formatDateTimeBR(mov.createdAt)],
                ['Observação', mov.observacao],
              ].filter(([, value]) => value != null && value !== '').map(([label, value]) => <div key={label} className="p-3.5 space-y-1"><dt className="text-xs text-zinc-400">{label}</dt><dd className="text-white break-words whitespace-pre-wrap">{value}</dd></div>)}
            </dl>
            {isInitial && <p className="text-xs text-zinc-400">Compõe o saldo acumulado. Não é receita e não entra no resultado operacional mensal.</p>}
          </>}
        </div>
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/40 flex justify-end"><button id="btn-close-modal-bottom" type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-white">Fechar</button></div>
      </div>
    </div>
  );
};
