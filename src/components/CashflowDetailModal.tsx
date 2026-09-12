import React from 'react';
import { DetalhesMovimentacaoCaixa } from '../types';
import {
  financeService,
  formatCurrency,
  formatDateTimeBR,
  formatProfessorNome,
} from '../services/financeService';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Calendar,
  CreditCard,
  CheckCircle2,
  FileText,
  Tag,
  Hash,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface CashflowDetailModalProps {
  isOpen: boolean;
  movimentacaoId: string | null;
  onClose: () => void;
}

export const CashflowDetailModal: React.FC<CashflowDetailModalProps> = ({
  isOpen,
  movimentacaoId,
  onClose,
}) => {
  if (!isOpen || !movimentacaoId) return null;

  const detalhes: DetalhesMovimentacaoCaixa | null =
    financeService.getDetalhesMovimentacaoCaixa(movimentacaoId);

  if (!detalhes) return null;

  const { movimentacao, tipoOrigem } = detalhes;
  const isEntrada = movimentacao.tipo === 'ENTRADA';

  return (
    <div
      id="cashflow-detail-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="cashflow-detail-modal-content"
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isEntrada
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {isEntrada ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : (
                <ArrowUpRight className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Detalhes da Movimentação
              </h2>
              <p className="text-xs text-zinc-400">
                Extrato oficial e rastreabilidade do Caixa
              </p>
            </div>
          </div>
          <button
            id="btn-close-detail-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="px-6 py-5 overflow-y-auto space-y-5">
          {/* Destaque do Valor e Tipo */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                Valor do Lançamento
              </span>
              <span
                className={`text-2xl font-black ${
                  isEntrada ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isEntrada ? '+ ' : '- '}
                {formatCurrency(movimentacao.valor)}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span
                className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                  tipoOrigem === 'SALDO_INICIAL'
                    ? 'bg-lime-500/10 text-lime-400 border-lime-500/30'
                    : isEntrada
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}
              >
                {tipoOrigem === 'SALDO_INICIAL'
                  ? 'Saldo de Abertura'
                  : isEntrada
                  ? 'Entrada no Caixa'
                  : 'Saída do Caixa'}
              </span>
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                {formatDateTimeBR(movimentacao.dataHora)}
              </span>
            </div>
          </div>

          {/* CASO: SALDO DE ABERTURA / SALDO INICIAL */}
          {tipoOrigem === 'SALDO_INICIAL' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-lime-400 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-lime-400" />
                Origem: Saldo de Abertura / Saldo Inicial
              </div>

              <div className="bg-zinc-950/40 rounded-xl border border-zinc-800 divide-y divide-zinc-800/60 text-sm">
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-zinc-500" />
                    Tipo
                  </span>
                  <span className="font-semibold text-white">Saldo de Abertura</span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-zinc-500" />
                    Valor
                  </span>
                  <span className="font-bold text-lime-400">{formatCurrency(movimentacao.valor)}</span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    Data
                  </span>
                  <span className="font-medium text-white">
                    {formatDateTimeBR(movimentacao.dataHora)}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-500" />
                    Origem
                  </span>
                  <span className="font-medium text-white">Saldo inicial do sistema</span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Status</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-lime-500/10 text-lime-400 border border-lime-500/20">
                    Consolidado / Registrado
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-zinc-500" />
                    ID de Referência
                  </span>
                  <span className="font-mono text-xs text-zinc-400">
                    {detalhes.referenciaCodigo || 'saldo-abertura'}
                  </span>
                </div>

                <div className="p-3.5 space-y-1">
                  <span className="text-xs text-zinc-400 block">Classificação Contábil</span>
                  <p className="text-xs text-zinc-300 bg-white/5 p-2.5 rounded-lg border border-white/5 leading-relaxed">
                    Saldo consolidado preexistente no Caixa. Entra na composição acumulada do Saldo em Caixa e não concorre como receita operacional do mês. Registro não vinculado a aluno.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CASO 1: MENSALIDADE DE ALUNO */}
          {tipoOrigem === 'MENSALIDADE' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-emerald-400" />
                Origem: Mensalidade de Aluno
              </div>

              <div className="bg-zinc-950/40 rounded-xl border border-zinc-800 divide-y divide-zinc-800/60 text-sm">
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-500" />
                    Aluno
                  </span>
                  <span className="font-semibold text-white">
                    {detalhes.alunoNome || 'Não informado'}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-zinc-500" />
                    Competência
                  </span>
                  <span className="font-medium text-white">
                    {detalhes.competencia}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-zinc-500" />
                    Forma de Pagamento
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700">
                    {detalhes.formaPagamento}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    Data Real do Pagamento
                  </span>
                  <span className="font-bold text-emerald-400">
                    {detalhes.dataPagamento || '-'}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    Data de Confirmação (Admin)
                  </span>
                  <span className="font-medium text-zinc-300">
                    {detalhes.dataConfirmacao || '-'}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    Vencimento da Mensalidade
                  </span>
                  <span className="font-medium text-zinc-300">
                    {detalhes.dataVencimentoMensalidade || '-'}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-500" />
                    Registrado por
                  </span>
                  <span className="text-zinc-300">
                    {detalhes.registradoPorNome || 'Administração'}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-zinc-500" />
                    Confirmado por
                  </span>
                  <span className="text-zinc-300">
                    {detalhes.confirmadoPorNome || 'Administrador não informado'}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-zinc-500" />
                    ID de Referência
                  </span>
                  <span className="font-mono text-xs text-zinc-400">
                    {detalhes.referenciaCodigo}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Status
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {detalhes.statusFormatado || 'Confirmado / Quitado'}
                  </span>
                </div>

                {detalhes.observacao && (
                  <div className="p-3.5">
                    <span className="text-xs text-zinc-400 block mb-1">
                      Observação do Lançamento:
                    </span>
                    <p className="text-xs text-zinc-300 italic bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                      "{detalhes.observacao}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CASO 2: DESPESA */}
          {tipoOrigem === 'DESPESA' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-rose-400" />
                Origem: Despesa Operacional
              </div>

              <div className="bg-zinc-950/40 rounded-xl border border-zinc-800 divide-y divide-zinc-800/60 text-sm">
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Descrição</span>
                  <span className="font-semibold text-white">
                    {detalhes.descricaoDespesa}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Categoria</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700">
                    {detalhes.categoriaDespesa}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    Data da Despesa
                  </span>
                  <span className="font-medium text-white">
                    {detalhes.dataDespesa}
                  </span>
                </div>

                {detalhes.dataPagamentoDespesa && (
                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      Data do Pagamento
                    </span>
                    <span className="font-medium text-emerald-400">
                      {detalhes.dataPagamentoDespesa}
                    </span>
                  </div>
                )}

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-zinc-500" />
                    Forma de Pagamento
                  </span>
                  <span className="text-zinc-300">
                    {detalhes.formaPagamentoDespesa || 'Não informada'}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-500" />
                    Registrado por
                  </span>
                  <span className="text-zinc-300">
                    {detalhes.criadoPorDespesa || 'Administrador não informado'}
                  </span>
                </div>

                {detalhes.pagoPorDespesa && (
                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-500" />
                      Pagamento registrado/confirmado por
                    </span>
                    <span className="text-zinc-300">
                      {detalhes.pagoPorDespesa}
                    </span>
                  </div>
                )}

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-zinc-500" />
                    ID de Referência
                  </span>
                  <span className="font-mono text-xs text-zinc-400">
                    {detalhes.referenciaCodigo}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Status</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {detalhes.statusDespesa}
                  </span>
                </div>

                {detalhes.observacaoDespesa && (
                  <div className="p-3.5 space-y-1">
                    <span className="text-xs text-zinc-400 block">Observação</span>
                    <p className="text-sm text-zinc-300 bg-white/5 p-2.5 rounded-lg border border-white/5">
                      {detalhes.observacaoDespesa}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CASO 3: PAGAMENTO DE PROFESSOR */}
          {tipoOrigem === 'PAGAMENTO_PROFESSOR' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-amber-400" />
                Origem: Repasse / Pagamento de Professor
              </div>

              <div className="bg-zinc-950/40 rounded-xl border border-zinc-800 divide-y divide-zinc-800/60 text-sm">
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-500" />
                    Professor
                  </span>
                  <span className="font-semibold text-white">
                    {formatProfessorNome(detalhes.professorNome)}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Competência / Referência</span>
                  <span className="font-medium text-white">
                    {detalhes.competenciaProfessor}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    Data do Pagamento
                  </span>
                  <span className="font-medium text-white">
                    {detalhes.dataPagamentoProfessor}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-zinc-500" />
                    Forma de Pagamento
                  </span>
                  <span className="text-zinc-300">
                    {detalhes.formaPagamentoProfessor}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-500" />
                    Registrado por
                  </span>
                  <span className="text-zinc-300">
                    {detalhes.registradoPorProfessor || 'Administrador não informado'}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Recibo do Professor</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      detalhes.reciboConfirmadoPeloProfessor
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {detalhes.reciboConfirmadoPeloProfessor
                      ? 'Confirmado pelo Professor'
                      : 'Aguardando confirmação do Professor'}
                  </span>
                </div>

                {detalhes.dataConfirmacaoRecebimentoProfessor && (
                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-zinc-400">Data do Recibo</span>
                    <span className="text-xs text-zinc-300">
                      {detalhes.dataConfirmacaoRecebimentoProfessor}
                    </span>
                  </div>
                )}

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-zinc-500" />
                    ID de Referência
                  </span>
                  <span className="font-mono text-xs text-zinc-400">
                    {detalhes.referenciaCodigo}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CASO: ADIANTAMENTO AO PROFESSOR */}
          {tipoOrigem === 'ADIANTAMENTO_PROFESSOR' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-amber-400" />
                Origem: Adiantamento ao Professor
              </div>

              <div className="bg-zinc-950/40 rounded-xl border border-zinc-800 divide-y divide-zinc-800/60 text-sm">
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-500" />
                    Professor
                  </span>
                  <span className="font-semibold text-white">
                    {formatProfessorNome(detalhes.professorNome)}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Valor</span>
                  <span className="font-black text-rose-400">
                    {formatCurrency(detalhes.valorProfessor || movimentacao.valor)}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    Data do Pagamento
                  </span>
                  <span className="font-medium text-white">
                    {detalhes.dataPagamentoProfessor}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-zinc-500" />
                    Forma de Pagamento
                  </span>
                  <span className="text-zinc-300">
                    {detalhes.formaPagamentoProfessor}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-500" />
                    Registrado por
                  </span>
                  <span className="text-zinc-300">
                    {detalhes.registradoPorProfessor || 'Administrador não informado'}
                  </span>
                </div>

                {detalhes.dataRegistroAdiantamento && (
                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-zinc-500" />
                      Data do Registro
                    </span>
                    <span className="text-xs text-zinc-300">
                      {detalhes.dataRegistroAdiantamento}
                    </span>
                  </div>
                )}

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-zinc-500" />
                    Referência
                  </span>
                  <span className="font-mono text-xs text-zinc-400">
                    {detalhes.referenciaCodigo}
                  </span>
                </div>

                <div className="p-3.5 space-y-1">
                  <span className="text-xs text-zinc-400 block">Status do Recibo</span>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                        detalhes.reciboConfirmadoPeloProfessor
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {detalhes.reciboConfirmadoPeloProfessor ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            Recebimento confirmado pelo professor em{' '}
                            {detalhes.dataConfirmacaoRecebimentoProfessor || ''}
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Aguardando confirmação do professor</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {detalhes.observacao && (
                  <div className="p-3.5 space-y-1">
                    <span className="text-xs text-zinc-400 block">Observação / Motivo</span>
                    <p className="text-sm text-zinc-300 bg-white/5 p-2.5 rounded-lg border border-white/5">
                      {detalhes.observacao}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CASO 4: ESTORNO */}
          {tipoOrigem === 'ESTORNO' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider">
                <AlertCircle className="w-4 h-4" />
                Origem: Estorno Financeiro
              </div>

              <div className="bg-zinc-950/40 rounded-xl border border-zinc-800 divide-y divide-zinc-800/60 text-sm">
                <div className="p-3.5">
                  <span className="text-xs text-zinc-400 block mb-1">Motivo do Estorno</span>
                  <p className="text-sm font-medium text-white">
                    {movimentacao.descricao}
                  </p>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">ID de Referência</span>
                  <span className="font-mono text-xs text-zinc-400">
                    {detalhes.referenciaCodigo}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CASO 5: DESCONHECIDO / REGISTRO ANTIGO */}
          {tipoOrigem === 'DESCONHECIDO' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                <AlertCircle className="w-4 h-4" />
                Origem: Registro financeiro não localizado
              </div>

              <div className="bg-zinc-950/40 rounded-xl border border-zinc-800 divide-y divide-zinc-800/60 text-sm">
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Descrição do Caixa</span>
                  <span className="font-medium text-white">{movimentacao.descricao}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Tipo</span>
                  <span className="text-zinc-200">{movimentacao.tipo}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">Registrado por</span>
                  <span className="text-zinc-300">{movimentacao.registradoPorNome}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400">ID de Referência</span>
                  <span className="font-mono text-xs text-zinc-400">
                    {movimentacao.referenciaId || '-'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer (Somente Leitura - Apenas Botão Fechar) */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/40 flex justify-end">
          <button
            id="btn-close-modal-bottom"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
