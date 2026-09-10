import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  CreditCard,
  User,
  Tag,
  Hash,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  DollarSign,
  FileText,
} from 'lucide-react';
import { Despesa } from '../types';
import {
  financeService,
  formatCurrency,
  formatDateBR,
  getTodayDateStr,
} from '../services/financeService';
import { useAuth } from '../context/AuthContext';

interface ExpenseDetailModalProps {
  despesa: Despesa | null;
  isOpen: boolean;
  onClose: () => void;
  onExpenseUpdated?: (despesaAtualizada: Despesa) => void;
  initialMode?: 'DETALHES' | 'PAGAR';
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  despesa,
  isOpen,
  onClose,
  onExpenseUpdated,
  initialMode = 'DETALHES',
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [modo, setModo] = useState<'DETALHES' | 'PAGAR'>('DETALHES');
  const [dataPagamento, setDataPagamento] = useState<string>(getTodayDateStr());
  const [formaPagamento, setFormaPagamento] = useState<string>('PIX');
  const [observacao, setObservacao] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && despesa) {
      setModo(initialMode);
      setDataPagamento(getTodayDateStr());
      setFormaPagamento(despesa.formaPagamento || 'PIX');
      setObservacao(despesa.observacao || '');
      setErrorMsg(null);
      setLoading(false);
    }
  }, [isOpen, despesa, initialMode]);

  if (!isOpen || !despesa) return null;

  const isPendente = despesa.status === 'PENDENTE';
  const isPaga = despesa.status === 'PAGA';

  const handleConfirmarPagamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isAdmin) {
      setErrorMsg('Apenas o ADMIN pode registrar o pagamento de despesas.');
      return;
    }

    if (!dataPagamento) {
      setErrorMsg('Informe a data do pagamento.');
      return;
    }

    if (!formaPagamento) {
      setErrorMsg('Selecione a forma de pagamento.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const atualizada = financeService.registrarPagamentoDespesa(
        {
          despesaId: despesa.id,
          dataPagamento,
          formaPagamento,
          observacao: observacao.trim() ? observacao.trim() : undefined,
        },
        currentUser
      );

      if (onExpenseUpdated) {
        onExpenseUpdated(atualizada);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao registrar pagamento da despesa.');
      setLoading(false);
    }
  };

  return (
    <div
      id="modal-expense-detail-overlay"
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        id="modal-expense-detail-container"
        className="relative w-full max-w-lg my-auto rounded-3xl bg-[#18181b] border border-white/10 shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            {modo === 'PAGAR' ? (
              <button
                type="button"
                id="btn-voltar-detalhes-despesa"
                onClick={() => setModo('DETALHES')}
                disabled={loading}
                className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                title="Voltar para detalhes"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-lime-400" />
              </div>
            )}
            <div>
              <h2
                id="modal-despesa-title"
                className="text-base sm:text-lg font-black text-white"
              >
                {modo === 'PAGAR'
                  ? 'Registrar Pagamento da Despesa'
                  : 'Detalhes da Despesa'}
              </h2>
              <p className="text-xs text-zinc-400">
                {modo === 'PAGAR'
                  ? 'Registre no sistema um pagamento já realizado'
                  : 'Gestão de despesas e obrigações'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-fechar-modal-despesa"
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTEÚDO SCROLLÁVEL */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-sm flex-1">
          {errorMsg && (
            <div
              id="alert-error-despesa"
              className="flex items-start gap-2.5 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MODO 1: DETALHES (LEITURA) */}
          {modo === 'DETALHES' && (
            <div className="space-y-4">
              {/* Card Destaque: Valor e Status */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Valor da Despesa
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-red-400">
                    {formatCurrency(despesa.valor)}
                  </div>
                </div>
                <div>
                  {isPaga ? (
                    <span
                      id="badge-status-paga"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      PAGA
                    </span>
                  ) : (
                    <span
                      id="badge-status-pendente"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-xs"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      PENDENTE
                    </span>
                  )}
                </div>
              </div>

              {/* Tabela de Atributos */}
              <div className="bg-[#121212] rounded-2xl border border-white/10 divide-y divide-white/5">
                <div className="p-3 sm:p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 text-xs sm:text-sm">Descrição</span>
                  <span className="font-bold text-white text-right max-w-[65%]">
                    {despesa.descricao}
                  </span>
                </div>

                <div className="p-3 sm:p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 text-xs sm:text-sm flex items-center gap-2">
                    <Tag className="w-4 h-4 text-zinc-500" />
                    Categoria
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white/5 text-zinc-200 border border-white/10">
                    {despesa.categoria}
                  </span>
                </div>

                <div className="p-3 sm:p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 text-xs sm:text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    Data da Despesa
                  </span>
                  <span className="font-medium text-white">
                    {formatDateBR(despesa.data)}
                  </span>
                </div>

                <div className="p-3 sm:p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 text-xs sm:text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-zinc-500" />
                    Forma {isPaga ? 'Utilizada' : 'Originalmente Informada'}
                  </span>
                  <span className="text-zinc-300 font-medium">
                    {despesa.formaPagamento || 'Não informada'}
                  </span>
                </div>

                <div className="p-3 sm:p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 text-xs sm:text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-500" />
                    Registrado por
                  </span>
                  <span className="text-zinc-300 font-medium">
                    {despesa.criadoPorNome}
                  </span>
                </div>

                {/* Campos adicionais quando PAGA */}
                {isPaga && (
                  <>
                    <div className="p-3 sm:p-3.5 flex items-center justify-between bg-emerald-500/5">
                      <span className="text-zinc-300 text-xs sm:text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        Data do Pagamento
                      </span>
                      <span className="font-bold text-emerald-400">
                        {formatDateBR(despesa.dataPagamento || despesa.data)}
                      </span>
                    </div>

                    {despesa.pagoPorNome && (
                      <div className="p-3 sm:p-3.5 flex items-center justify-between bg-emerald-500/5">
                        <span className="text-zinc-300 text-xs sm:text-sm flex items-center gap-2">
                          <User className="w-4 h-4 text-emerald-400" />
                          Pagamento confirmado por
                        </span>
                        <span className="text-zinc-200 font-medium">
                          {despesa.pagoPorNome}
                        </span>
                      </div>
                    )}
                  </>
                )}

                <div className="p-3 sm:p-3.5 flex items-center justify-between">
                  <span className="text-zinc-400 text-xs sm:text-sm flex items-center gap-2">
                    <Hash className="w-4 h-4 text-zinc-500" />
                    ID da Despesa
                  </span>
                  <span className="font-mono text-xs text-zinc-400">
                    {despesa.id}
                  </span>
                </div>

                {despesa.observacao && (
                  <div className="p-3 sm:p-3.5 space-y-1">
                    <span className="text-xs text-zinc-400 block font-semibold">
                      Observação
                    </span>
                    <p className="text-xs sm:text-sm text-zinc-300 bg-white/5 p-2.5 rounded-xl border border-white/5">
                      {despesa.observacao}
                    </p>
                  </div>
                )}
              </div>

              {/* Mensagem de Contexto */}
              {isPendente ? (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed">
                  <strong className="font-bold">Obrigação Pendente:</strong> Esta despesa ainda não foi paga e <span className="underline">não impacta o Saldo do Caixa</span> nem consta nas saídas efetivas até que o pagamento seja registrado.
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed">
                  <strong className="font-bold">Despesa Quitada:</strong> O pagamento foi confirmado e a respectiva saída já foi lançada no Caixa da academia. Registro disponível em modo somente leitura.
                </div>
              )}
            </div>
          )}

          {/* MODO 2: FORMULÁRIO REGISTRAR PAGAMENTO */}
          {modo === 'PAGAR' && (
            <form onSubmit={handleConfirmarPagamento} className="space-y-4">
              {/* Resumo da Despesa a Pagar */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Despesa:</span>
                  <span className="font-bold text-white">{despesa.descricao}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Categoria:</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 text-zinc-200">
                    {despesa.categoria}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Data da Despesa:</span>
                  <span className="text-xs text-zinc-300">{formatDateBR(despesa.data)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/10">
                  <span className="text-xs font-bold text-zinc-300">Valor Pago:</span>
                  <span className="text-lg font-black text-red-400">
                    {formatCurrency(despesa.valor)}
                  </span>
                </div>
              </div>

              {/* Data do Pagamento */}
              <div>
                <label
                  htmlFor="input-pagamento-data"
                  className="block text-xs font-bold text-zinc-300 mb-1"
                >
                  Data do Pagamento *
                </label>
                <input
                  type="date"
                  id="input-pagamento-data"
                  required
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Data em que o valor efetivamente saiu do Caixa ou banco. O Caixa considerará a saída nesta data.
                </p>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label
                  htmlFor="select-pagamento-forma"
                  className="block text-xs font-bold text-zinc-300 mb-1"
                >
                  Forma de Pagamento *
                </label>
                <select
                  id="select-pagamento-forma"
                  required
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white"
                >
                  <option value="PIX" className="bg-[#18181b] text-white">PIX</option>
                  <option value="Transferência" className="bg-[#18181b] text-white">Transferência</option>
                  <option value="Boleto / Débito" className="bg-[#18181b] text-white">Boleto / Débito</option>
                  <option value="Dinheiro" className="bg-[#18181b] text-white">Dinheiro</option>
                  <option value="Cartão" className="bg-[#18181b] text-white">Cartão</option>
                </select>
              </div>

              {/* Observação Opcional */}
              <div>
                <label
                  htmlFor="input-pagamento-obs"
                  className="block text-xs font-bold text-zinc-300 mb-1"
                >
                  Observação do Pagamento (opcional)
                </label>
                <textarea
                  id="input-pagamento-obs"
                  rows={2}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex: Comprovante arquivado no drive, pago via conta Santander..."
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white placeholder:text-zinc-500 resize-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-zinc-300">
                Ao confirmar este registro, a despesa passará para <strong className="text-emerald-400 font-bold">PAGA</strong> e uma saída de <strong className="text-red-400 font-bold">{formatCurrency(despesa.valor)}</strong> será registrada no Caixa para fins de controle.
              </div>

              {/* Botões do Formulário */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  id="btn-cancelar-pagamento-despesa"
                  onClick={() => setModo('DETALHES')}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs transition-all active:scale-98 disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  id="btn-confirmar-pagamento-despesa"
                  disabled={loading}
                  className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-xs shadow-lg shadow-lime-500/20 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-lime-400 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    'Gravando saída no Caixa...'
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                      <span>Confirmar Registro</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* RODAPÉ DO MODO DETALHES */}
        {modo === 'DETALHES' && (
          <div className="p-4 sm:p-5 border-t border-white/10 bg-white/5 flex gap-2.5 flex-shrink-0">
            <button
              type="button"
              id="btn-fechar-detalhes-despesa"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs transition-all active:scale-98"
            >
              Fechar
            </button>

            {isPendente && isAdmin && (
              <button
                type="button"
                id="btn-iniciar-pagamento-despesa"
                onClick={() => setModo('PAGAR')}
                className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-xs shadow-lg shadow-lime-500/20 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-lime-400 flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4 stroke-[2.5]" />
                <span>Registrar Pagamento</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
