import React, { useEffect, useRef, useState } from 'react';
import { formatCurrency, formatDateBR } from '../services/financeService';
import { listarDespesas } from '../services/despesasApi';
import {
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  FileText,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { CashflowDetailModal } from './CashflowDetailModal';
import { ExpenseDetailModal } from './ExpenseDetailModal';
import { CategoriaDespesa, Despesa } from '../types';
import { CashApiError, CashMovement, CashSummary, createInitialBalance, getCashMovements, getCashSummary } from '../services/caixaApi';

const PAGE_SIZE = 50;

export type CaixaSubView = 'VISAO_GERAL' | 'EXTRATO' | 'DESPESAS';

interface CashflowViewProps {
  onOpenExpenseModal: () => void;
  onOpenMonthlyClosingModal: () => void;
  onExpensePaid?: (despesa: Despesa) => void;
  subView?: CaixaSubView;
  onSubViewChange?: (view: CaixaSubView) => void;
}

export const CashflowView: React.FC<CashflowViewProps> = ({
  onOpenExpenseModal,
  onOpenMonthlyClosingModal,
  onExpensePaid,
  subView,
  onSubViewChange,
}) => {
  const [localSubView, setLocalSubView] = useState<CaixaSubView>('VISAO_GERAL');
  const activeSubView = subView ?? localSubView;

  const handleNavigateSubView = (target: CaixaSubView) => {
    setLocalSubView(target);
    onSubViewChange?.(target);
  };

  const [filtroTipo, setFiltroTipo] = useState<'TODAS' | 'ENTRADA' | 'SAIDA'>('TODAS');
  const [filtroCategoriaDespesa] = useState('TODAS');
  const [selectedMovId, setSelectedMovId] = useState<string | null>(null);
  const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null);
  const [expenseModalInitialMode, setExpenseModalInitialMode] = useState<'DETALHES' | 'PAGAR'>('DETALHES');

  // Despesas (migradas para PostgreSQL)
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loadingDespesas, setLoadingDespesas] = useState(false);
  const [erroDespesas, setErroDespesas] = useState('');

  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [summaryError, setSummaryError] = useState('');
  const [initialBalance, setInitialBalance] = useState<CashMovement | null>(null);
  const [initialChecked, setInitialChecked] = useState(false);
  const [reload, setReload] = useState(0);
  const [showInitialForm, setShowInitialForm] = useState(false);
  const [initialValue, setInitialValue] = useState('');
  const [initialDate, setInitialDate] = useState(() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()));
  const [initialNote, setInitialNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');
  const [movimentacoes, setMovimentacoes] = useState<CashMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [movementsError, setMovementsError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const pageOffset = useRef(0);
  const listGeneration = useRef(0);
  const pagePending = useRef(false);

  useEffect(() => {
    let active = true;
    setSummary(null);
    setSummaryError('');
    setInitialChecked(false);
    Promise.all([getCashSummary(), getCashMovements({ tipo: 'SALDO_INICIAL', limit: 1 })])
      .then(([resumo, initial]) => {
        if (!active) return;
        setSummary(resumo);
        setInitialBalance(initial[0] ?? null);
        setInitialChecked(true);
        if (initial.length) setShowInitialForm(false);
      })
      .catch((error: unknown) => { if (active) setSummaryError(error instanceof Error ? error.message : 'Erro ao carregar Caixa.'); });
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    const generation = ++listGeneration.current;
    pageOffset.current = 0;
    pagePending.current = true;
    setMovimentacoes([]);
    setHasMore(false);
    setMovementsLoading(true);
    setMovementsError('');
    getCashMovements({ tipo: filtroTipo === 'TODAS' ? undefined : filtroTipo, limit: PAGE_SIZE, offset: 0 })
      .then((rows) => {
        if (generation !== listGeneration.current) return;
        setMovimentacoes(rows);
        pageOffset.current = rows.length;
        setHasMore(rows.length === PAGE_SIZE);
      })
      .catch((error: unknown) => { if (generation === listGeneration.current) setMovementsError(error instanceof Error ? error.message : 'Erro ao carregar extrato.'); })
      .finally(() => { if (generation === listGeneration.current) { pagePending.current = false; setMovementsLoading(false); } });
    return () => { ++listGeneration.current; };
  }, [filtroTipo, reload]);

  // Efetua a leitura de despesas quando entramos na subtela DESPESAS ou quando o filtro muda
  useEffect(() => {
    if (activeSubView !== 'DESPESAS') return;
    carregarDespesas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubView, filtroCategoriaDespesa]);

  const loadMore = async () => {
    if (pagePending.current) return;
    const generation = listGeneration.current;
    pagePending.current = true;
    setMovementsLoading(true);
    setMovementsError('');
    try {
      const rows = await getCashMovements({ tipo: filtroTipo === 'TODAS' ? undefined : filtroTipo, limit: PAGE_SIZE, offset: pageOffset.current });
      if (generation !== listGeneration.current) return;
      setMovimentacoes((current) => [...current, ...rows.filter((row) => !current.some((item) => item.id === row.id))]);
      pageOffset.current += rows.length;
      setHasMore(rows.length === PAGE_SIZE);
    } catch (error) {
      if (generation === listGeneration.current) setMovementsError(error instanceof Error ? error.message : 'Erro ao carregar extrato.');
    } finally {
      if (generation === listGeneration.current) { pagePending.current = false; setMovementsLoading(false); }
    }
  };

  const saveInitial = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !initialChecked || initialBalance) return;
    const valor = Number(initialValue);
    if (!initialValue.trim() || !Number.isFinite(valor) || valor < 0 || valor > 99999999.99 || !/^\d+(\.\d{1,2})?$/.test(initialValue)) {
      setInitialMessage('Informe um valor de 0 a 99.999.999,99 com até duas casas decimais.');
      return;
    }
    setSaving(true);
    setInitialMessage('');
    try {
      await createInitialBalance({ valor, dataFinanceira: initialDate, observacao: initialNote || undefined });
      setShowInitialForm(false);
      setInitialChecked(false);
      setInitialMessage('Saldo inicial definido.');
      setReload((value) => value + 1);
    } catch (error) {
      if (error instanceof CashApiError && error.status === 409) {
        setShowInitialForm(false);
        setInitialChecked(false);
        setInitialMessage('O saldo inicial já foi definido. Os dados serão atualizados.');
        setReload((value) => value + 1);
      } else setInitialMessage(error instanceof Error ? error.message : 'Erro ao definir saldo inicial.');
    } finally { setSaving(false); }
  };

  // carregarDespesas: usa listarDespesas da API PostgreSQL
  const carregarDespesas = async () => {
    setLoadingDespesas(true);
    setErroDespesas('');
    try {
      const res = await listarDespesas({
        categoria: filtroCategoriaDespesa === 'TODAS' ? undefined : filtroCategoriaDespesa,
      });
      // Normaliza campos opcionais (null -> undefined) e garante strings para campos exigidos
      setDespesas(
        res.map((item) => ({
          ...item,
          categoria: item.categoria as CategoriaDespesa,
          criadoPorNome: item.criadoPorNome ?? '',
          formaPagamento: (item as any).formaPagamento ?? '',
          dataPagamento: item.dataPagamento ?? undefined,
          pagoPorId: item.pagoPorId ?? undefined,
          pagoPorNome: item.pagoPorNome ?? undefined,
          pagoEm: item.pagoEm ?? undefined,
          observacao: item.observacao ?? undefined,
        }))
      );
    } catch (err: any) {
      setErroDespesas(err?.message || 'Erro ao carregar despesas.');
      setDespesas([]);
    } finally {
      setLoadingDespesas(false);
    }
  };

  return (
    <div id="cashflow-view" className="space-y-4 pb-20">
      {activeSubView !== 'DESPESAS' && <p className="text-xs text-zinc-400">Repasses e adiantamentos pagos pelo fluxo oficial integram o Caixa PostgreSQL.</p>}
      {activeSubView !== 'DESPESAS' && summaryError && <div role="alert" className="text-sm text-red-400">{summaryError} <button type="button" onClick={() => setReload((value) => value + 1)} className="underline">Tentar novamente</button></div>}
      {/* 1. VISÃO GERAL DO CAIXA (PÁGINA-MÃE) */}
      {activeSubView === 'VISAO_GERAL' && (
        <div className="space-y-4">
          {/* Card Principal: Visão Geral do Caixa */}
          <div className="p-4 rounded-2xl bg-[#18181b] border border-white/10 text-white shadow-xl shadow-black/30 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                  SALDO EM CAIXA
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                  {summary ? formatCurrency(summary.saldoDisponivel) : '—'}
                </div>
              </div>
              <button
                type="button"
                id="btn-caixa-resumo-modal"
                onClick={onOpenMonthlyClosingModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-xs shadow-lg shadow-lime-500/20 transition-all active:scale-95"
                title="Ver Resumo Financeiro Mensal"
              >
                <FileText className="w-4 h-4 stroke-[2.5]" />
                <span>Resumo Financeiro</span>
              </button>
            </div>

            {/* Status Compacto do Ciclo Mensal */}
            <div
              id="caixa-ciclo-status-banner"
              className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-lime-400/10 text-lime-400 border border-lime-400/30 text-[11px] font-black uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                  {summary ? (summary.statusPeriodo === 'CAIXA_ABERTO' ? 'Caixa aberto' : 'Período encerrado') : (summaryError ? 'Caixa indisponível' : 'Carregando Caixa...')}
                </span>
                <span className="text-zinc-300 font-semibold text-xs">
                  {summary && `${formatDateBR(summary.periodoInicio)} a ${formatDateBR(summary.periodoFim)}`}
                </span>
              </div>

            </div>

            {/* Indicadores Operacionais do Mês */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
              <div>
                <span className="text-zinc-400 block text-[10px]">Entradas do mês</span>
                <span className="text-lime-400 font-black text-sm sm:text-base">
                  {summary ? formatCurrency(summary.entradasMes) : '—'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Saídas do mês</span>
                <span className="text-red-400 font-black text-sm sm:text-base">
                  {summary ? formatCurrency(summary.saidasMes) : '—'}
                </span>
              </div>
              <div><span className="text-zinc-400 block text-[10px]">Resultado do mês</span><span className="font-black text-sm">{summary ? formatCurrency(summary.resultadoMes) : '—'}</span></div>
              <div><span className="text-zinc-400 block text-[10px]">Saldo Inicial</span><span className="font-black text-sm">{summary ? formatCurrency(summary.saldoInicial) : '—'}</span></div>
            </div>
            {initialMessage && <p role="status" className="text-xs text-lime-300">{initialMessage}</p>}
            {initialChecked && initialBalance && <p className="text-xs text-zinc-400">Saldo inicial registrado: {formatCurrency(Number(initialBalance.valor))} em {formatDateBR(initialBalance.dataFinanceira)}. Somente leitura; não é receita mensal.</p>}
            {initialChecked && !initialBalance && !showInitialForm && <button id="btn-definir-saldo-inicial" type="button" onClick={() => setShowInitialForm(true)} className="px-3 py-2 rounded-xl bg-lime-400 text-black text-xs font-black">Definir Saldo Inicial</button>}
            {showInitialForm && initialChecked && !initialBalance && (
              <form onSubmit={saveInitial} className="space-y-3 border-t border-white/10 pt-3">
                <p className="text-xs text-zinc-400">Informe o saldo real na implantação. O registro não poderá ser editado.</p>
                <label className="block text-xs">Valor (R$)<input aria-label="Valor do saldo inicial" type="number" min="0" max="99999999.99" step="0.01" required disabled={saving} value={initialValue} onChange={(e) => setInitialValue(e.target.value)} className="block w-full mt-1 p-2 rounded-lg bg-zinc-900 border border-white/20" /></label>
                <label className="block text-xs">Data financeira<input aria-label="Data financeira" type="date" required disabled={saving} value={initialDate} onChange={(e) => setInitialDate(e.target.value)} className="block w-full mt-1 p-2 rounded-lg bg-zinc-900 border border-white/20" /></label>
                <label className="block text-xs">Observação (opcional)<textarea aria-label="Observação do saldo inicial" maxLength={500} disabled={saving} value={initialNote} onChange={(e) => setInitialNote(e.target.value)} className="block w-full mt-1 p-2 rounded-lg bg-zinc-900 border border-white/20" /></label>
                <div className="flex gap-2"><button type="submit" disabled={saving} className="px-3 py-2 rounded-xl bg-lime-400 text-black text-xs font-black disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar Saldo Inicial'}</button><button type="button" disabled={saving} onClick={() => setShowInitialForm(false)} className="px-3 py-2 text-xs">Cancelar</button></div>
              </form>
            )}
          </div>

          {/* Acessos: Subtelas do Caixa */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              Acessos do Caixa
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Acesso: Extrato do Caixa */}
              <button
                type="button"
                id="btn-acesso-extrato-caixa"
                onClick={() => handleNavigateSubView('EXTRATO')}
                className="p-4 rounded-2xl bg-[#18181b] border border-white/10 hover:border-lime-400/40 hover:bg-[#202024] text-white transition-all text-left flex items-center justify-between gap-3 shadow-md shadow-black/20 group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-lime-400/15 text-lime-400 border border-lime-400/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Receipt className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white group-hover:text-lime-400 transition-colors">
                      Extrato do Caixa
                    </h4>
                    <p className="text-xs text-zinc-400 truncate">
                      Lançamentos, entradas e saídas detalhadas
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* Acesso: Gestão de Despesas */}
              <button
                type="button"
                id="btn-acesso-gestao-despesas"
                onClick={() => handleNavigateSubView('DESPESAS')}
                className="p-4 rounded-2xl bg-[#18181b] border border-white/10 hover:border-red-400/40 hover:bg-[#202024] text-white transition-all text-left flex items-center justify-between gap-3 shadow-md shadow-black/20 group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                      Gestão de Despesas
                    </h4>
                    <p className="text-xs text-zinc-400 truncate">
                      Cadastro e pagamento de despesas
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SUBTELA: Extrato do Caixa */}
      {activeSubView === 'EXTRATO' && (
        <div className="space-y-3.5">
          {/* Cabeçalho com Ação de Retorno */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
            <button
              type="button"
              id="btn-voltar-caixa-extrato"
              onClick={() => handleNavigateSubView('VISAO_GERAL')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#18181b] border border-white/10 hover:bg-white/5 hover:border-white/20 text-zinc-200 hover:text-white text-xs font-bold transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Caixa</span>
            </button>

            <div className="text-right">
              <span className="text-[11px] font-black uppercase tracking-wider text-lime-400 block">
                Extrato do Caixa
              </span>
              <span className="text-[10px] text-zinc-400">
                Saldo: <strong className="text-white">{summary ? formatCurrency(summary.saldoDisponivel) : '—'}</strong>
              </span>
            </div>
          </div>

          {/* Filtros de Tipo */}
          <div className="flex items-center gap-1.5">
            {(['TODAS', 'ENTRADA', 'SAIDA'] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                id={`btn-filtro-mov-${tipo.toLowerCase()}`}
                onClick={() => { if (tipo !== filtroTipo) { ++listGeneration.current; setMovimentacoes([]); setHasMore(false); setMovementsLoading(true); setFiltroTipo(tipo); } }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filtroTipo === tipo
                    ? 'bg-lime-400 text-black font-black'
                    : 'bg-[#18181b] border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {tipo === 'TODAS' ? 'Todas' : tipo === 'ENTRADA' ? 'Entradas (+)' : 'Saídas (-)'}
              </button>
            ))}
          </div>

          {/* Lista de Movimentações */}
          <div className="bg-[#18181b] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden shadow-md shadow-black/20">
            {movementsError && <div role="alert" className="p-3 text-xs text-red-400">{movementsError} <button type="button" onClick={() => setReload((value) => value + 1)} className="underline">Tentar novamente</button></div>}
            {movementsLoading && <p role="status" className="p-3 text-xs text-zinc-400">Carregando movimentos...</p>}
            {!movementsLoading && !movementsError && movimentacoes.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400">
                Nenhuma movimentação encontrada para o filtro selecionado.
              </div>
            ) : (
              movimentacoes.map((mov) => {
                const isEntrada = mov.tipo === 'ENTRADA';
                const isInicial = mov.tipo === 'SALDO_INICIAL';
                return (
                  <div
                    key={mov.id}
                    id={`card-movimentacao-${mov.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedMovId(mov.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedMovId(mov.id); } }}
                    className="p-3 flex items-center justify-between gap-2 text-white hover:bg-white/5 transition-all cursor-pointer group active:scale-[0.99]"
                    title="Clique para ver detalhes do lançamento"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                          isInicial ? 'bg-zinc-700/30 text-zinc-200 border border-white/20' : isEntrada
                            ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {isInicial ? <Receipt className="w-4 h-4" /> : isEntrada ? (
                          <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-white truncate group-hover:text-lime-400 transition-colors">
                            {mov.descricao || mov.origem.replaceAll('_', ' ')}
                          </p>
                          {mov.origem === 'SALDO_INICIAL' && (
                            <span className="shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-lime-400/20 text-lime-300 border border-lime-400/30">
                              Saldo Inicial
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          {formatDateBR(mov.dataFinanceira)} • {mov.origem.replaceAll('_', ' ')}{mov.criadoPorNome ? ` • por ${mov.criadoPorNome}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div
                        className={`text-xs font-black ${
                          isInicial ? 'text-zinc-200' : isEntrada ? 'text-lime-400' : 'text-red-400'
                        }`}
                      >
                        {isInicial ? '' : isEntrada ? '+' : '-'} {formatCurrency(Number(mov.valor))}
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {hasMore && <button type="button" id="btn-caixa-carregar-mais" disabled={movementsLoading} onClick={loadMore} className="w-full p-3 rounded-xl border border-white/10 text-sm font-bold disabled:opacity-50">{movementsLoading ? 'Carregando...' : 'Carregar mais'}</button>}
        </div>
      )}

      {/* 3. SUBTELA: Gestão de Despesas */}
      {activeSubView === 'DESPESAS' && (
        <div className="space-y-3.5">
          <p className="text-xs text-amber-300">As despesas pagas são registradas no Caixa automaticamente.</p>
          {/* Cabeçalho com Ação de Retorno e Nova Despesa */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
            <button
              type="button"
              id="btn-voltar-caixa-despesas"
              onClick={() => handleNavigateSubView('VISAO_GERAL')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#18181b] border border-white/10 hover:bg-white/5 hover:border-white/20 text-zinc-200 hover:text-white text-xs font-bold transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Caixa</span>
            </button>

            <button
              type="button"
              id="btn-adicionar-despesa-sub"
              onClick={onOpenExpenseModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-md shadow-red-600/20 transition-all active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Nova Despesa</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {loadingDespesas ? (
              <p role="status" className="p-3 text-xs text-zinc-400">Carregando despesas...</p>
            ) : erroDespesas ? (
              <div role="alert" className="p-3 text-xs text-red-400">
                {erroDespesas} <button type="button" onClick={carregarDespesas} className="underline">Tentar novamente</button>
              </div>
            ) : despesas.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400">Nenhuma despesa encontrada.</div>
            ) : (
              despesas.map((desp) => {
                const isPaga = desp.status === 'PAGA';
                return (
                  <div
                    key={desp.id}
                    id={`card-despesa-${desp.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedDespesa(desp);
                      setExpenseModalInitialMode('DETALHES');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedDespesa(desp);
                        setExpenseModalInitialMode('DETALHES');
                      }
                    }}
                    className="p-3.5 rounded-2xl bg-[#18181b] border border-white/10 shadow-md shadow-black/20 flex items-center justify-between gap-2 text-white hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer group active:scale-[0.99]"
                    title={isPaga ? 'Clique para ver detalhes (Paga)' : 'Clique para ver detalhes ou registrar pagamento'}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-zinc-300">
                          {desp.categoria}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isPaga
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                          }`}
                        >
                          {desp.status}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white mt-1 truncate group-hover:text-lime-400 transition-colors">
                        {desp.descricao}
                      </h4>

                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {formatDateBR(desp.data)} • via {desp.formaPagamento}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-black text-red-400 block">
                          {formatCurrency(desp.valor)}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          por {desp.criadoPorNome}
                        </span>
                        {!isPaga && (
                          <div className="mt-1">
                            <button
                              type="button"
                              id={`btn-quick-pagar-${desp.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDespesa(desp);
                                setExpenseModalInitialMode('PAGAR');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-[10px] shadow-xs shadow-lime-500/20 transition-all flex items-center gap-1"
                              title="Registrar pagamento desta despesa"
                            >
                              <span>Registrar Pgto.</span>
                              <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                            </button>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Movimentação (Somente Leitura) */}
      <CashflowDetailModal
        isOpen={!!selectedMovId}
        movimentacaoId={selectedMovId}
        onClose={() => setSelectedMovId(null)}
      />

      {/* Modal de Detalhes / Pagamento da Despesa */}
      <ExpenseDetailModal
        isOpen={!!selectedDespesa}
        despesa={selectedDespesa}
        initialMode={expenseModalInitialMode}
        onClose={() => setSelectedDespesa(null)}
        onExpenseUpdated={async (despAtualizada) => {
          try {
            await carregarDespesas();
          } finally {
            setReload((r) => r + 1);
            if (onExpensePaid) {
              onExpensePaid(despAtualizada);
            }
          }
        }}
      />
    </div>
  );
};
