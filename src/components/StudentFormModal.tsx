import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService, formatCurrency, formatDateBR } from '../services/financeService';
import { Aluno, AlunoStatus } from '../types';
import { X, UserPlus, AlertCircle, Info, Lock, Pencil, Shield, CheckCircle2 } from 'lucide-react';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (nomeAluno: string, isEdicao?: boolean) => void;
  alunoParaEditar?: Aluno | null;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  alunoParaEditar,
}) => {
  const { currentUser } = useAuth();
  const planos = financeService.getPlanos();

  const isEditing = !!alunoParaEditar;
  const isAdmin = currentUser.role === 'ADMIN';

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataEntrada, setDataEntrada] = useState('2026-09-03');
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [planoId, setPlanoId] = useState(planos[0]?.id || 'plano-individual');
  const [status, setStatus] = useState<AlunoStatus>('ATIVO');
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sincroniza formulário quando modal abre ou aluno selecionado muda
  useEffect(() => {
    if (alunoParaEditar) {
      setNome(alunoParaEditar.nome || '');
      setTelefone(alunoParaEditar.telefone || '');
      setDataEntrada(alunoParaEditar.dataEntrada || '2026-09-03');
      setDiaVencimento(String(alunoParaEditar.diaVencimento || '10'));
      setPlanoId(alunoParaEditar.planoId || planos[0]?.id || 'plano-individual');
      setStatus(alunoParaEditar.status || 'ATIVO');
      setObservacao(alunoParaEditar.observacao || '');
    } else {
      setNome('');
      setTelefone('');
      setDataEntrada('2026-09-03');
      setDiaVencimento('10');
      setPlanoId(planos[0]?.id || 'plano-individual');
      setStatus('ATIVO');
      setObservacao('');
    }
    setErrorMsg('');
  }, [alunoParaEditar, isOpen]);

  if (!isOpen) return null;

  const selectedPlano = planos.find((p) => p.id === planoId) || planos[0];
  const valorPrimeiraMensalidade = financeService.getValorPrimeiraMensalidade(planoId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErrorMsg('Informe o nome completo do aluno.');
      return;
    }

    const diaNum = parseInt(diaVencimento, 10);
    if (!isEditing || isAdmin) {
      if (isNaN(diaNum) || diaNum < 1 || diaNum > 31) {
        setErrorMsg('Dia de vencimento deve estar entre 1 e 31.');
        return;
      }
    }

    try {
      setLoading(true);
      setErrorMsg('');

      if (isEditing && alunoParaEditar) {
        financeService.atualizarAluno(
          alunoParaEditar.id,
          {
            nome,
            telefone,
            observacao,
            ...(isAdmin
              ? {
                  dataEntrada,
                  diaVencimento: diaNum,
                  planoId,
                  status,
                }
              : {}),
          },
          currentUser
        );
        onSuccess(nome, true);
      } else {
        financeService.cadastrarAluno(
          {
            nome,
            telefone,
            dataEntrada,
            diaVencimento: diaNum,
            planoId,
            observacao,
          },
          currentUser
        );
        onSuccess(nome, false);
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao processar dados do aluno.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="student-form-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        id="student-form-modal-content"
        className="w-full sm:max-w-lg bg-[#18181b] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/40 text-white sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Pencil className="w-5 h-5 text-lime-400" />
            ) : (
              <UserPlus className="w-5 h-5 text-lime-400" />
            )}
            <div>
              <h2 className="text-base font-black text-white tracking-tight">
                {isEditing
                  ? isAdmin
                    ? 'Editar Cadastro do Aluno'
                    : 'Corrigir Dados do Aluno'
                  : 'Cadastrar Novo Aluno'}
              </h2>
              {isEditing && !isAdmin && (
                <span className="text-[11px] text-zinc-400 block font-normal">
                  Nome, telefone e observações são editáveis
                </span>
              )}
            </div>
          </div>
          <button
            id="btn-close-student-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 1. Dados Básicos */}
          <div>
            <label
              htmlFor="input-aluno-nome"
              className="block text-xs font-bold text-zinc-300 mb-1"
            >
              Nome Completo *
            </label>
            <input
              type="text"
              id="input-aluno-nome"
              required
              placeholder="Ex: João da Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white placeholder:text-zinc-500"
            />
          </div>

          <div>
            <label
              htmlFor="input-aluno-telefone"
              className="block text-xs font-bold text-zinc-300 mb-1"
            >
              Telefone / WhatsApp
            </label>
            <input
              type="text"
              id="input-aluno-telefone"
              placeholder="(11) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* 2. Dados Financeiros e de Matrícula */}
          {isEditing && !isAdmin ? (
            /* Professor em modo de edição visualiza dados fixos */
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Dados de Matrícula e Financeiro (Fixados pelo Admin)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Data de Entrada:</span>
                  <span className="font-semibold text-zinc-300">
                    {formatDateBR(alunoParaEditar?.dataEntrada || '2026-09-03')}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Vencimento:</span>
                  <span className="font-semibold text-zinc-300">
                    Todo dia {alunoParaEditar?.diaVencimento}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Condição de Entrada:</span>
                  <span className="font-semibold text-lime-400">
                    {selectedPlano?.nome || 'INDIVIDUAL'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Status:</span>
                  <span
                    className={`font-semibold ${
                      alunoParaEditar?.status === 'ATIVO' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {alunoParaEditar?.status}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Novo Aluno ou Admin em Edição */
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="input-aluno-data-entrada"
                    className="block text-xs font-bold text-zinc-300 mb-1"
                  >
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    id="input-aluno-data-entrada"
                    required
                    value={dataEntrada}
                    onChange={(e) => setDataEntrada(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-aluno-dia-vencimento"
                    className="block text-xs font-bold text-zinc-300 mb-1"
                  >
                    Dia de Vencimento *
                  </label>
                  <input
                    type="number"
                    id="input-aluno-dia-vencimento"
                    min={1}
                    max={31}
                    required
                    value={diaVencimento}
                    onChange={(e) => setDiaVencimento(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white font-black"
                  />
                  <span className="text-[10px] text-zinc-500">Ex: todo dia 10</span>
                </div>
              </div>

              {/* Status (Exibido para o ADMIN em modo edição) */}
              {isEditing && isAdmin && (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Status do Aluno (ADMIN)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="btn-set-status-ativo"
                      onClick={() => setStatus('ATIVO')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        status === 'ATIVO'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-2 ring-emerald-500/20'
                          : 'bg-black/30 border-white/10 text-zinc-400 hover:bg-white/5'
                      }`}
                    >
                      Ativo
                    </button>
                    <button
                      type="button"
                      id="btn-set-status-inativo"
                      onClick={() => setStatus('INATIVO')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        status === 'INATIVO'
                          ? 'bg-red-500/20 text-red-300 border-red-500/40 ring-2 ring-red-500/20'
                          : 'bg-black/30 border-white/10 text-zinc-400 hover:bg-white/5'
                      }`}
                    >
                      Inativo
                    </button>
                  </div>
                </div>
              )}

              {/* Condição de Entrada / Plano */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-zinc-300">
                    Condição de Entrada / Plano *
                  </label>
                  <span className="text-[10px] text-zinc-400">
                    Desconto válido no 1º mês
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {planos.map((p) => {
                    const isSelected = p.id === planoId;
                    const precoEntrada = financeService.getValorPrimeiraMensalidade(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        id={`btn-select-plano-${p.id}`}
                        onClick={() => setPlanoId(p.id)}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-lime-400 bg-lime-400/10 text-white ring-2 ring-lime-400/20'
                            : 'border-white/10 bg-black/30 hover:bg-white/5 text-zinc-400'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold leading-tight">{p.nome}</p>
                          <p className="text-base font-black text-lime-400 mt-1">
                            {formatCurrency(precoEntrada)}
                          </p>
                          <span className="text-[10px] text-zinc-400 block leading-tight mt-0.5">
                            {p.id === 'plano-individual' ? 'mensal' : '1º mês'}
                          </span>
                        </div>
                        {p.id !== 'plano-individual' && (
                          <div className="mt-1.5 pt-1.5 border-t border-white/5 text-[9px] text-zinc-400">
                            depois R$ 80
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Informação e Resumo da Regra Comercial */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-semibold">
                    1ª Mensalidade (Setembro/2026):
                  </span>
                  <span
                    id="badge-valor-primeira-mensalidade"
                    className="font-black text-lime-400 text-sm bg-lime-400/10 px-2.5 py-0.5 rounded-lg border border-lime-400/20"
                  >
                    {formatCurrency(valorPrimeiraMensalidade)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Ciclos seguintes:</span>
                  <span className="font-semibold text-zinc-300 text-xs">
                    R$ 80,00 / mês
                  </span>
                </div>

                <div className="pt-1.5 border-t border-white/5 text-[11px] text-zinc-400 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 text-lime-400 mt-0.5" />
                  <span>
                    {planoId === 'plano-individual'
                      ? 'Plano individual padrão: R$ 80,00 por competência.'
                      : `Condição comercial ${selectedPlano.nome}: desconto aplicado exclusivamente na primeira mensalidade (${formatCurrency(valorPrimeiraMensalidade)}). A partir do próximo ciclo, a mensalidade será de R$ 80,00.`}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* 3. Observação (Sempre editável) */}
          <div>
            <label
              htmlFor="input-aluno-observacao"
              className="block text-xs font-bold text-zinc-300 mb-1"
            >
              Observações (opcional)
            </label>
            <textarea
              id="input-aluno-observacao"
              rows={2}
              placeholder="Ex: Treina com amigo, prefere pagar via PIX..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Botão de Envio */}
          <div className="pt-2">
            <button
              type="submit"
              id="btn-salvar-aluno"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-sm shadow-lg shadow-lime-500/20 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-lime-400 disabled:opacity-50"
            >
              {loading
                ? 'Salvando...'
                : isEditing
                ? 'Salvar Alterações'
                : 'Salvar Cadastro do Aluno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
