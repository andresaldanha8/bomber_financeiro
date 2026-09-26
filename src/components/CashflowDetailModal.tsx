import React, { useEffect, useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';
import { CashMovementDetail, getCashMovementById } from '../services/caixaApi';
import { formatCurrency, formatDateBR, formatDateTimeBR } from '../services/financeService';
import { getPaymentById } from '../services/pagamentosApi';
import { getDespesa } from '../services/despesasApi';
import { repassesApi } from '../services/repassesApi';
import { adiantamentosApi } from '../services/adiantamentosApi';

type OriginFields = [string, string | null | undefined][];

function originNotice(movement: CashMovementDetail): string | null {
  if (movement.tipo === 'SALDO_INICIAL' || movement.origem === 'SALDO_INICIAL') {
    return 'Saldo inicial: não possui operação de origem externa.';
  }
  if (!movement.referenciaId?.trim()) return 'O movimento não possui referência de origem.';
  if (movement.origem === 'ESTORNO' || movement.origem === 'AJUSTE') {
    return 'Consulta da operação de origem não disponível para este tipo de movimento.';
  }
  return null;
}

const originDate = (value?: string | null) => value ? formatDateBR(value.slice(0, 10)) : null;
const originTimestamp = (value?: string | null) => value ? formatDateTimeBR(value) : null;
const originActor = (name?: string | null, id?: string | null) => name || (id ? `ID: ${id}` : null);

interface CashflowDetailModalProps {
  isOpen: boolean;
  movimentacaoId: string | null;
  onClose: () => void;
}

export const CashflowDetailModal: React.FC<CashflowDetailModalProps> = ({ isOpen, movimentacaoId, onClose }) => {
  const [movement, setMovement] = useState<CashMovementDetail | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [originRetry, setOriginRetry] = useState(0);
  const [originResult, setOriginResult] = useState<{
    movement: CashMovementDetail;
    retry: number;
    fields: OriginFields;
    error: string;
  } | null>(null);
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

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setOriginResult(null);

    if (isOpen && movement?.id === movimentacaoId && !originNotice(movement) && movement.referenciaId) {
      const referenceId = movement.referenciaId;
      const loadOrigin = async (): Promise<OriginFields> => {
        switch (movement.origem) {
          case 'PAGAMENTO_ALUNO': {
            const payment = await getPaymentById(referenceId);
            return [
              ['ID', payment.id],
              ['Mensalidade (ID)', payment.mensalidadeId],
              ['Status', payment.statusConfirmacao],
              ['Valor', formatCurrency(Number(payment.valor))],
              ['Data do pagamento', originDate(payment.dataPagamento)],
              ['Forma de pagamento', payment.formaPagamento],
              ['Registrado por (ID)', payment.registradoPorId],
              ['Registrado em', originTimestamp(payment.createdAt)],
              ['Confirmado por (ID)', payment.confirmadoPorId],
              ['Confirmado em', originTimestamp(payment.confirmadoEm)],
              ['Atualizado em', originTimestamp(payment.updatedAt)],
            ];
          }
          case 'DESPESA': {
            const expense = await getDespesa(referenceId);
            return [
              ['ID', expense.id],
              ['Descrição', expense.descricao],
              ['Status', expense.status],
              ['Valor', formatCurrency(expense.valor)],
              ['Data da despesa', originDate(expense.data)],
              ['Data do pagamento', originDate(expense.dataPagamento)],
              ['Forma de pagamento', expense.formaPagamento],
              ['Criado por', originActor(expense.criadoPorNome, expense.criadoPorId)],
              ['Criado em', originTimestamp(expense.criadoEm)],
              ['Pagamento registrado por', originActor(expense.pagoPorNome, expense.pagoPorId)],
              ['Pagamento registrado em', originTimestamp(expense.pagoEm)],
            ];
          }
          case 'REPASSE_PROFESSOR': {
            const transfer = await repassesApi.getById(referenceId, controller.signal);
            return [
              ['ID', transfer.id],
              ['Professor', originActor(transfer.professorNome, transfer.professorId)],
              ['Competência', transfer.competencia],
              ['Status', transfer.status],
              ['Valor', formatCurrency(transfer.valor)],
              ['Data do repasse', originDate(transfer.dataRepasse)],
              ['Forma de pagamento', transfer.formaPagamento],
              ['Registrado por', originActor(transfer.registradoPorNome, transfer.registradoPorId)],
              ['Registrado em', originTimestamp(transfer.registradoEm)],
              ['Confirmado por', originActor(transfer.confirmadoPorNome, transfer.confirmadoPorId)],
              ['Confirmado em', originTimestamp(transfer.confirmadoEm)],
            ];
          }
          case 'ADIANTAMENTO_PROFESSOR': {
            const advance = await adiantamentosApi.getById(referenceId, controller.signal);
            return [
              ['ID', advance.id],
              ['Status', advance.status],
              ['Valor', formatCurrency(advance.valor)],
              ['Solicitado por', originActor(advance.professorNome, advance.professorId)],
              ['Solicitado em', originTimestamp(advance.createdAt)],
              ['Analisado por', originActor(advance.analisadoPorNome, advance.analisadoPorId)],
              ['Analisado em', originTimestamp(advance.analisadoEm)],
              ['Data do pagamento', originDate(advance.dataPagamento)],
              ['Forma de pagamento', advance.formaPagamento],
              ['Pagamento registrado por', originActor(advance.registradoPorNome, advance.registradoPorId)],
              ['Pagamento registrado em', originTimestamp(advance.pagoEm)],
              ['Confirmado por', originActor(advance.confirmadoPorNome, advance.confirmadoPorId)],
              ['Confirmado em', originTimestamp(advance.confirmadoEm)],
            ];
          }
          default:
            return [];
        }
      };

      loadOrigin().then((fields) => {
        if (active && !controller.signal.aborted) {
          setOriginResult({ movement, retry: originRetry, fields, error: '' });
        }
      }).catch((err: unknown) => {
        if (!active || controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
        const notFound = typeof err === 'object' && err !== null && 'status' in err && err.status === 404;
        setOriginResult({
          movement,
          retry: originRetry,
          fields: [],
          error: notFound ? 'Operação de origem não encontrada' : err instanceof Error ? err.message : 'Erro ao consultar operação de origem.',
        });
      });
    }

    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen, movimentacaoId, movement, originRetry]);

  if (!isOpen || !movimentacaoId) return null;
  const mov = movement?.id === movimentacaoId ? movement : null;
  const origin = originResult?.movement === mov && originResult.retry === originRetry ? originResult : null;
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
            <section className="space-y-3" aria-labelledby="cashflow-origin-title">
              <h3 id="cashflow-origin-title" className="text-sm font-bold text-white">Operação de origem</h3>
              {originNotice(mov) ? (
                <p className="text-xs text-zinc-400">{originNotice(mov)}</p>
              ) : !origin ? (
                <p role="status" className="text-sm text-zinc-400">Carregando operação de origem...</p>
              ) : origin.error ? (
                <p role="alert" className="text-sm text-red-400">
                  {origin.error}{' '}
                  <button type="button" onClick={() => setOriginRetry((value) => value + 1)} className="underline">Tentar novamente</button>
                </p>
              ) : (
                <dl className="bg-zinc-950/40 rounded-xl border border-zinc-800 divide-y divide-zinc-800/60 text-sm">
                  {origin.fields.filter(([, value]) => value != null && value !== '').map(([label, value]) => (
                    <div key={label} className="p-3.5 space-y-1">
                      <dt className="text-xs text-zinc-400">{label}</dt>
                      <dd className="text-white break-words whitespace-pre-wrap">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          </>}
        </div>
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/40 flex justify-end"><button id="btn-close-modal-bottom" type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-white">Fechar</button></div>
      </div>
    </div>
  );
};
