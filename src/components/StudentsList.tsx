import React, { useState } from 'react';
import { Aluno, Mensalidade } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  financeService,
  formatCurrency,
  formatDateBR,
  getTodayDateStr,
} from '../services/financeService';
import {
  Search,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Pencil,
  CheckCircle2,
} from 'lucide-react';

interface StudentsListProps {
  onOpenPaymentModal: (aluno: Aluno, mensalidade?: Mensalidade) => void;
  onOpenStudentModal: () => void;
  onEditStudent?: (aluno: Aluno) => void;
}

export const StudentsList: React.FC<StudentsListProps> = ({
  onOpenPaymentModal,
  onOpenStudentModal,
  onEditStudent,
}) => {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATIVO' | 'INATIVO'>('ATIVO');
  const [expandedAlunoId, setExpandedAlunoId] = useState<string | null>(null);

  const alunos = financeService.getAlunos(search, statusFilter);
  const planos = financeService.getPlanos();

  const toggleExpand = (id: string) => {
    setExpandedAlunoId(expandedAlunoId === id ? null : id);
  };

  return (
    <div id="students-list-view" className="space-y-4 pb-20">
      {/* Header e Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#18181b] p-4 rounded-2xl border border-white/10 shadow-sm text-white">
        <div>
          <h2 className="text-base font-black text-white tracking-tight">
            Gestão de Alunos
          </h2>
          <p className="text-xs text-zinc-400">
            Cadastros individuais e acompanhamento de mensalidades
          </p>
        </div>
        <button
          type="button"
          id="btn-open-new-student-modal"
          onClick={onOpenStudentModal}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-xs shadow-lg shadow-lime-500/20 transition-all active:scale-98"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Novo Aluno</span>
        </button>
      </div>

      {/* Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            id="input-search-students"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-[#18181b] text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#18181b] rounded-xl border border-white/10 shrink-0">
          {(['ATIVO', 'INATIVO', 'TODOS'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              id={`btn-filter-status-${filter.toLowerCase()}`}
              onClick={() => setStatusFilter(filter)}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === filter
                  ? 'bg-lime-400 text-black shadow-xs'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {filter === 'ATIVO' ? 'Ativos' : filter === 'INATIVO' ? 'Inativos' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Alunos */}
      {alunos.length === 0 ? (
        <div className="p-8 text-center bg-[#18181b] rounded-2xl border border-white/10 space-y-2 text-white">
          <p className="text-sm font-semibold text-zinc-200">Nenhum aluno encontrado.</p>
          <p className="text-xs text-zinc-400">Tente ajustar a busca ou cadastrar um novo aluno.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {alunos.map((aluno) => {
            const plano = planos.find((p) => p.id === aluno.planoId);
            const mensalidade = financeService.getMensalidadeAtualDoAluno(aluno.id);
            const isExpanded = expandedAlunoId === aluno.id;

            // O valor financeiro exibido vem da mensalidade vigente da competência
            const valorAtual = mensalidade ? mensalidade.valor : 80.0;

            const hoje = getTodayDateStr();
            const diaFormatado = String(aluno.diaVencimento).padStart(2, '0');
            const dataVenc =
              mensalidade?.dataVencimento || `${hoje.slice(0, 7)}-${diaFormatado}`;

            const isPagamentoInicial = financeService.isPagamentoInicialPendente(aluno.id);

            const isAtrasado =
              !isPagamentoInicial &&
              (mensalidade?.status === 'ATRASADA' ||
                (mensalidade?.status === 'PENDENTE' && dataVenc < hoje));

            const isAguardando = mensalidade?.status === 'AGUARDANDO_CONFIRMACAO';
            const isQuitada = mensalidade?.status === 'QUITADA';

            // Aluno está em dia se estiver ATIVO, não estiver com pagamento inicial pendente,
            // não estiver aguardando confirmação, não estiver atrasado, e:
            // ou a mensalidade está quitada, ou a mensalidade em aberto tem vencimento futuro (dataVenc >= hoje)
            const isEmDia =
              aluno.status === 'ATIVO' &&
              !isPagamentoInicial &&
              !isAguardando &&
              !isAtrasado &&
              (isQuitada || (mensalidade?.status === 'PENDENTE' && dataVenc >= hoje));

            let textoVencimento: string;
            if (isPagamentoInicial) {
              textoVencimento = 'Pagamento inicial pendente';
            } else if (isAguardando) {
              textoVencimento = 'Aguarda confirmação';
            } else if (isEmDia && mensalidade?.status === 'PENDENTE' && dataVenc > hoje) {
              const mesVenc = dataVenc.split('-')[1];
              textoVencimento = `Próximo vencimento: ${diaFormatado}/${mesVenc}`;
            } else if (isQuitada) {
              textoVencimento = `Vencimento dia ${diaFormatado}`;
            } else if (dataVenc === hoje) {
              textoVencimento = 'Vence hoje';
            } else if (dataVenc < hoje || isAtrasado) {
              textoVencimento = `Venceu dia ${diaFormatado}`;
            } else {
              textoVencimento = `Vence dia ${diaFormatado}`;
            }

            return (
              <div
                key={aluno.id}
                id={`card-aluno-item-${aluno.id}`}
                className="bg-[#18181b] rounded-2xl border border-white/10 overflow-hidden shadow-md shadow-black/20 text-white"
              >
                <div
                  className="p-3.5 flex items-start justify-between gap-2 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => toggleExpand(aluno.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white truncate">
                        {aluno.nome}
                      </h3>
                      {aluno.status === 'INATIVO' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-zinc-400 border border-white/15">
                          Inativo
                        </span>
                      )}
                      {isPagamentoInicial && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Pagamento inicial pendente
                        </span>
                      )}
                      {isAtrasado && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-500/20 text-red-300 border border-red-500/30">
                          Atrasado
                        </span>
                      )}
                      {isAguardando && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-400/15 text-amber-300 border border-amber-400/30">
                          Aguardando Confirmação
                        </span>
                      )}
                      {isEmDia && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Em dia
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 flex-wrap">
                      <span className="font-semibold text-zinc-300">
                        {plano?.nome || 'INDIVIDUAL'}
                      </span>
                      <span>•</span>
                      <span>{textoVencimento}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-1.5">
                    <div className="mr-1">
                      <span className="text-sm font-black text-white block">
                        {formatCurrency(valorAtual)}
                      </span>
                      <span className="text-[10px] text-zinc-400">atual</span>
                    </div>
                    {onEditStudent && (
                      <button
                        type="button"
                        id={`btn-quick-edit-${aluno.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditStudent(aluno);
                        }}
                        title={isAdmin ? 'Editar cadastro completo' : 'Corrigir dados do aluno'}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-lime-400 hover:bg-white/10 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </div>

                {/* Área expandida com detalhes cadastrais e financeiro */}
                {isExpanded && (() => {
                  const ultimoPagamento = financeService.getUltimoPagamentoDoAluno(aluno.id);
                  return (
                  <div className="px-3.5 pb-3.5 pt-2 border-t border-white/10 bg-[#121214] space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-zinc-500 block text-[10px] font-medium">Telefone:</span>
                        <span className="font-semibold text-zinc-200">
                          {aluno.telefone || 'Não informado'}
                        </span>
                      </div>

                      <div>
                        <span className="text-zinc-500 block text-[10px] font-medium">Data de Início:</span>
                        <span className="font-semibold text-zinc-200">
                          {formatDateBR(aluno.dataEntrada)}
                        </span>
                      </div>

                      <div>
                        <span className="text-zinc-500 block text-[10px] font-medium">Cadastrado por:</span>
                        <span className="font-semibold text-zinc-200">
                          {aluno.criadoPorNome}
                        </span>
                      </div>

                      <div>
                        <span className="text-zinc-500 block text-[10px] font-medium">Vencimento:</span>
                        <span className="font-semibold text-zinc-200">
                          Todo dia {diaFormatado}
                        </span>
                      </div>

                      <div>
                        <span className="text-zinc-500 block text-[10px] font-medium">Condição de Entrada:</span>
                        <span className="font-semibold text-lime-400">
                          {plano?.nome || 'INDIVIDUAL'}
                        </span>
                      </div>

                      <div>
                        <span className="text-zinc-500 block text-[10px] font-medium">Situação da Mensalidade:</span>
                        <span className="font-bold text-white">
                          {isPagamentoInicial
                            ? `Pagamento inicial de ${mensalidade?.competencia || 'Setembro/2026'} pendente`
                            : isAguardando
                            ? `${mensalidade?.competencia} (Aguardando Confirmação)`
                            : isQuitada
                            ? `${mensalidade?.competencia} (Quitada)`
                            : mensalidade
                            ? `${mensalidade.competencia} (${mensalidade.status === 'ATRASADA' ? 'Atrasada' : 'Pendente'})`
                            : 'Sem débitos'}
                        </span>
                      </div>
                    </div>

                    {/* Histórico do Último Pagamento com Data Real vs Vencimento */}
                    {ultimoPagamento && (
                      <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/10 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                          <span className="font-bold text-zinc-300 flex items-center gap-1.5 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Registro do Último Pagamento
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ultimoPagamento.status === 'CONFIRMADO'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                            }`}
                          >
                            {ultimoPagamento.status === 'CONFIRMADO'
                              ? 'Confirmado'
                              : 'Aguardando Confirmação'}
                          </span>
                        </div>

                        {ultimoPagamento.isPagamentoInicial ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <span className="text-zinc-500 block text-[10px]">Competência:</span>
                              <span className="font-semibold text-zinc-200">
                                {ultimoPagamento.competencia}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block text-[10px]">Tipo:</span>
                              <span className="font-semibold text-amber-300">
                                Pagamento de Entrada
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block text-[10px]">Data de Entrada:</span>
                              <span className="font-semibold text-zinc-200">
                                {formatDateBR(aluno.dataEntrada || ultimoPagamento.dataEntrada || ultimoPagamento.dataPagamento)}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block text-[10px]">Data do Pagamento:</span>
                              <span className="font-bold text-emerald-400">
                                {formatDateBR(ultimoPagamento.dataPagamento)}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block text-[10px]">Próximo Vencimento:</span>
                              <span className="font-semibold text-zinc-200">
                                {formatDateBR(ultimoPagamento.proximoVencimento || `${hoje.slice(0, 7)}-${String(aluno.diaVencimento).padStart(2, '0')}`)}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block text-[10px]">Valor / Forma:</span>
                              <span className="font-semibold text-zinc-200">
                                {formatCurrency(ultimoPagamento.valor)} ({ultimoPagamento.formaPagamento})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                            <div>
                              <span className="text-zinc-500 block text-[10px]">Competência:</span>
                              <span className="font-semibold text-zinc-200">
                                {ultimoPagamento.competencia}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block text-[10px]">Vencimento Original:</span>
                              <span className="font-semibold text-zinc-200">
                                {formatDateBR(ultimoPagamento.dataVencimento)}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block text-[10px]">Data do Pagamento:</span>
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-emerald-400">
                                  {formatDateBR(ultimoPagamento.dataPagamento)}
                                </span>
                                {ultimoPagamento.isAntecipado && (
                                  <span className="text-[9px] font-bold text-amber-300 bg-amber-400/15 px-1 py-0.5 rounded border border-amber-400/25">
                                    Antecipado
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-500 block text-[10px]">Valor / Forma:</span>
                              <span className="font-semibold text-zinc-200">
                                {formatCurrency(ultimoPagamento.valor)} ({ultimoPagamento.formaPagamento})
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="text-[10px] text-zinc-400 pt-1 border-t border-white/5 flex flex-wrap items-center justify-between gap-1">
                          <span>
                            Registrado por:{' '}
                            <strong className="text-zinc-300 font-medium">
                              {ultimoPagamento.informadoPorNome}
                            </strong>
                          </span>
                          {ultimoPagamento.confirmadoPorNome && (
                            <span>
                              Confirmado por:{' '}
                              <strong className="text-zinc-300 font-medium">
                                {ultimoPagamento.confirmadoPorNome}
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {aluno.observacao && (
                      <div className="text-xs p-2.5 rounded-xl bg-black/40 border border-white/10">
                        <span className="font-medium text-zinc-400">Observação: </span>
                        <span className="text-zinc-200">{aluno.observacao}</span>
                      </div>
                    )}

                    {/* Ações do Aluno: Editar Dados e Pagamento */}
                    <div className="pt-1 flex items-center gap-2 flex-wrap">
                      {onEditStudent && (
                        <button
                          type="button"
                          id={`btn-editar-aluno-${aluno.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditStudent(aluno);
                          }}
                          className={`flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition-all active:scale-98 ${
                            aluno.status === 'ATIVO' && !isQuitada
                              ? 'flex-1 min-w-[130px]'
                              : 'w-full'
                          }`}
                        >
                          <Pencil className="w-3.5 h-3.5 text-lime-400" />
                          <span>{isAdmin ? 'Editar Cadastro' : 'Editar Dados'}</span>
                        </button>
                      )}

                      {aluno.status === 'ATIVO' && !isQuitada && (
                        <button
                          type="button"
                          id={`btn-expand-pagar-${aluno.id}`}
                          onClick={() => onOpenPaymentModal(aluno, mensalidade)}
                          className="flex-2 min-w-[160px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-xs shadow-lg shadow-lime-500/20 transition-all active:scale-98"
                        >
                          <span>{isAdmin ? 'Confirmar Recebimento' : 'Registrar Pagamento'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
