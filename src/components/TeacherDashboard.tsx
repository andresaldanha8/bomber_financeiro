import React, { useState } from 'react';
import { Aluno, Mensalidade } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDateBR, getTodayDateStr, getFutureDateStr, getCompetenciaFromDate } from '../services/financeService';
import { getStudents } from '../services/studentsApi';
import { queryMensalidades, MensalidadeApi } from '../services/mensalidadesApi';
import {
  Search,
  UserPlus,
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle,
  QrCode,
  Banknote,
  ChevronRight,
  Phone,
  X,
  Pencil,
} from 'lucide-react';

interface TeacherDashboardProps {
  onOpenPaymentModal: (aluno: Aluno, mensalidade?: Mensalidade) => void;
  onOpenStudentModal: () => void;
  onNavigateToAlunos?: () => void;
  onEditStudent?: (aluno: Aluno) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onOpenPaymentModal,
  onOpenStudentModal,
  onNavigateToAlunos,
  onEditStudent,
}) => {
  const { currentUser } = useAuth();
  // Guard explícito para segurança de null: esta tela exige sessão, mas durante
  // restauração `currentUser` pode ser null. Retornamos um placeholder até a
  // sessão ser restaurada para evitar usar currentUser sem checagem.
  if (!currentUser) {
    return (
      <div className="min-h-[200px] flex items-center justify-center text-zinc-400">
        <div className="text-sm font-bold">Carregando usuário...</div>
      </div>
    );
  }
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<
    'TODOS' | 'ATRASADOS' | 'PROXIMOS_7_DIAS' | 'AGUARDANDO'
  >('TODOS');

  // Dados carregados da API
  const [todosAlunos, setTodosAlunos] = useState<Aluno[]>([]);
  const [mensalidades, setMensalidades] = useState<MensalidadeApi[]>([]);

  React.useEffect(() => {
    let mounted = true;
    // iniciar carregamento (estado local removido: apenas carregar dados)

    Promise.all([getStudents(), queryMensalidades()])
      .then(([students, mensalidadesResp]) => {
        if (!mounted) return;
        // getStudents() já retorna Aluno[] — usar diretamente e ordenar por nome
        const alunosOrdenados = students.slice().sort((a, b) => a.nome.localeCompare(b.nome));
        setTodosAlunos(alunosOrdenados);

        // mensalidades API -> manter como vem
        setMensalidades(mensalidadesResp);
      })
      .catch(() => {
        // silenciar erro aqui: componente continuará renderizando com listas vazias
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Janela dinâmica que avança automaticamente conforme a data atual
  const hoje = getTodayDateStr();
  const hojeMais7 = getFutureDateStr(7);

  // Agrupa mensalidades por studentId para consultas em memória
  const mensalidadesByStudent = React.useMemo(() => {
    const map = new Map<string, MensalidadeApi[]>();
    for (const m of mensalidades) {
      const sid = (m as MensalidadeApi).studentId;
      if (!sid) continue;
      const arr = map.get(sid) || [];
      arr.push(m);
      map.set(sid, arr);
    }
    return map;
  }, [mensalidades]);

  function getMensalidadeAtualDoAlunoLocal(alunoId: string): MensalidadeApi | undefined {
    const list = mensalidadesByStudent.get(alunoId) || [];
    // Prioriza a que está em aberto (ATRASADA, PENDENTE, AGUARDANDO_CONFIRMACAO)
    const emAberto = list.find(
      (m) => m.status === 'ATRASADA' || m.status === 'PENDENTE' || m.status === 'AGUARDANDO_CONFIRMACAO'
    );
    if (emAberto) return emAberto;
    return list[0];
  }

  function isPagamentoInicialPendenteLocal(alunoId: string): boolean {
    const list = mensalidadesByStudent.get(alunoId) || [];
    if (list.length === 0) return false;
    if (list.some((m) => m.status === 'QUITADA')) return false;
    if (list.some((m) => m.status === 'AGUARDANDO_CONFIRMACAO')) return false;
    const atual = getMensalidadeAtualDoAlunoLocal(alunoId);
    return !!atual && (atual.status === 'PENDENTE' || atual.status === 'ATRASADA');
  }

  // Converte MensalidadeApi em Mensalidade (estrutura esperada pelo restante da UI)
  function mapMensalidadeApiToMensalidade(m: MensalidadeApi, alunoNome?: string): Mensalidade {
    const valorNum = typeof m.valor === 'number' ? m.valor : parseFloat(String(m.valor || '0')) || 0;
    return {
      id: m.id,
      alunoId: m.studentId,
      alunoNome: alunoNome || '',
      competencia: m.competencia,
      anoMes: m.anoMes || '',
      valor: valorNum,
      dataVencimento: m.dataVencimento,
      status: m.status,
    };
  }

  // Estatísticas do dashboard (mesma semântica do financeService)
  const stats = React.useMemo(() => {
    const mensalidadesAll = mensalidades;
    const alunos = todosAlunos;

    const totalAtrasados = mensalidadesAll.filter((m) => {
      const aluno = alunos.find((a) => a.id === m.studentId);
      if (!aluno || aluno.status !== 'ATIVO') return false;
      if (m.status === 'QUITADA' || m.status === 'AGUARDANDO_CONFIRMACAO') return false;
      if (isPagamentoInicialPendenteLocal(aluno.id)) return false;
      return m.status === 'ATRASADA' || (m.status === 'PENDENTE' && m.dataVencimento < hoje);
    }).length;

    const totalProximos7Dias = mensalidadesAll.filter((m) => {
      const aluno = alunos.find((a) => a.id === m.studentId);
      if (!aluno || aluno.status !== 'ATIVO') return false;
      if (m.status === 'QUITADA' || m.status === 'AGUARDANDO_CONFIRMACAO') return false;
      if (isPagamentoInicialPendenteLocal(aluno.id)) return false;
      return m.status === 'PENDENTE' && m.dataVencimento >= hoje && m.dataVencimento <= hojeMais7;
    }).length;

    const totalAguardandoConfirmacao = mensalidadesAll.filter((m) => {
      const aluno = alunos.find((a) => a.id === m.studentId);
      return aluno?.status === 'ATIVO' && m.status === 'AGUARDANDO_CONFIRMACAO';
    }).length;

    return {
      totalAtrasados,
      totalVencemSemana: totalProximos7Dias,
      totalProximos7Dias,
      totalAguardandoConfirmacao,
    };
  }, [mensalidades, todosAlunos, hoje, hojeMais7]);

  // Aplica filtragem por status e busca (mesma semântica do financeService.getAlunos)
  const filteredAlunos = React.useMemo(() => {
    let list = todosAlunos.slice();
    // manter apenas ATIVO por padrão (quando aplicável)
    list = list.filter((a) => a.status === 'ATIVO');

    if (search && search.trim() !== '') {
      const rawQ = search.toLowerCase().trim();
      const normQ = rawQ.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const qDigits = rawQ.replace(/\D/g, '');

      list = list.filter((a) => {
        const nomeLower = a.nome.toLowerCase();
        const nomeNorm = nomeLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const matchNome = nomeLower.includes(rawQ) || nomeNorm.includes(normQ);

        const telLower = a.telefone.toLowerCase();
        const matchTel = telLower.includes(rawQ);
        const matchDigits = qDigits.length > 0 && a.telefone.replace(/\D/g, '').includes(qDigits);

        return matchNome || matchTel || matchDigits;
      });
    }

    return list.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [todosAlunos, search]);

  // Mapeia alunos com suas respectivas mensalidades em aberto/atuais
  const itens = filteredAlunos.map((aluno) => {
    const mensalidade = getMensalidadeAtualDoAlunoLocal(aluno.id);
    const isQuitada = mensalidade?.status === 'QUITADA';
    const isAguardando = mensalidade?.status === 'AGUARDANDO_CONFIRMACAO';
    const isPagamentoInicial = isPagamentoInicialPendenteLocal(aluno.id);

    // Regras cirúrgicas de classificação:
    const isAtrasado =
      !isPagamentoInicial &&
      !isQuitada &&
      !isAguardando &&
      (mensalidade?.status === 'ATRASADA' || (mensalidade?.status === 'PENDENTE' && mensalidade?.dataVencimento < hoje));

    const isProximos7Dias =
      !isPagamentoInicial &&
      !isQuitada &&
      !isAguardando &&
      mensalidade?.status === 'PENDENTE' &&
      mensalidade?.dataVencimento >= hoje &&
      mensalidade?.dataVencimento <= hojeMais7;

    return {
      aluno,
      mensalidade,
      isPagamentoInicial,
      isAtrasado,
      isProximos7Dias,
      isAguardando,
      isQuitada,
    };
  });

  // Priorização da lista da Home por relevância/urgência:
  // 1. Atrasados
  // 2. Vencimentos mais próximos (próximos 7 dias / pendentes)
  // 3. Pagamentos aguardando confirmação
  // 4. Demais pendências
  // 5. Quitadas
  const itensOrdenados = [...itens].sort((a, b) => {
    const getPriority = (item: typeof itens[0]) => {
      if (item.isAtrasado) return 1;
      if (item.isProximos7Dias) return 2;
      if (item.isAguardando) return 3;
      if (!item.isQuitada) return 4;
      return 5;
    };

    const prioA = getPriority(a);
    const prioB = getPriority(b);
    if (prioA !== prioB) return prioA - prioB;

    const dateA = a.mensalidade?.dataVencimento || '9999-99-99';
    const dateB = b.mensalidade?.dataVencimento || '9999-99-99';
    const compDate = dateA.localeCompare(dateB);
    if (compDate !== 0) return compDate;

    return a.aluno.nome.localeCompare(b.aluno.nome);
  });

  // Aplica filtro interativo dos cards
  const itensFiltrados = itensOrdenados.filter((item) => {
    if (activeFilter === 'ATRASADOS') return item.isAtrasado;
    if (activeFilter === 'PROXIMOS_7_DIAS') return item.isProximos7Dias;
    if (activeFilter === 'AGUARDANDO') return item.isAguardando;
    return true;
  });

  // Redução da lista da Home:
  // No modo resumo padrão ('TODOS') e sem busca textual, limita inicialmente a 5 registros mais urgentes
  const HOME_LIMIT = 5;
  const isLimited = activeFilter === 'TODOS' && search.trim() === '';
  const displayedItens = isLimited
    ? itensFiltrados.slice(0, HOME_LIMIT)
    : itensFiltrados;

  return (
    <div id="teacher-dashboard-view" className="space-y-4 pb-20">
      {/* Topo: Identidade Bomber Fitness & Saudação do Professor */}
      <div className="flex items-center justify-between pb-0.5">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
            <p className="text-[10px] font-black uppercase tracking-wider text-lime-400">
              BOMBER FITNESS • PAINEL OPERACIONAL
            </p>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
            Olá, {currentUser.name}
          </h2>
        </div>
      </div>

      {/* Barra de Busca e Cadastrar Aluno */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            id="input-busca-aluno-professor"
            placeholder="Buscar aluno por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-2xl border border-white/10 bg-[#18181b] text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 shadow-inner placeholder:text-zinc-500 font-medium"
          />
          {search.trim() !== '' && (
            <button
              type="button"
              id="btn-limpar-busca-aluno"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          id="btn-cadastrar-aluno-top"
          onClick={onOpenStudentModal}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-sm shadow-lg shadow-lime-500/20 transition-all active:scale-[0.99]"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Cadastrar Novo Aluno</span>
        </button>
      </div>

      {/* Cards de Resumo Operacional Interativos (NUNCA EXIBE SALDO OU LUCRO) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {/* Card 1: Em Atraso */}
        <button
          type="button"
          id="card-filtro-atrasados"
          onClick={() =>
            setActiveFilter(activeFilter === 'ATRASADOS' ? 'TODOS' : 'ATRASADOS')
          }
          className={`p-2 sm:p-3 rounded-2xl border text-left transition-all relative overflow-hidden active:scale-95 ${
            activeFilter === 'ATRASADOS'
              ? 'bg-[#1e1416] border-red-500/60 ring-2 ring-red-500/20 text-white shadow-md shadow-red-950/40'
              : 'bg-[#18181b] border-white/10 hover:border-white/20 text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-1 text-red-400 mb-1 min-w-0">
            <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="text-[9px] min-[375px]:text-[9.5px] sm:text-[10px] font-bold uppercase tracking-tight whitespace-nowrap">
              EM ATRASO
            </span>
          </div>
          <div className="text-xl font-black text-red-400 leading-none">
            {stats.totalAtrasados}
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">alunos</span>
        </button>

        {/* Card 2: Próximos 7 Dias */}
        <button
          type="button"
          id="card-filtro-proximos-7-dias"
          onClick={() =>
            setActiveFilter(
              activeFilter === 'PROXIMOS_7_DIAS' ? 'TODOS' : 'PROXIMOS_7_DIAS'
            )
          }
          className={`p-2 sm:p-3 rounded-2xl border text-left transition-all relative overflow-hidden active:scale-95 ${
            activeFilter === 'PROXIMOS_7_DIAS'
              ? 'bg-[#172016] border-lime-400/60 ring-2 ring-lime-400/20 text-white shadow-md shadow-lime-950/40'
              : 'bg-[#18181b] border-white/10 hover:border-white/20 text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-1 text-lime-400 mb-1 min-w-0">
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="text-[9px] min-[375px]:text-[9.5px] sm:text-[10px] font-bold uppercase tracking-tight whitespace-nowrap">
              PRÓX. 7 DIAS
            </span>
          </div>
          <div className="text-xl font-black text-lime-400 leading-none">
            {stats.totalProximos7Dias ?? stats.totalVencemSemana}
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">alunos</span>
        </button>

        {/* Card 3: Aguardando Confirmação */}
        <button
          type="button"
          id="card-filtro-aguardando"
          onClick={() =>
            setActiveFilter(activeFilter === 'AGUARDANDO' ? 'TODOS' : 'AGUARDANDO')
          }
          className={`p-2 sm:p-3 rounded-2xl border text-left transition-all relative overflow-hidden active:scale-95 ${
            activeFilter === 'AGUARDANDO'
              ? 'bg-[#1f1b13] border-amber-400/60 ring-2 ring-amber-400/20 text-white shadow-md shadow-amber-950/40'
              : 'bg-[#18181b] border-white/10 hover:border-white/20 text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-1 text-amber-400 mb-1 min-w-0">
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="text-[9px] min-[375px]:text-[9.5px] sm:text-[10px] font-bold uppercase tracking-tight whitespace-nowrap">
              AGUARDANDO
            </span>
          </div>
          <div className="text-xl font-black text-amber-400 leading-none">
            {stats.totalAguardandoConfirmacao}
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">pagamentos</span>
        </button>
      </div>

      {/* Título da Seção, Filtro Ativo e Ação Discreta "Ver todos" */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-sm font-bold text-white tracking-tight">
          {search.trim() !== ''
            ? `Resultados para "${search.trim()}"`
            : activeFilter === 'ATRASADOS'
            ? 'Alunos com Mensalidade em Atraso'
            : activeFilter === 'PROXIMOS_7_DIAS'
            ? 'Vencimentos nos Próximos 7 Dias'
            : activeFilter === 'AGUARDANDO'
            ? 'Pagamentos Aguardando Confirmação (Admin)'
            : 'Resumo Operacional • Mais Urgentes'}
        </h2>

        <div className="flex items-center gap-3">
          {search.trim() !== '' && (
            <button
              type="button"
              id="btn-limpar-busca-topo"
              onClick={() => setSearch('')}
              className="text-xs font-bold text-zinc-400 hover:text-white hover:underline"
            >
              Limpar busca
            </button>
          )}

          {activeFilter !== 'TODOS' ? (
            <button
              type="button"
              id="btn-limpar-filtro"
              onClick={() => setActiveFilter('TODOS')}
              className="text-xs font-bold text-lime-400 hover:underline"
            >
              Limpar filtro
            </button>
          ) : (
            search.trim() === '' &&
            onNavigateToAlunos && (
              <button
                type="button"
                id="btn-ver-todos-topo"
                onClick={onNavigateToAlunos}
                className="text-xs font-bold text-lime-400 hover:underline inline-flex items-center gap-0.5"
              >
                <span>Ver todos</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Lista de Alunos Relevantes / Filtrados */}
      {displayedItens.length === 0 ? (
        <div className="p-8 text-center bg-[#18181b] rounded-2xl border border-white/10 space-y-2 text-white">
          <p className="text-sm font-semibold text-zinc-200">
            Nenhum aluno encontrado.
          </p>
          {search.trim() !== '' ? (
            <button
              type="button"
              id="btn-limpar-busca-vazio"
              onClick={() => setSearch('')}
              className="text-xs font-bold text-lime-400 hover:underline inline-block pt-1"
            >
              Limpar busca
            </button>
          ) : activeFilter !== 'TODOS' ? (
            <button
              type="button"
              id="btn-limpar-filtro-vazio"
              onClick={() => setActiveFilter('TODOS')}
              className="text-xs font-bold text-lime-400 hover:underline inline-block pt-1"
            >
              Mostrar todos os alunos
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayedItens.map(
            ({
              aluno,
              mensalidade,
              isPagamentoInicial,
              isAtrasado,
              isProximos7Dias,
              isAguardando,
              isQuitada,
            }) => {
              const mensalidadeLegacy = mensalidade ? mapMensalidadeApiToMensalidade(mensalidade, aluno.nome) : undefined;
              const hasMensalidade = !!mensalidade;

              return (
                <div
                  key={aluno.id}
                  id={`card-aluno-${aluno.id}`}
                  className="p-3.5 rounded-2xl border border-white/10 bg-[#18181b] text-white transition-all shadow-md shadow-black/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Dados do Aluno */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white truncate">
                          {aluno.nome}
                        </h3>

                        {/* Status Principal Simplificado */}
                        {isPagamentoInicial && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Pagamento inicial pendente
                          </span>
                        )}
                        {isAtrasado && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/15 text-red-300 border border-red-500/30">
                            Atrasado
                          </span>
                        )}
                        {isProximos7Dias && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-lime-400/15 text-lime-300 border border-lime-400/30">
                            Próximos 7 dias
                          </span>
                        )}
                        {isAguardando && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>AGUARDANDO CONFIRMAÇÃO</span>
                          </span>
                        )}
                        {isQuitada && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Quitada</span>
                          </span>
                        )}
                      </div>

                      {/* Vencimento e Telefone (Visíveis) */}
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          <span>
                            Venc.:{' '}
                            {mensalidade
                              ? formatDateBR(mensalidade.dataVencimento)
                              : 'Sem mensalidade registrada'}
                          </span>
                        </span>

                        {aluno.telefone && (
                          <span className="hidden xs:flex items-center gap-1">
                            <Phone className="w-3 h-3 text-zinc-500" />
                            <span>{aluno.telefone}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Valor Individual e Competência (Visíveis) */}
                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      <div>
                        {hasMensalidade ? (
                          <>
                            <span className="text-sm font-black text-white block">
                              {formatCurrency(typeof mensalidade!.valor === 'number' ? mensalidade!.valor : parseFloat(String(mensalidade!.valor || '0')) || 0)}
                            </span>
                            <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                              {mensalidade!.competencia ? getCompetenciaFromDate(mensalidade!.competencia).competencia : ''}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-zinc-400">Sem mensalidade registrada</span>
                        )}
                      </div>
                      {onEditStudent && (
                        <button
                          type="button"
                          id={`btn-edit-aluno-home-${aluno.id}`}
                          onClick={() => onEditStudent(aluno)}
                          title="Corrigir dados do aluno (Nome, telefone, observações)"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-lime-400 hover:bg-white/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Linha Inferior: Forma de Pagamento / Ação Operacional */}
                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-medium">
                      {!hasMensalidade
                        ? 'Sem mensalidade registrada'
                        : isPagamentoInicial
                        ? 'Pagamento de entrada pendente'
                        : isAguardando
                        ? 'Informado por você'
                        : isQuitada
                        ? 'Mensalidade do mês liquidada'
                        : 'Obrigação pendente'}
                    </span>

                    {/* Exibição da Forma de Pagamento Separada ou Ação de Pagamento */}
                    {!hasMensalidade ? (
                      <span className="text-xs font-medium text-zinc-400">&mdash;</span>
                    ) : isAguardando ? (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-white/10 text-white border border-white/15">
                          <span>Não informado</span>
                        </span>
                      </div>
                    ) : isQuitada ? (
                      <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                        Em dia
                      </span>
                    ) : (
                      <button
                        type="button"
                        id={`btn-registrar-pagamento-aluno-${aluno.id}`}
                        onClick={() => onOpenPaymentModal(aluno, mensalidadeLegacy)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black text-xs font-black transition-all shadow-md shadow-lime-500/20 active:scale-95"
                      >
                        <span>Registrar Pagamento</span>
                        <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                </div>
              );
            }
          )}

          {/* Ação Discreta "Ver todos" no Rodapé do Resumo */}
          {isLimited && onNavigateToAlunos && filteredAlunos.length > HOME_LIMIT && (
            <div className="pt-2 text-center">
              <button
                type="button"
                id="btn-ver-todos-alunos-home"
                onClick={onNavigateToAlunos}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold border border-white/10 transition-all active:scale-95"
              >
                <span>Ver todos na área Alunos ({filteredAlunos.length})</span>
                <ChevronRight className="w-3.5 h-3.5 text-lime-400" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
