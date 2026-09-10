import {
  AdiantamentoProfessor,
  Aluno,
  AlunoStatus,
  AuditoriaLog,
  CategoriaDespesa,
  CicloMensalCaixa,
  DashboardAdminStats,
  DashboardProfessorStats,
  Despesa,
  DetalhesMovimentacaoCaixa,
  FormaPagamento,
  Mensalidade,
  MovimentacaoCaixa,
  OrigemMovimentacao,
  PagamentoAluno,
  PagamentoProfessor,
  Plano,
  ResumoFinanceiroMensal,
  StatusAdiantamento,
  User,
} from '../types';

import {
  INITIAL_ALUNOS,
  INITIAL_AUDITORIA,
  INITIAL_DESPESAS,
  INITIAL_MENSALIDADES,
  INITIAL_MOVIMENTACOES_CAIXA,
  INITIAL_PAGAMENTOS_ALUNOS,
  INITIAL_PAGAMENTOS_PROFESSORES,
  INITIAL_PLANOS,
  INITIAL_USERS,
} from '../data/initialData';

const STORAGE_KEYS = {
  USERS: 'bomber_users',
  PLANOS: 'bomber_planos',
  ALUNOS: 'bomber_alunos',
  MENSALIDADES: 'bomber_mensalidades',
  PAGAMENTOS_ALUNOS: 'bomber_pagamentos_alunos',
  DESPESAS: 'bomber_despesas',
  PAGAMENTOS_PROFESSORES: 'bomber_pagamentos_professores',
  ADIANTAMENTOS_PROFESSORES: 'bomber_adiantamentos_professores',
  MOVIMENTACOES_CAIXA: 'bomber_movimentacoes_caixa',
  AUDITORIA: 'bomber_auditoria',
};

export const INITIAL_ADIANTAMENTOS_PROFESSORES: AdiantamentoProfessor[] = [
  {
    id: 'adiant-marcos-300',
    professorId: 'usr-prof-1',
    professorNome: 'Prof. Marcos Andrade',
    valor: 300.0,
    dataSolicitacao: '2026-09-08T14:30:00.000Z',
    motivo: 'Adiantamento quinzenal de aulas',
    status: 'CONFIRMADO',
    dataPagamento: '2026-09-09',
    formaPagamento: 'PIX',
    observacaoPagamento: 'Adiantamento quinzenal pago via PIX',
    registradoPorNome: 'Carlos Ferreira',
    pagoEm: '2026-09-09T10:00:00.000Z',
    confirmadoRecebimentoEm: '2026-09-09T10:15:00.000Z',
  },
];

/**
 * Normaliza a apresentação do nome do professor para evitar duplicação do prefixo "Prof." ou "Profa.".
 * Exemplos:
 * "Marcos Andrade" -> "Prof. Marcos Andrade"
 * "Prof. Marcos Andrade" -> "Prof. Marcos Andrade"
 * "Prof. Prof. Marcos Andrade" -> "Prof. Marcos Andrade"
 */
export function formatProfessorNome(name?: string): string {
  if (!name) return '';
  let clean = name.trim();
  // Remove prefixos duplicados recursivamente
  while (/^Prof(a)?\.\s+Prof(a)?\./i.test(clean)) {
    clean = clean.replace(/^Prof(a)?\.\s+/i, '');
  }
  if (!/^Prof(a)?\./i.test(clean)) {
    clean = `Prof. ${clean}`;
  }
  return clean;
}

/**
 * Remove qualquer ocorrência de "Prof. Prof." em textos livres
 */
export function cleanProfDuplication(text?: string): string {
  if (!text) return '';
  let cleaned = text;
  while (/Prof(a)?\.\s+Prof(a)?\./i.test(cleaned)) {
    cleaned = cleaned.replace(/Prof(a)?\.\s+Prof(a)?\./gi, '$1. ');
  }
  return cleaned;
}

// Helper de acesso ao LocalStorage com seed padrão
function getStoredItem<T>(key: string, defaultVal: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return defaultVal;
    }
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function setStoredItem<T>(key: string, val: T): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`Erro ao salvar ${key} no localStorage:`, err);
  }
}

// Data de referência baseada na data de execução do sistema (Setembro/2026)
export const CURRENT_DATE_REF = new Date(2026, 8, 3); // 2026-09-03

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatDateTimeBR(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateStr;
  }
}

export function getTodayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getFutureDateStr(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getProximaCompetencia(anoMes: string): { anoMes: string; competencia: string } {
  const [anoStr, mesStr] = anoMes.split('-');
  let ano = parseInt(anoStr, 10);
  let mes = parseInt(mesStr, 10);

  mes += 1;
  if (mes > 12) {
    mes = 1;
    ano += 1;
  }

  const mesesNomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  const novoAnoMes = `${ano}-${String(mes).padStart(2, '0')}`;
  const novaCompetencia = `${mesesNomes[mes - 1]}/${ano}`;
  return { anoMes: novoAnoMes, competencia: novaCompetencia };
}

export function getUltimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

export function getCicloMensalCaixa(
  targetAnoMes?: string,
  dataReferenciaStr?: string
): CicloMensalCaixa {
  const hoje = dataReferenciaStr || getTodayDateStr();
  const mesAtual = hoje.slice(0, 7);
  const anoMes = targetAnoMes || mesAtual;

  const [anoStr, mesStr] = anoMes.split('-');
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);

  const ultimoDia = getUltimoDiaDoMes(ano, mes);
  const dataInicio = `${anoStr}-${mesStr}-01`;
  const dataFim = `${anoStr}-${mesStr}-${String(ultimoDia).padStart(2, '0')}`;

  const mesesNomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  const nomeMes = mesesNomes[mes - 1] || mesStr;

  const isAtual = anoMes === mesAtual;
  const isEncerrado = anoMes < mesAtual;
  const isFuturo = anoMes > mesAtual;

  let diasRestantes: number | undefined;
  let mensagemContagem: string | undefined;

  if (isAtual) {
    const [anoH, mesH, diaH] = hoje.split('-').map(Number);
    if (anoH === ano && mesH === mes) {
      diasRestantes = ultimoDia - diaH;
    } else {
      const hojeDate = new Date(anoH, mesH - 1, diaH);
      const fimDate = new Date(ano, mes - 1, ultimoDia);
      const diffMs = fimDate.getTime() - hojeDate.getTime();
      diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24));
    }

    if (diasRestantes > 1) {
      mensagemContagem = `Fecha em ${diasRestantes} dias`;
    } else if (diasRestantes === 1) {
      mensagemContagem = 'Fecha amanhã';
    } else if (diasRestantes === 0) {
      mensagemContagem = 'Fecha hoje';
    } else {
      mensagemContagem = 'Período encerrado';
    }
  }

  return {
    anoMes,
    ano,
    mes,
    nomeMes,
    isAtual,
    isEncerrado,
    isFuturo,
    dataInicio,
    dataInicioFormatada: formatDateBR(dataInicio),
    dataFim,
    dataFimFormatada: formatDateBR(dataFim),
    fechamentoPrevistoFormatado: formatDateBR(dataFim),
    diasRestantes,
    mensagemContagem,
    dataAtualFormatada: formatDateBR(hoje),
  };
}

export function calcularDataVencimento(anoMes: string, diaVencimento: number): string {
  const [anoStr, mesStr] = anoMes.split('-');
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);
  const maxDias = new Date(ano, mes, 0).getDate();
  const diaFinal = Math.min(Math.max(diaVencimento, 1), maxDias);
  return `${ano}-${String(mes).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`;
}

export function getCompetenciaFromDate(dateStr: string): { anoMes: string; competencia: string } {
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  const ano = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10);
  const mesesNomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return {
    anoMes: `${ano}-${String(mes).padStart(2, '0')}`,
    competencia: `${mesesNomes[mes - 1]}/${ano}`,
  };
}

export function getAnoMesFromCompetencia(competencia: string): string | null {
  if (!competencia || !competencia.includes('/')) return null;
  const [mesNome, anoStr] = competencia.split('/');
  const mesesNomes = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  const mesIndex = mesesNomes.findIndex((m) => m === mesNome.trim().toLowerCase());
  if (mesIndex === -1) return null;
  const mes = mesIndex + 1;
  return `${anoStr.trim()}-${String(mes).padStart(2, '0')}`;
}

const OBSOLETE_MOCK_FINANCIAL_OBSERVATIONS = new Set([
  'Venceu dia 01/09 e ainda não pagou',
  'Vencimento amanhã',
  'Pagou em dinheiro com Prof. Marcos, aguarda Admin',
  'Enviou comprovante PIX no WhatsApp do Prof. Gabriel',
  'Enviou comprovante PIX no WhatsApp do Prof. Kawan',
  'Mensalidade de Setembro já confirmada',
  'Atrasado de Agosto/2026',
]);

class FinanceService {
  // Inicialização
  public resetToDefault(): void {
    localStorage.clear();
    localStorage.removeItem('bomber_grupos_plano');
    setStoredItem(STORAGE_KEYS.PLANOS, INITIAL_PLANOS);
    setStoredItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    setStoredItem(STORAGE_KEYS.ALUNOS, INITIAL_ALUNOS);
    setStoredItem(STORAGE_KEYS.MENSALIDADES, INITIAL_MENSALIDADES);
    setStoredItem(STORAGE_KEYS.PAGAMENTOS_ALUNOS, INITIAL_PAGAMENTOS_ALUNOS);
    setStoredItem(STORAGE_KEYS.DESPESAS, INITIAL_DESPESAS);
    setStoredItem(STORAGE_KEYS.PAGAMENTOS_PROFESSORES, INITIAL_PAGAMENTOS_PROFESSORES);
    setStoredItem(STORAGE_KEYS.ADIANTAMENTOS_PROFESSORES, INITIAL_ADIANTAMENTOS_PROFESSORES);
    setStoredItem(STORAGE_KEYS.MOVIMENTACOES_CAIXA, INITIAL_MOVIMENTACOES_CAIXA);
    setStoredItem(STORAGE_KEYS.AUDITORIA, INITIAL_AUDITORIA);
  }

  // Usuários e Planos
  public getUsers(): User[] {
    const list = getStoredItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    let modified = false;

    const migrated = list.map((user) => {
      if (user.id === 'usr-prof-2') {
        if (user.name !== 'Prof. Kawan Silva' || user.avatar !== 'KS') {
          modified = true;
          return {
            ...user,
            name: 'Prof. Kawan Silva',
            email: 'kawan@bomber.com.br',
            avatar: 'KS',
            chavePix: 'kawan.silva@pix.com.br',
          };
        }
      }
      if (user.id === 'usr-prof-3') {
        if (user.name !== 'Prof. Ryan Medeiros' || user.avatar !== 'RM') {
          modified = true;
          return {
            ...user,
            name: 'Prof. Ryan Medeiros',
            email: 'ryan@bomber.com.br',
            avatar: 'RM',
            chavePix: 'ryan.medeiros@pix.com.br',
          };
        }
      }
      return user;
    });

    if (modified) {
      setStoredItem(STORAGE_KEYS.USERS, migrated);
    }

    return migrated;
  }

  public getPlanos(): Plano[] {
    return getStoredItem<Plano[]>(STORAGE_KEYS.PLANOS, INITIAL_PLANOS);
  }

  public getPlanoById(id: string): Plano | undefined {
    return this.getPlanos().find((p) => p.id === id);
  }

  /**
   * Determina o valor comercial da PRIMEIRA mensalidade do aluno:
   * - INDIVIDUAL: R$ 80,00
   * - DUPLA: R$ 75,00 (1º mês promocional)
   * - TRIO+: R$ 70,00 (1º mês promocional)
   * A partir da segunda competência, todo aluno passa a pagar R$ 80,00.
   */
  public getValorPrimeiraMensalidade(planoId: string): number {
    if (planoId === 'plano-trio') return 70.0;
    if (planoId === 'plano-dupla') return 75.0;
    return 80.0;
  }

  // Alunos
  public getAlunos(search?: string, statusFilter?: 'TODOS' | 'ATIVO' | 'INATIVO'): Aluno[] {
    let list = getStoredItem<Aluno[]>(STORAGE_KEYS.ALUNOS, INITIAL_ALUNOS);

    // Sanitização de dados obsoletos de grupo no LocalStorage
    if (typeof window !== 'undefined' && localStorage.getItem('bomber_grupos_plano')) {
      localStorage.removeItem('bomber_grupos_plano');
    }

    // Sanitização de dados mockados legados e remoção de qualquer resquício de grupoPlanoId
    let needsUpdate = false;
    list = list.map((a: any) => {
      let mod = a;
      if (mod.observacao && OBSOLETE_MOCK_FINANCIAL_OBSERVATIONS.has(mod.observacao.trim())) {
        needsUpdate = true;
        mod = { ...mod };
        delete mod.observacao;
      }
      if ('grupoPlanoId' in mod) {
        needsUpdate = true;
        mod = { ...mod };
        delete mod.grupoPlanoId;
      }
      if (mod.criadoPorId === 'usr-prof-2' && mod.criadoPorNome !== 'Prof. Kawan Silva') {
        needsUpdate = true;
        mod = { ...mod, criadoPorNome: 'Prof. Kawan Silva' };
      }
      if (mod.criadoPorId === 'usr-prof-3' && mod.criadoPorNome !== 'Prof. Ryan Medeiros') {
        needsUpdate = true;
        mod = { ...mod, criadoPorNome: 'Prof. Ryan Medeiros' };
      }
      return mod;
    });

    if (needsUpdate) {
      setStoredItem(STORAGE_KEYS.ALUNOS, list);
    }

    if (statusFilter && statusFilter !== 'TODOS') {
      list = list.filter((a) => a.status === statusFilter);
    }

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
        const matchDigits =
          qDigits.length > 0 &&
          a.telefone.replace(/\D/g, '').includes(qDigits);

        return matchNome || matchTel || matchDigits;
      });
    }

    return list.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  public getAlunoById(id: string): Aluno | undefined {
    return this.getAlunos().find((a) => a.id === id);
  }

  public cadastrarAluno(
    dados: {
      nome: string;
      telefone: string;
      dataEntrada: string;
      diaVencimento: number;
      planoId: string;
      observacao?: string;
    },
    usuarioLogado: User
  ): Aluno {
    const planos = this.getPlanos();
    const plano = planos.find((p) => p.id === dados.planoId) || planos[0];
    const valorPrimeiraMensalidade = this.getValorPrimeiraMensalidade(plano.id);

    const alunos = getStoredItem<Aluno[]>(STORAGE_KEYS.ALUNOS, INITIAL_ALUNOS);

    const dataEntradaStr = dados.dataEntrada || getTodayDateStr();
    const novoAlunoId = `alu-${Date.now().toString().slice(-6)}`;
    const mockNovoAluno: Aluno = {
      id: novoAlunoId,
      nome: dados.nome.trim(),
      telefone: dados.telefone.trim(),
      dataEntrada: dataEntradaStr,
      diaVencimento: Number(dados.diaVencimento),
      planoId: plano.id,
      valorMensalidade: 80.0,
      status: 'ATIVO',
      observacao: dados.observacao?.trim(),
      criadoPorId: usuarioLogado.id,
      criadoPorNome: usuarioLogado.name,
      criadoEm: new Date().toISOString(),
    };

    alunos.unshift(mockNovoAluno);
    setStoredItem(STORAGE_KEYS.ALUNOS, alunos);

    // Cria a primeira mensalidade com a condição comercial de entrada (70, 75 ou 80)
    // Competência calculada a partir da data de início e vencimento calculado pelo diaVencimento
    const { anoMes, competencia } = getCompetenciaFromDate(dataEntradaStr);
    const dataVencimento = calcularDataVencimento(anoMes, mockNovoAluno.diaVencimento);

    const mensalidades = getStoredItem<Mensalidade[]>(
      STORAGE_KEYS.MENSALIDADES,
      INITIAL_MENSALIDADES
    );
    const novaMensalidade: Mensalidade = {
      id: `men-${Date.now().toString().slice(-6)}`,
      alunoId: mockNovoAluno.id,
      alunoNome: mockNovoAluno.nome,
      competencia,
      anoMes,
      valor: valorPrimeiraMensalidade,
      dataVencimento,
      status: 'PENDENTE',
    };
    mensalidades.unshift(novaMensalidade);
    setStoredItem(STORAGE_KEYS.MENSALIDADES, mensalidades);

    // Auditoria
    this.registrarAuditoria(
      'Cadastro de Aluno',
      'ALUNO',
      novoAlunoId,
      `Aluno ${mockNovoAluno.nome} cadastrado com condição de entrada ${plano.nome} e pagamento inicial de ${formatCurrency(valorPrimeiraMensalidade)}. Vencimento todo dia ${mockNovoAluno.diaVencimento}.`,
      usuarioLogado
    );

    return mockNovoAluno;
  }

  public atualizarAluno(
    id: string,
    dados: {
      nome?: string;
      telefone?: string;
      observacao?: string;
      // Campos protegidos - permitidos exclusivamente para ADMIN:
      dataEntrada?: string;
      diaVencimento?: number;
      planoId?: string;
      status?: AlunoStatus;
    },
    usuarioLogado: User
  ): Aluno {
    const alunos = getStoredItem<Aluno[]>(STORAGE_KEYS.ALUNOS, INITIAL_ALUNOS);
    const index = alunos.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error('Aluno não encontrado');
    }

    const alunoAtual = alunos[index];
    const isAdmin = usuarioLogado.role === 'ADMIN';

    const statusAnterior = alunoAtual.status;
    let novoPlanoId = alunoAtual.planoId;
    let novoDiaVencimento = alunoAtual.diaVencimento;
    let novoStatus = alunoAtual.status;
    let novaDataEntrada = alunoAtual.dataEntrada;

    if (isAdmin) {
      if (dados.dataEntrada) {
        novaDataEntrada = dados.dataEntrada;
      }
      if (dados.diaVencimento !== undefined) {
        const diaNum = Number(dados.diaVencimento);
        if (!isNaN(diaNum) && diaNum >= 1 && diaNum <= 31) {
          novoDiaVencimento = diaNum;
        }
      }
      if (dados.status) {
        novoStatus = dados.status;
      }
      if (dados.planoId) {
        novoPlanoId = dados.planoId;
      }
    }

    const alunoAtualizado: Aluno = {
      ...alunoAtual,
      nome: dados.nome !== undefined && dados.nome.trim() !== '' ? dados.nome.trim() : alunoAtual.nome,
      telefone: dados.telefone !== undefined ? dados.telefone.trim() : alunoAtual.telefone,
      observacao: dados.observacao !== undefined ? dados.observacao.trim() : alunoAtual.observacao,
      dataEntrada: novaDataEntrada,
      diaVencimento: novoDiaVencimento,
      planoId: novoPlanoId,
      valorMensalidade: 80.0,
      status: novoStatus,
    };

    alunos[index] = alunoAtualizado;
    setStoredItem(STORAGE_KEYS.ALUNOS, alunos);

    // Se o nome do aluno mudou, sincronizar na mensalidade para manter busca e histórico consistentes
    if (alunoAtualizado.nome !== alunoAtual.nome) {
      const mensalidades = getStoredItem<Mensalidade[]>(
        STORAGE_KEYS.MENSALIDADES,
        INITIAL_MENSALIDADES
      );
      let changed = false;
      mensalidades.forEach((m) => {
        if (m.alunoId === alunoAtualizado.id) {
          m.alunoNome = alunoAtualizado.nome;
          changed = true;
        }
      });
      if (changed) {
        setStoredItem(STORAGE_KEYS.MENSALIDADES, mensalidades);
      }
    }

    // Auditoria detalhada
    if (isAdmin) {
      if (statusAnterior !== novoStatus) {
        this.registrarAuditoria(
          novoStatus === 'INATIVO' ? 'Inativação de Aluno' : 'Reativação de Aluno',
          'ALUNO',
          alunoAtualizado.id,
          `Status do aluno ${alunoAtualizado.nome} alterado de ${statusAnterior} para ${novoStatus}.`,
          usuarioLogado
        );
      }

      this.registrarAuditoria(
        'Edição de Aluno',
        'ALUNO',
        alunoAtualizado.id,
        `Aluno ${alunoAtualizado.nome} atualizado pelo Administrador (plano: ${alunoAtualizado.planoId}, status: ${alunoAtualizado.status}, venc: dia ${alunoAtualizado.diaVencimento}). Mensalidades já geradas mantidas.`,
        usuarioLogado
      );
    } else {
      this.registrarAuditoria(
        'Edição de Aluno',
        'ALUNO',
        alunoAtualizado.id,
        `Dados cadastrais básicos do aluno ${alunoAtualizado.nome} corrigidos pelo professor.`,
        usuarioLogado
      );
    }

    return alunoAtualizado;
  }

  // Mensalidades e Status
  public getMensalidades(): Mensalidade[] {
    let list = getStoredItem<Mensalidade[]>(
      STORAGE_KEYS.MENSALIDADES,
      INITIAL_MENSALIDADES
    );

    // Sanitização suave para que novos alunos no ciclo de entrada não fiquem como ATRASADA
    let needsUpdate = false;
    const alunosComQuitadas = new Set(
      list.filter((m) => m.status === 'QUITADA').map((m) => m.alunoId)
    );

    list = list.map((m) => {
      if (!alunosComQuitadas.has(m.alunoId) && m.status === 'ATRASADA') {
        needsUpdate = true;
        return { ...m, status: 'PENDENTE' as const };
      }
      return m;
    });

    if (needsUpdate) {
      setStoredItem(STORAGE_KEYS.MENSALIDADES, list);
    }

    return list;
  }

  public getMensalidadeById(id: string): Mensalidade | undefined {
    if (!id) return undefined;
    return this.getMensalidades().find((m) => m.id === id);
  }

  /**
   * Resolução robusta do vencimento original do pagamento para conferência do ADMIN:
   * 1. Fonte Primária: localizar a mensalidade associada pela referência existente (pagamento.mensalidadeId).
   * 2. Se o próprio objeto pagamento já contiver dataVencimento gravada.
   * 3. Fallback: buscar mensalidade histórica pelo par (alunoId + competência).
   * 4. Fallback seguro para registros legados: competência + alunoId + diaVencimento do aluno.
   */
  public resolverDataVencimentoPagamento(pagamento: PagamentoAluno | null | undefined): string {
    if (!pagamento) return '';

    // 1. Fonte Primária: localizar a mensalidade associada pela referência existente (pagamento.mensalidadeId)
    if (pagamento.mensalidadeId) {
      const mensalidade = this.getMensalidadeById(pagamento.mensalidadeId);
      if (mensalidade?.dataVencimento) {
        return mensalidade.dataVencimento;
      }
    }

    // 2. Se já existir dataVencimento no próprio objeto pagamento
    if (pagamento.dataVencimento) {
      return pagamento.dataVencimento;
    }

    // 3. Fallback: buscar mensalidade histórica pelo par (alunoId + competência)
    if (pagamento.alunoId && pagamento.competencia) {
      const mensalidades = this.getMensalidades();
      const menPorComp = mensalidades.find(
        (m) =>
          m.alunoId === pagamento.alunoId &&
          m.competencia.toLowerCase() === pagamento.competencia.toLowerCase()
      );
      if (menPorComp?.dataVencimento) {
        return menPorComp.dataVencimento;
      }
    }

    // 4. Fallback seguro para registros legados: competência + alunoId + diaVencimento do aluno
    if (pagamento.alunoId && pagamento.competencia) {
      const aluno = this.getAlunoById(pagamento.alunoId);
      if (aluno && aluno.diaVencimento) {
        const anoMes = getAnoMesFromCompetencia(pagamento.competencia);
        if (anoMes) {
          return calcularDataVencimento(anoMes, aluno.diaVencimento);
        }
      }
    }

    return '';
  }

  /**
   * Identifica se o aluno possui pagamento inicial da matrícula pendente.
   * Regra: Aluno ativo que ainda não possui nenhum pagamento/mensalidade QUITADA,
   * e cuja mensalidade de entrada está PENDENTE (não aguardando confirmação nem quitada).
   */
  public isPagamentoInicialPendente(alunoId: string): boolean {
    const mensalidades = this.getMensalidades().filter((m) => m.alunoId === alunoId);
    if (mensalidades.length === 0) return false;

    // Se o aluno já possui alguma mensalidade quitada, já não é mais o pagamento inicial pendente
    const temQuitada = mensalidades.some((m) => m.status === 'QUITADA');
    if (temQuitada) return false;

    // Se tem pagamento aguardando confirmação do admin, o status é AGUARDANDO_CONFIRMACAO
    const temAguardando = mensalidades.some((m) => m.status === 'AGUARDANDO_CONFIRMACAO');
    if (temAguardando) return false;

    // Se nenhuma quitada e não está aguardando confirmação, a mensalidade em aberto é o pagamento inicial pendente
    const mensalidadeAtual = this.getMensalidadeAtualDoAluno(alunoId);
    return !!mensalidadeAtual && (mensalidadeAtual.status === 'PENDENTE' || mensalidadeAtual.status === 'ATRASADA');
  }

  public getMensalidadeAtualDoAluno(alunoId: string): Mensalidade | undefined {
    const mensalidades = this.getMensalidades().filter((m) => m.alunoId === alunoId);
    // Prioriza a que está em aberto (atrasada, pendente ou aguardando)
    const emAberto = mensalidades.find(
      (m) =>
        m.status === 'ATRASADA' ||
        m.status === 'PENDENTE' ||
        m.status === 'AGUARDANDO_CONFIRMACAO'
    );
    if (emAberto) return emAberto;
    // Se todas quitadas, retorna a mais recente
    return mensalidades[0];
  }

  // Fluxo de Confirmação Direta pelo ADMIN (sem passar por 'AGUARDANDO_CONFIRMACAO')
  public confirmarRecebimentoDiretoAdmin(
    mensalidadeId: string,
    formaPagamento: FormaPagamento,
    adminLogado: User,
    observacao?: string
  ): PagamentoAluno {
    if (adminLogado.role !== 'ADMIN') {
      throw new Error('Apenas o ADMIN pode confirmar recebimentos diretamente.');
    }

    const mensalidades = getStoredItem<Mensalidade[]>(
      STORAGE_KEYS.MENSALIDADES,
      INITIAL_MENSALIDADES
    );
    const menIdx = mensalidades.findIndex((m) => m.id === mensalidadeId);
    if (menIdx === -1) {
      throw new Error('Mensalidade não encontrada.');
    }

    const mensalidade = mensalidades[menIdx];

    // Proteção contra duplicidade: mensalidade já quitada
    if (mensalidade.status === 'QUITADA') {
      throw new Error('Esta mensalidade já foi quitada.');
    }

    const pagamentos = getStoredItem<PagamentoAluno[]>(
      STORAGE_KEYS.PAGAMENTOS_ALUNOS,
      INITIAL_PAGAMENTOS_ALUNOS
    );

    const agoraIso = new Date().toISOString();

    const dataHoje = getTodayDateStr();

    // Se já existia um pagamento aguardando confirmação vinculado a esta mensalidade, reaproveita e confirma
    let pagamento: PagamentoAluno;
    const existingPagIdx = pagamentos.findIndex((p) => p.mensalidadeId === mensalidade.id);

    if (existingPagIdx !== -1) {
      pagamento = pagamentos[existingPagIdx];
      if (pagamento.statusConfirmacao === 'CONFIRMADO') {
        throw new Error('Este pagamento já foi confirmado.');
      }
      pagamento.statusConfirmacao = 'CONFIRMADO';
      pagamento.formaPagamento = formaPagamento;
      if (!pagamento.dataPagamento) {
        pagamento.dataPagamento = pagamento.informadoEm ? pagamento.informadoEm.split('T')[0] : dataHoje;
      }
      pagamento.confirmadoPorId = adminLogado.id;
      pagamento.confirmadoPorNome = adminLogado.name;
      pagamento.confirmadoEm = agoraIso;
      if (observacao) pagamento.observacao = observacao.trim();
      pagamentos[existingPagIdx] = pagamento;
    } else {
      pagamento = {
        id: `pag-${Date.now().toString().slice(-6)}`,
        mensalidadeId: mensalidade.id,
        alunoId: mensalidade.alunoId,
        alunoNome: mensalidade.alunoNome,
        valor: mensalidade.valor,
        formaPagamento,
        competencia: mensalidade.competencia,
        dataPagamento: dataHoje,
        dataVencimento: mensalidade.dataVencimento,
        informadoPorId: adminLogado.id,
        informadoPorNome: adminLogado.name,
        informadoEm: agoraIso,
        statusConfirmacao: 'CONFIRMADO',
        confirmadoPorId: adminLogado.id,
        confirmadoPorNome: adminLogado.name,
        confirmadoEm: agoraIso,
        observacao: observacao?.trim(),
      };
      pagamentos.unshift(pagamento);
    }
    setStoredItem(STORAGE_KEYS.PAGAMENTOS_ALUNOS, pagamentos);

    // 1. Quita a mensalidade
    mensalidade.status = 'QUITADA';
    mensalidade.pagamentoId = pagamento.id;
    mensalidade.ultimoPagamentoData = pagamento.dataPagamento;
    mensalidade.ultimoPagamentoForma = formaPagamento;
    mensalidade.ultimoPagamentoConfirmadoEm = agoraIso;
    mensalidades[menIdx] = mensalidade;

    // 2. Gera o próximo ciclo dinâmico para o aluno (R$ 80,00) com avanço mês a mês
    const aluno = this.getAlunoById(mensalidade.alunoId);
    if (aluno && aluno.status === 'ATIVO') {
      const { anoMes: proximoAnoMes, competencia: proximaCompetencia } =
        getProximaCompetencia(mensalidade.anoMes);
      const novaDataVenc = calcularDataVencimento(proximoAnoMes, aluno.diaVencimento);

      // Proteção contra duplicidade de ciclo
      const existeProximo = mensalidades.some(
        (m) => m.alunoId === aluno.id && m.anoMes === proximoAnoMes
      );

      if (!existeProximo) {
        const proximaMen: Mensalidade = {
          id: `men-${Date.now().toString().slice(-6)}`,
          alunoId: aluno.id,
          alunoNome: aluno.nome,
          competencia: proximaCompetencia,
          anoMes: proximoAnoMes,
          valor: 80.0,
          dataVencimento: novaDataVenc,
          status: 'PENDENTE',
        };
        mensalidades.push(proximaMen);
      }
    }
    setStoredItem(STORAGE_KEYS.MENSALIDADES, mensalidades);

    // 3. Gera ENTRADA no caixa (protegido contra duplicidade por referenciaId)
    const movimentacoes = getStoredItem<MovimentacaoCaixa[]>(
      STORAGE_KEYS.MOVIMENTACOES_CAIXA,
      INITIAL_MOVIMENTACOES_CAIXA
    );
    const movJaExiste = movimentacoes.some((m) => m.referenciaId === pagamento.id);
    if (!movJaExiste) {
      const novaMov: MovimentacaoCaixa = {
        id: `mov-${Date.now().toString().slice(-6)}`,
        tipo: 'ENTRADA',
        origem: 'MENSALIDADE',
        referenciaId: pagamento.id,
        descricao: `Mensalidade ${pagamento.competencia} - ${pagamento.alunoNome} (${formaPagamento})`,
        valor: pagamento.valor,
        dataHora: agoraIso,
        registradoPorNome: adminLogado.name,
      };
      movimentacoes.unshift(novaMov);
      setStoredItem(STORAGE_KEYS.MOVIMENTACOES_CAIXA, movimentacoes);
    }

    // 4. Auditoria
    this.registrarAuditoria(
      'Confirmação de Recebimento Admin',
      'PAGAMENTO_ALUNO',
      pagamento.id,
      `Recebimento de ${formatCurrency(pagamento.valor)} via ${formaPagamento} confirmado por ${adminLogado.name} (ADMIN).`,
      adminLogado
    );

    return pagamento;
  }

  // Fluxo de Pagamento Informado pelo Professor
  public registrarPagamentoAluno(
    mensalidadeId: string,
    formaPagamento: FormaPagamento,
    usuarioLogado: User,
    observacao?: string
  ): PagamentoAluno {
    const mensalidades = this.getMensalidades();
    const idx = mensalidades.findIndex((m) => m.id === mensalidadeId);
    if (idx === -1) {
      throw new Error('Mensalidade não encontrada');
    }

    const mensalidade = mensalidades[idx];
    const pagamentos = getStoredItem<PagamentoAluno[]>(
      STORAGE_KEYS.PAGAMENTOS_ALUNOS,
      INITIAL_PAGAMENTOS_ALUNOS
    );

    const dataHoje = getTodayDateStr();
    const agoraIso = new Date().toISOString();

    const novoPagamento: PagamentoAluno = {
      id: `pag-${Date.now().toString().slice(-6)}`,
      mensalidadeId: mensalidade.id,
      alunoId: mensalidade.alunoId,
      alunoNome: mensalidade.alunoNome,
      valor: mensalidade.valor,
      formaPagamento,
      competencia: mensalidade.competencia,
      dataPagamento: dataHoje,
      dataVencimento: mensalidade.dataVencimento,
      informadoPorId: usuarioLogado.id,
      informadoPorNome: usuarioLogado.name,
      informadoEm: agoraIso,
      statusConfirmacao: 'AGUARDANDO_CONFIRMACAO',
      observacao: observacao?.trim(),
    };

    pagamentos.unshift(novoPagamento);
    setStoredItem(STORAGE_KEYS.PAGAMENTOS_ALUNOS, pagamentos);

    // Atualiza status da mensalidade
    mensalidade.status = 'AGUARDANDO_CONFIRMACAO';
    mensalidade.pagamentoId = novoPagamento.id;
    mensalidade.ultimoPagamentoData = dataHoje;
    mensalidade.ultimoPagamentoForma = formaPagamento;
    mensalidades[idx] = mensalidade;
    setStoredItem(STORAGE_KEYS.MENSALIDADES, mensalidades);

    // Auditoria
    this.registrarAuditoria(
      'Pagamento Informado',
      'PAGAMENTO_ALUNO',
      novoPagamento.id,
      `Pagamento de ${formatCurrency(novoPagamento.valor)} (${formaPagamento}) do aluno ${novoPagamento.alunoNome} (${mensalidade.competencia}) informado por ${usuarioLogado.name}. Aguardando confirmação do ADMIN.`,
      usuarioLogado
    );

    return novoPagamento;
  }

  // Fluxo de Confirmação pelo ADMIN
  public confirmarPagamentoAluno(pagamentoId: string, adminLogado: User): void {
    if (adminLogado.role !== 'ADMIN') {
      throw new Error('Apenas o perfil ADMIN pode confirmar pagamentos.');
    }

    const pagamentos = getStoredItem<PagamentoAluno[]>(
      STORAGE_KEYS.PAGAMENTOS_ALUNOS,
      INITIAL_PAGAMENTOS_ALUNOS
    );
    const pagIdx = pagamentos.findIndex((p) => p.id === pagamentoId);
    if (pagIdx === -1) {
      throw new Error('Registro de pagamento não encontrado.');
    }

    const pag = pagamentos[pagIdx];
    if (pag.statusConfirmacao === 'CONFIRMADO') {
      return;
    }

    const agoraIso = new Date().toISOString();
    pag.statusConfirmacao = 'CONFIRMADO';
    if (!pag.dataPagamento) {
      pag.dataPagamento = pag.informadoEm ? pag.informadoEm.split('T')[0] : getTodayDateStr();
    }
    pag.confirmadoPorId = adminLogado.id;
    pag.confirmadoPorNome = adminLogado.name;
    pag.confirmadoEm = agoraIso;
    pagamentos[pagIdx] = pag;
    setStoredItem(STORAGE_KEYS.PAGAMENTOS_ALUNOS, pagamentos);

    // Atualiza a mensalidade para QUITADA
    const mensalidades = this.getMensalidades();
    const menIdx = mensalidades.findIndex((m) => m.id === pag.mensalidadeId);
    if (menIdx !== -1) {
      mensalidades[menIdx].status = 'QUITADA';
      mensalidades[menIdx].ultimoPagamentoData = pag.dataPagamento;
      mensalidades[menIdx].ultimoPagamentoForma = pag.formaPagamento;
      mensalidades[menIdx].ultimoPagamentoConfirmadoEm = agoraIso;

      // Gera o próximo ciclo automático para o aluno (R$ 80,00) de forma dinâmica mês a mês
      const aluno = this.getAlunoById(pag.alunoId);
      if (aluno && aluno.status === 'ATIVO') {
        const { anoMes: proximoAnoMes, competencia: proximaCompetencia } =
          getProximaCompetencia(mensalidades[menIdx].anoMes);
        const novaDataVenc = calcularDataVencimento(proximoAnoMes, aluno.diaVencimento);

        const existeProximo = mensalidades.some(
          (m) => m.alunoId === aluno.id && m.anoMes === proximoAnoMes
        );
        if (!existeProximo) {
          const proximaMen: Mensalidade = {
            id: `men-${Date.now().toString().slice(-6)}`,
            alunoId: aluno.id,
            alunoNome: aluno.nome,
            competencia: proximaCompetencia,
            anoMes: proximoAnoMes,
            valor: 80.0,
            dataVencimento: novaDataVenc,
            status: 'PENDENTE',
          };
          mensalidades.push(proximaMen);
        }
      }
      setStoredItem(STORAGE_KEYS.MENSALIDADES, mensalidades);
    }

    // Gera ENTRADA no caixa (protegido contra duplicidade)
    const movimentacoes = getStoredItem<MovimentacaoCaixa[]>(
      STORAGE_KEYS.MOVIMENTACOES_CAIXA,
      INITIAL_MOVIMENTACOES_CAIXA
    );
    const movJaExiste = movimentacoes.some((m) => m.referenciaId === pag.id);
    if (!movJaExiste) {
      const novaMov: MovimentacaoCaixa = {
        id: `mov-${Date.now().toString().slice(-6)}`,
        tipo: 'ENTRADA',
        origem: 'MENSALIDADE',
        referenciaId: pag.id,
        descricao: `Mensalidade ${pag.competencia} - ${pag.alunoNome} (${pag.formaPagamento})`,
        valor: pag.valor,
        dataHora: agoraIso,
        registradoPorNome: adminLogado.name,
      };
      movimentacoes.unshift(novaMov);
      setStoredItem(STORAGE_KEYS.MOVIMENTACOES_CAIXA, movimentacoes);
    }

    // Auditoria
    this.registrarAuditoria(
      'Confirmação de Recebimento Admin',
      'PAGAMENTO_ALUNO',
      pag.id,
      `Recebimento de ${formatCurrency(pag.valor)} via ${pag.formaPagamento} confirmado por ${adminLogado.name} (ADMIN).`,
      adminLogado
    );
  }

  // Estorno / Cancelamento pelo ADMIN
  public estornarPagamentoAluno(
    pagamentoId: string,
    motivo: string,
    adminLogado: User
  ): void {
    if (adminLogado.role !== 'ADMIN') {
      throw new Error('Apenas o ADMIN pode estornar pagamentos.');
    }

    const pagamentos = getStoredItem<PagamentoAluno[]>(
      STORAGE_KEYS.PAGAMENTOS_ALUNOS,
      INITIAL_PAGAMENTOS_ALUNOS
    );
    const pagIdx = pagamentos.findIndex((p) => p.id === pagamentoId);
    if (pagIdx === -1) {
      throw new Error('Pagamento não encontrado.');
    }

    const pag = pagamentos[pagIdx];
    const eraConfirmado = pag.statusConfirmacao === 'CONFIRMADO';

    pag.statusConfirmacao = 'ESTORNADO';
    pag.motivoEstorno = motivo;
    pagamentos[pagIdx] = pag;
    setStoredItem(STORAGE_KEYS.PAGAMENTOS_ALUNOS, pagamentos);

    // Reverte mensalidade para Pendente ou Atrasada
    const mensalidades = this.getMensalidades();
    const menIdx = mensalidades.findIndex((m) => m.id === pag.mensalidadeId);
    if (menIdx !== -1) {
      mensalidades[menIdx].status = 'PENDENTE';
      mensalidades[menIdx].pagamentoId = undefined;
      setStoredItem(STORAGE_KEYS.MENSALIDADES, mensalidades);
    }

    // Se já tinha gerado entrada no caixa, gera estorno
    if (eraConfirmado) {
      const movimentacoes = getStoredItem<MovimentacaoCaixa[]>(
        STORAGE_KEYS.MOVIMENTACOES_CAIXA,
        INITIAL_MOVIMENTACOES_CAIXA
      );
      const estornoMov: MovimentacaoCaixa = {
        id: `mov-${Date.now().toString().slice(-6)}`,
        tipo: 'SAIDA',
        origem: 'ESTORNO',
        referenciaId: pag.id,
        descricao: `ESTORNO: Pagamento ${pag.alunoNome} (${pag.competencia}). Motivo: ${motivo}`,
        valor: pag.valor,
        dataHora: new Date().toISOString(),
        registradoPorNome: adminLogado.name,
      };
      movimentacoes.unshift(estornoMov);
      setStoredItem(STORAGE_KEYS.MOVIMENTACOES_CAIXA, movimentacoes);
    }

    // Auditoria
    this.registrarAuditoria(
      'Estorno de Pagamento',
      'PAGAMENTO_ALUNO',
      pag.id,
      `ADMIN estornou pagamento de ${pag.alunoNome} (${formatCurrency(pag.valor)}). Motivo: ${motivo}`,
      adminLogado
    );
  }

  // Lista de pagamentos aguardando confirmação
  public getPagamentosAguardandoConfirmacao(): PagamentoAluno[] {
    const pagamentos = getStoredItem<PagamentoAluno[]>(
      STORAGE_KEYS.PAGAMENTOS_ALUNOS,
      INITIAL_PAGAMENTOS_ALUNOS
    );
    return pagamentos.filter((p) => p.statusConfirmacao === 'AGUARDANDO_CONFIRMACAO');
  }

  public getTodosPagamentosAlunos(): PagamentoAluno[] {
    let list = getStoredItem<PagamentoAluno[]>(
      STORAGE_KEYS.PAGAMENTOS_ALUNOS,
      INITIAL_PAGAMENTOS_ALUNOS
    );
    let needsUpdate = false;
    list = list.map((p) => {
      let item = p;
      if (!item.dataPagamento) {
        needsUpdate = true;
        const fallback = item.informadoEm
          ? item.informadoEm.split('T')[0]
          : item.confirmadoEm
          ? item.confirmadoEm.split('T')[0]
          : '2026-09-05';
        item = { ...item, dataPagamento: fallback };
      }
      if (item.informadoPorId === 'usr-prof-2' && item.informadoPorNome !== 'Prof. Kawan Silva') {
        needsUpdate = true;
        item = { ...item, informadoPorNome: 'Prof. Kawan Silva' };
      }
      if (item.informadoPorId === 'usr-prof-3' && item.informadoPorNome !== 'Prof. Ryan Medeiros') {
        needsUpdate = true;
        item = { ...item, informadoPorNome: 'Prof. Ryan Medeiros' };
      }
      return item;
    });
    if (needsUpdate) {
      setStoredItem(STORAGE_KEYS.PAGAMENTOS_ALUNOS, list);
    }
    return list;
  }

  // Consulta do último pagamento realizado ou informado para o aluno
  public getUltimoPagamentoDoAluno(alunoId: string): {
    pagamentoId: string;
    competencia: string;
    valor: number;
    dataVencimento: string;
    dataPagamento: string;
    formaPagamento: FormaPagamento;
    status: 'CONFIRMADO' | 'AGUARDANDO_CONFIRMACAO';
    informadoPorNome: string;
    confirmadoPorNome?: string;
    confirmadoEm?: string;
    observacao?: string;
    isPagamentoInicial?: boolean;
    isAntecipado?: boolean;
    dataEntrada?: string;
    proximoVencimento?: string;
  } | null {
    const aluno = this.getAlunoById(alunoId);
    const mensalidadesAluno = this.getMensalidades()
      .filter((m) => m.alunoId === alunoId)
      .sort((a, b) => a.anoMes.localeCompare(b.anoMes));

    const anoMesEntrada = aluno?.dataEntrada ? aluno.dataEntrada.slice(0, 7) : '';
    const compEntrada = aluno?.dataEntrada ? getCompetenciaFromDate(aluno.dataEntrada).competencia : '';
    const primeiraMensalidade = mensalidadesAluno[0];

    const pagamentos = this.getTodosPagamentosAlunos().filter(
      (p) => p.alunoId === alunoId && p.statusConfirmacao !== 'ESTORNADO'
    );

    if (pagamentos.length === 0) {
      // Se não tem no array de pagamentos mas tem mensalidade quitada
      const mensalidadesQuitadas = mensalidadesAluno.filter((m) => m.status === 'QUITADA');
      if (mensalidadesQuitadas.length === 0) return null;
      const m = mensalidadesQuitadas[mensalidadesQuitadas.length - 1];

      const isInicial =
        (!!anoMesEntrada && (m.anoMes === anoMesEntrada || m.competencia.toLowerCase() === compEntrada.toLowerCase())) ||
        (!!primeiraMensalidade && m.id === primeiraMensalidade.id);

      const proximaMen = mensalidadesAluno.find(
        (menItem) => (menItem.status === 'PENDENTE' || menItem.status === 'AGUARDANDO_CONFIRMACAO') && menItem.id !== m.id
      );
      let proxVenc = proximaMen?.dataVencimento;
      if (!proxVenc && aluno) {
        const { anoMes: proximoAnoMes } = getProximaCompetencia(m.anoMes);
        proxVenc = calcularDataVencimento(proximoAnoMes, aluno.diaVencimento);
      }

      const dataVenc = m.dataVencimento;
      const dataPag = m.ultimoPagamentoData ? m.ultimoPagamentoData.split('T')[0] : m.dataVencimento;
      const isAntecipado = !isInicial && !!dataVenc && !!dataPag && dataPag < dataVenc;

      return {
        pagamentoId: m.pagamentoId || 'pag-inicial',
        competencia: m.competencia,
        valor: m.valor,
        dataVencimento: dataVenc,
        dataPagamento: dataPag,
        formaPagamento: m.ultimoPagamentoForma || 'PIX',
        status: 'CONFIRMADO',
        informadoPorNome: 'Administração',
        confirmadoPorNome: 'Carlos Ferreira',
        isPagamentoInicial: isInicial,
        isAntecipado,
        dataEntrada: aluno?.dataEntrada,
        proximoVencimento: proxVenc,
      };
    }

    // Ordena pelo informadoEm decrescente
    pagamentos.sort((a, b) => (b.informadoEm || '').localeCompare(a.informadoEm || ''));
    const pag = pagamentos[0];
    const men = mensalidadesAluno.find((m) => m.id === pag.mensalidadeId);

    const isInicial =
      (!!anoMesEntrada && ((men && men.anoMes === anoMesEntrada) || pag.competencia.toLowerCase() === compEntrada.toLowerCase())) ||
      (!!primeiraMensalidade && ((men && men.id === primeiraMensalidade.id) || pag.competencia.toLowerCase() === primeiraMensalidade.competencia.toLowerCase()));

    const proximaMen = mensalidadesAluno.find(
      (menItem) => (menItem.status === 'PENDENTE' || menItem.status === 'AGUARDANDO_CONFIRMACAO') && menItem.id !== men?.id
    );
    let proxVenc = proximaMen?.dataVencimento;
    if (!proxVenc && aluno) {
      const anoMesRef = men?.anoMes || (anoMesEntrada || '2026-09');
      const { anoMes: proximoAnoMes } = getProximaCompetencia(anoMesRef);
      proxVenc = calcularDataVencimento(proximoAnoMes, aluno.diaVencimento);
    }

    const dataVenc = men ? men.dataVencimento : (pag.dataPagamento || pag.informadoEm.split('T')[0]);
    const dataPag = pag.dataPagamento || (pag.informadoEm ? pag.informadoEm.split('T')[0] : getTodayDateStr());
    const isAntecipado = !isInicial && !!dataVenc && !!dataPag && dataPag < dataVenc;

    return {
      pagamentoId: pag.id,
      competencia: pag.competencia,
      valor: pag.valor,
      dataVencimento: dataVenc,
      dataPagamento: dataPag,
      formaPagamento: pag.formaPagamento,
      status: pag.statusConfirmacao === 'CONFIRMADO' ? 'CONFIRMADO' : 'AGUARDANDO_CONFIRMACAO',
      informadoPorNome: pag.informadoPorNome,
      confirmadoPorNome: pag.confirmadoPorNome,
      confirmadoEm: pag.confirmadoEm,
      observacao: pag.observacao,
      isPagamentoInicial: isInicial,
      isAntecipado,
      dataEntrada: aluno?.dataEntrada,
      proximoVencimento: proxVenc,
    };
  }

  // Despesas (Exclusivo ADMIN)
  public getDespesas(categoria?: string): Despesa[] {
    let list = getStoredItem<Despesa[]>(STORAGE_KEYS.DESPESAS, INITIAL_DESPESAS);
    if (categoria && categoria !== 'TODAS') {
      list = list.filter((d) => d.categoria === categoria);
    }
    return list.sort((a, b) => b.data.localeCompare(a.data));
  }

  public cadastrarDespesa(
    dados: {
      descricao: string;
      categoria: CategoriaDespesa;
      valor: number;
      data: string;
      formaPagamento: string;
      status: 'PAGA' | 'PENDENTE';
    },
    adminLogado: User
  ): Despesa {
    if (adminLogado.role !== 'ADMIN') {
      throw new Error('Apenas o ADMIN pode cadastrar despesas.');
    }

    const despesas = getStoredItem<Despesa[]>(
      STORAGE_KEYS.DESPESAS,
      INITIAL_DESPESAS
    );
    const novaDespesa: Despesa = {
      id: `desp-${Date.now().toString().slice(-6)}`,
      descricao: dados.descricao.trim(),
      categoria: dados.categoria,
      valor: Number(dados.valor),
      data: dados.data,
      formaPagamento: dados.formaPagamento,
      status: dados.status,
      criadoPorId: adminLogado.id,
      criadoPorNome: adminLogado.name,
      criadoEm: new Date().toISOString(),
    };

    despesas.unshift(novaDespesa);
    setStoredItem(STORAGE_KEYS.DESPESAS, despesas);

    // Se estiver PAGA, registra dados de pagamento e gera SAÍDA no caixa imediatamente
    if (novaDespesa.status === 'PAGA') {
      novaDespesa.dataPagamento = dados.data;
      novaDespesa.pagoPorId = adminLogado.id;
      novaDespesa.pagoPorNome = adminLogado.name;
      novaDespesa.pagoEm = new Date().toISOString();

      const movimentacoes = getStoredItem<MovimentacaoCaixa[]>(
        STORAGE_KEYS.MOVIMENTACOES_CAIXA,
        INITIAL_MOVIMENTACOES_CAIXA
      );

      // Proteção de duplicidade: não gerar segunda movimentação se já existir
      const jaExiste = movimentacoes.some(
        (m) => m.referenciaId === novaDespesa.id && m.origem === 'DESPESA'
      );

      if (!jaExiste) {
        const novaMov: MovimentacaoCaixa = {
          id: `mov-${Date.now().toString().slice(-6)}`,
          tipo: 'SAIDA',
          origem: 'DESPESA',
          referenciaId: novaDespesa.id,
          descricao: `${novaDespesa.categoria}: ${novaDespesa.descricao}`,
          valor: novaDespesa.valor,
          dataHora: `${novaDespesa.data}T12:00:00Z`,
          registradoPorNome: adminLogado.name,
        };
        movimentacoes.unshift(novaMov);
        setStoredItem(STORAGE_KEYS.MOVIMENTACOES_CAIXA, movimentacoes);
      }
    }

    // Auditoria
    this.registrarAuditoria(
      'Cadastro de Despesa',
      'DESPESA',
      novaDespesa.id,
      `ADMIN cadastrou despesa: ${novaDespesa.descricao} (${novaDespesa.categoria}) no valor de ${formatCurrency(novaDespesa.valor)} [${novaDespesa.status}]`,
      adminLogado
    );

    return novaDespesa;
  }

  /**
   * Ciclo de Vida da Despesa: PENDENTE -> PAGA
   * A mesma despesa muda de estado, preservando seu ID e data original.
   * Gera exatamente UMA saída no Caixa com dataHora baseada na data real do pagamento.
   * Possui proteção idempotente contra duplicidade.
   */
  public registrarPagamentoDespesa(
    params: {
      despesaId: string;
      dataPagamento: string;
      formaPagamento: string;
      observacao?: string;
    },
    adminLogado: User
  ): Despesa {
    if (adminLogado.role !== 'ADMIN') {
      throw new Error('Apenas o ADMIN pode registrar o pagamento de despesas.');
    }

    if (!params.despesaId) {
      throw new Error('ID da despesa é obrigatório.');
    }

    if (!params.dataPagamento) {
      throw new Error('Informe a data do pagamento.');
    }

    if (!params.formaPagamento) {
      throw new Error('Informe a forma de pagamento.');
    }

    const despesas = getStoredItem<Despesa[]>(
      STORAGE_KEYS.DESPESAS,
      INITIAL_DESPESAS
    );

    const idx = despesas.findIndex((d) => d.id === params.despesaId);
    if (idx === -1) {
      throw new Error('Despesa não encontrada.');
    }

    const desp = despesas[idx];

    // Proteção contra duplicidade: despesa já paga
    if (desp.status === 'PAGA') {
      throw new Error('Esta despesa já foi paga.');
    }

    // A mesma despesa muda de estado: preserva ID e dataDespesa original
    const agoraIso = new Date().toISOString();
    desp.status = 'PAGA';
    desp.dataPagamento = params.dataPagamento;
    desp.formaPagamento = params.formaPagamento;
    desp.pagoPorId = adminLogado.id;
    desp.pagoPorNome = adminLogado.name;
    desp.pagoEm = agoraIso;
    if (params.observacao && params.observacao.trim()) {
      desp.observacao = params.observacao.trim();
    }

    despesas[idx] = desp;
    setStoredItem(STORAGE_KEYS.DESPESAS, despesas);

    // Gerar exatamente UMA saída no Caixa (com verificação rigorosa de idempotência)
    const movimentacoes = getStoredItem<MovimentacaoCaixa[]>(
      STORAGE_KEYS.MOVIMENTACOES_CAIXA,
      INITIAL_MOVIMENTACOES_CAIXA
    );

    const jaExiste = movimentacoes.some(
      (m) => m.referenciaId === desp.id && m.origem === 'DESPESA'
    );

    if (!jaExiste) {
      const novaMov: MovimentacaoCaixa = {
        id: `mov-${Date.now().toString().slice(-6)}`,
        tipo: 'SAIDA',
        origem: 'DESPESA',
        referenciaId: desp.id,
        descricao: `${desp.categoria}: ${desp.descricao}`,
        valor: desp.valor,
        dataHora: `${params.dataPagamento}T12:00:00Z`,
        registradoPorNome: adminLogado.name,
      };
      movimentacoes.unshift(novaMov);
      setStoredItem(STORAGE_KEYS.MOVIMENTACOES_CAIXA, movimentacoes);
    }

    // Auditoria
    this.registrarAuditoria(
      'Pagamento de Despesa',
      'DESPESA',
      desp.id,
      `Pagamento da despesa '${desp.descricao}' (${desp.categoria}) no valor de ${formatCurrency(desp.valor)} registrado por ${adminLogado.name}. Data do pagamento: ${formatDateBR(params.dataPagamento)} (${params.formaPagamento}).${params.observacao ? ` Obs: ${params.observacao}` : ''}`,
      adminLogado
    );

    return desp;
  }

  // Pagamento dos Professores
  public getPagamentosProfessores(professorIdSolicitante?: string): PagamentoProfessor[] {
    let list = getStoredItem<PagamentoProfessor[]>(
      STORAGE_KEYS.PAGAMENTOS_PROFESSORES,
      INITIAL_PAGAMENTOS_PROFESSORES
    );

    let modified = false;
    list = list.map((p) => {
      if (p.professorId === 'usr-prof-2' && p.professorNome !== 'Prof. Kawan Silva') {
        modified = true;
        return {
          ...p,
          professorNome: 'Prof. Kawan Silva',
        };
      }
      if (p.professorId === 'usr-prof-3' && p.professorNome !== 'Prof. Ryan Medeiros') {
        modified = true;
        return {
          ...p,
          professorNome: 'Prof. Ryan Medeiros',
        };
      }
      return p;
    });

    if (modified) {
      setStoredItem(STORAGE_KEYS.PAGAMENTOS_PROFESSORES, list);
    }

    // Se um ID de professor foi passado, filtra ESTRITAMENTE para ele
    if (professorIdSolicitante) {
      return list.filter((p) => p.professorId === professorIdSolicitante);
    }
    return list;
  }

  public cadastrarPagamentoProfessor(
    dados: {
      professorId: string;
      competencia: string;
      valor: number;
      dataPagamento: string;
      formaPagamento: string;
    },
    adminLogado: User
  ): PagamentoProfessor {
    if (adminLogado.role !== 'ADMIN') {
      throw new Error('Apenas o ADMIN pode registrar pagamentos de professores.');
    }

    const professores = this.getUsers().filter((u) => u.role === 'PROFESSOR');
    const prof = professores.find((p) => p.id === dados.professorId);
    if (!prof) {
      throw new Error('Professor não encontrado.');
    }

    const lista = getStoredItem<PagamentoProfessor[]>(
      STORAGE_KEYS.PAGAMENTOS_PROFESSORES,
      INITIAL_PAGAMENTOS_PROFESSORES
    );

    const novo: PagamentoProfessor = {
      id: `pag-prof-${Date.now().toString().slice(-6)}`,
      professorId: prof.id,
      professorNome: prof.name,
      competencia: dados.competencia,
      valor: Number(dados.valor),
      dataPagamento: dados.dataPagamento,
      formaPagamento: dados.formaPagamento,
      status: 'AGUARDANDO_RECEBIMENTO',
      registradoPorId: adminLogado.id,
      registradoPorNome: adminLogado.name,
      registradoEm: new Date().toISOString(),
    };

    lista.unshift(novo);
    setStoredItem(STORAGE_KEYS.PAGAMENTOS_PROFESSORES, lista);

    // REGRA DE NEGÓCIO: "A saída do caixa ocorre quando o ADMIN registra/marca o pagamento como pago, e NÃO somente quando o professor confirma o recebimento"
    const movimentacoes = getStoredItem<MovimentacaoCaixa[]>(
      STORAGE_KEYS.MOVIMENTACOES_CAIXA,
      INITIAL_MOVIMENTACOES_CAIXA
    );
    const saidaCaixa: MovimentacaoCaixa = {
      id: `mov-${Date.now().toString().slice(-6)}`,
      tipo: 'SAIDA',
      origem: 'PAGAMENTO_PROFESSOR',
      referenciaId: novo.id,
      descricao: `Repasse ${novo.professorNome} - Competência ${novo.competencia} (${novo.formaPagamento})`,
      valor: novo.valor,
      dataHora: `${novo.dataPagamento}T12:00:00Z`,
      registradoPorNome: adminLogado.name,
    };
    movimentacoes.unshift(saidaCaixa);
    setStoredItem(STORAGE_KEYS.MOVIMENTACOES_CAIXA, movimentacoes);

    // Auditoria
    this.registrarAuditoria(
      'Registro de Pagamento de Professor',
      'PAGAMENTO_PROFESSOR',
      novo.id,
      `ADMIN registrou repasse de ${formatCurrency(novo.valor)} para ${novo.professorNome} (${novo.competencia}). Saída gerada no caixa.`,
      adminLogado
    );

    return novo;
  }

  public confirmarRecebimentoProfessor(
    pagamentoProfessorId: string,
    professorLogado: User
  ): void {
    const lista = getStoredItem<PagamentoProfessor[]>(
      STORAGE_KEYS.PAGAMENTOS_PROFESSORES,
      INITIAL_PAGAMENTOS_PROFESSORES
    );
    const idx = lista.findIndex((p) => p.id === pagamentoProfessorId);
    if (idx === -1) {
      throw new Error('Registro de pagamento não encontrado.');
    }

    const reg = lista[idx];
    if (reg.professorId !== professorLogado.id && professorLogado.role !== 'ADMIN') {
      throw new Error('Você só pode confirmar pagamentos destinados a você.');
    }

    reg.status = 'RECEBIMENTO_CONFIRMADO';
    reg.confirmadoEm = new Date().toISOString();
    lista[idx] = reg;
    setStoredItem(STORAGE_KEYS.PAGAMENTOS_PROFESSORES, lista);

    // Auditoria (Recibo digital)
    this.registrarAuditoria(
      'Recibo Digital do Professor',
      'PAGAMENTO_PROFESSOR',
      reg.id,
      `${professorLogado.name} confirmou o recebimento de ${formatCurrency(reg.valor)} (${reg.formaPagamento}) ref. a ${reg.competencia}. Recibo digital gerado.`,
      professorLogado
    );
  }

  // ==========================================
  // ADIANTAMENTOS A PROFESSORES (ENTIDADE SEPARADA)
  // ==========================================

  public getAdiantamentosProfessores(professorId?: string): AdiantamentoProfessor[] {
    let list = getStoredItem<AdiantamentoProfessor[]>(
      STORAGE_KEYS.ADIANTAMENTOS_PROFESSORES,
      INITIAL_ADIANTAMENTOS_PROFESSORES
    );

    let modified = false;
    list = list.map((a) => {
      if (a.professorId === 'usr-prof-2' && a.professorNome !== 'Prof. Kawan Silva') {
        modified = true;
        return { ...a, professorNome: 'Prof. Kawan Silva' };
      }
      if (a.professorId === 'usr-prof-3' && a.professorNome !== 'Prof. Ryan Medeiros') {
        modified = true;
        return { ...a, professorNome: 'Prof. Ryan Medeiros' };
      }
      if (a.professorNome && a.professorNome.startsWith('Prof. Prof.')) {
        modified = true;
        return { ...a, professorNome: formatProfessorNome(a.professorNome) };
      }
      return a;
    });

    if (modified) {
      setStoredItem(STORAGE_KEYS.ADIANTAMENTOS_PROFESSORES, list);
    }

    let filtered = list;
    if (professorId) {
      filtered = list.filter((a) => a.professorId === professorId);
    }

    // Ordenação: 1. SOLICITADO, 2. PAGO_AGUARDANDO_CONFIRMACAO, 3. CONFIRMADO, 4. RECUSADO. Mais recentes primeiro.
    const pesosStatus: Record<StatusAdiantamento, number> = {
      SOLICITADO: 1,
      PAGO_AGUARDANDO_CONFIRMACAO: 2,
      CONFIRMADO: 3,
      RECUSADO: 4,
    };

    return filtered.sort((a, b) => {
      const pesoA = pesosStatus[a.status] || 99;
      const pesoB = pesosStatus[b.status] || 99;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return b.dataSolicitacao.localeCompare(a.dataSolicitacao);
    });
  }

  public getAdiantamentoById(id: string): AdiantamentoProfessor | undefined {
    return this.getAdiantamentosProfessores().find((a) => a.id === id);
  }

  public solicitarAdiantamento(
    valor: number,
    motivo: string | undefined,
    professorLogado: User
  ): AdiantamentoProfessor {
    if (!valor || valor <= 0) {
      throw new Error('Informe um valor válido para o adiantamento (maior que zero).');
    }
    if (!professorLogado || !professorLogado.id) {
      throw new Error('Usuário não autenticado.');
    }

    const novo: AdiantamentoProfessor = {
      id: `adiant-${Date.now().toString().slice(-8)}`,
      professorId: professorLogado.id,
      professorNome: formatProfessorNome(professorLogado.name),
      valor,
      dataSolicitacao: new Date().toISOString(),
      motivo: motivo?.trim() || undefined,
      status: 'SOLICITADO',
    };

    const lista = getStoredItem<AdiantamentoProfessor[]>(
      STORAGE_KEYS.ADIANTAMENTOS_PROFESSORES,
      []
    );
    lista.unshift(novo);
    setStoredItem(STORAGE_KEYS.ADIANTAMENTOS_PROFESSORES, lista);

    // Auditoria (SOLICITAÇÃO: Professor solicitou adiantamento)
    // Preservar: usuário, data/hora, entidade, referência, detalhes.
    // ZERO impacto no Caixa nessa etapa.
    this.registrarAuditoria(
      'Solicitação de Adiantamento',
      'ADIANTAMENTO_PROFESSOR',
      novo.id,
      `${formatProfessorNome(professorLogado.name)} solicitou adiantamento de ${formatCurrency(novo.valor)}${
        novo.motivo ? `. Motivo: "${novo.motivo}"` : ''
      }. Aguardando análise da administração.`,
      professorLogado
    );

    return novo;
  }

  public recusarAdiantamento(
    id: string,
    motivoRecusa: string | undefined,
    adminLogado: User
  ): AdiantamentoProfessor {
    if (adminLogado.role !== 'ADMIN') {
      throw new Error('Apenas administradores podem analisar solicitações de adiantamento.');
    }

    const lista = getStoredItem<AdiantamentoProfessor[]>(
      STORAGE_KEYS.ADIANTAMENTOS_PROFESSORES,
      []
    );
    const idx = lista.findIndex((a) => a.id === id);
    if (idx === -1) {
      throw new Error('Solicitação de adiantamento não encontrada.');
    }

    const adiant = lista[idx];
    if (adiant.status !== 'SOLICITADO') {
      throw new Error(`Esta solicitação já foi processada anteriormente (${adiant.status}).`);
    }

    adiant.status = 'RECUSADO';
    adiant.analisadoPorId = adminLogado.id;
    adiant.analisadoPorNome = adminLogado.name;
    adiant.analisadoEm = new Date().toISOString();
    adiant.motivoRecusa = motivoRecusa?.trim() || undefined;

    lista[idx] = adiant;
    setStoredItem(STORAGE_KEYS.ADIANTAMENTOS_PROFESSORES, lista);

    // Auditoria (RECUSA: Admin recusou solicitação)
    // ZERO impacto no Caixa
    this.registrarAuditoria(
      'Recusa de Adiantamento',
      'ADIANTAMENTO_PROFESSOR',
      adiant.id,
      `ADMIN ${adminLogado.name} recusou a solicitação de adiantamento de ${formatCurrency(
        adiant.valor
      )} de ${adiant.professorNome}${
        adiant.motivoRecusa ? `. Motivo informado: "${adiant.motivoRecusa}"` : ''
      }.`,
      adminLogado
    );

    return adiant;
  }

  public registrarPagamentoAdiantamento(
    id: string,
    dados: {
      dataPagamento: string;
      formaPagamento: string;
      observacaoPagamento?: string;
    },
    adminLogado: User
  ): AdiantamentoProfessor {
    if (adminLogado.role !== 'ADMIN') {
      throw new Error('Apenas administradores podem registrar pagamento de adiantamento.');
    }

    const lista = getStoredItem<AdiantamentoProfessor[]>(
      STORAGE_KEYS.ADIANTAMENTOS_PROFESSORES,
      []
    );
    const idx = lista.findIndex((a) => a.id === id);
    if (idx === -1) {
      throw new Error('Solicitação de adiantamento não encontrada.');
    }

    const adiant = lista[idx];
    if (adiant.status !== 'SOLICITADO') {
      throw new Error(`Esta solicitação não está mais pendente de análise (${adiant.status}).`);
    }

    // IDEMPOTÊNCIA: verificar se já existe saída no caixa para esta referência
    const movimentacoesExistentes = this.getMovimentacoesCaixa();
    const jaExisteMov = movimentacoesExistentes.some(
      (m) => m.origem === 'ADIANTAMENTO_PROFESSOR' && m.referenciaId === adiant.id
    );
    if (jaExisteMov) {
      throw new Error('Pagamento deste adiantamento já foi lançado anteriormente no Caixa.');
    }

    const agoraIso = new Date().toISOString();

    adiant.status = 'PAGO_AGUARDANDO_CONFIRMACAO';
    adiant.analisadoPorId = adminLogado.id;
    adiant.analisadoPorNome = adminLogado.name;
    adiant.analisadoEm = agoraIso;
    adiant.dataPagamento = dados.dataPagamento;
    adiant.formaPagamento = dados.formaPagamento;
    adiant.registradoPorId = adminLogado.id;
    adiant.registradoPorNome = adminLogado.name;
    adiant.pagoEm = agoraIso;
    adiant.observacaoPagamento = dados.observacaoPagamento?.trim() || undefined;

    lista[idx] = adiant;
    setStoredItem(STORAGE_KEYS.ADIANTAMENTOS_PROFESSORES, lista);

    // IMPACTO NO CAIXA: Criar EXATAMENTE UMA movimentação de SAIDA
    const movimentacoes = getStoredItem<MovimentacaoCaixa[]>(
      STORAGE_KEYS.MOVIMENTACOES_CAIXA,
      INITIAL_MOVIMENTACOES_CAIXA
    );
    const saidaCaixa: MovimentacaoCaixa = {
      id: `mov-${Date.now().toString().slice(-6)}`,
      tipo: 'SAIDA',
      origem: 'ADIANTAMENTO_PROFESSOR',
      referenciaId: adiant.id,
      descricao: `Adiantamento ${formatProfessorNome(adiant.professorNome)}`,
      valor: adiant.valor,
      dataHora: `${dados.dataPagamento}T12:00:00Z`,
      registradoPorNome: adminLogado.name,
    };
    movimentacoes.unshift(saidaCaixa);
    setStoredItem(STORAGE_KEYS.MOVIMENTACOES_CAIXA, movimentacoes);

    // Auditoria (PAGAMENTO: Admin registrou pagamento do adiantamento)
    this.registrarAuditoria(
      'Registro de Pagamento de Adiantamento',
      'ADIANTAMENTO_PROFESSOR',
      adiant.id,
      `ADMIN ${adminLogado.name} registrou pagamento de adiantamento de ${formatCurrency(
        adiant.valor
      )} para ${formatProfessorNome(adiant.professorNome)} via ${dados.formaPagamento}. Saída gerada no Caixa.`,
      adminLogado
    );

    return adiant;
  }

  public confirmarRecebimentoAdiantamento(
    id: string,
    professorLogado: User
  ): AdiantamentoProfessor {
    const lista = getStoredItem<AdiantamentoProfessor[]>(
      STORAGE_KEYS.ADIANTAMENTOS_PROFESSORES,
      []
    );
    const idx = lista.findIndex((a) => a.id === id);
    if (idx === -1) {
      throw new Error('Registro de adiantamento não encontrado.');
    }

    const adiant = lista[idx];
    if (adiant.professorId !== professorLogado.id && professorLogado.role !== 'ADMIN') {
      throw new Error('Você só pode confirmar adiantamentos solicitados por você.');
    }

    if (adiant.status !== 'PAGO_AGUARDANDO_CONFIRMACAO') {
      throw new Error('Este adiantamento não está aguardando confirmação.');
    }

    const agoraIso = new Date().toISOString();
    adiant.status = 'CONFIRMADO';
    adiant.confirmadoRecebimentoEm = agoraIso;

    lista[idx] = adiant;
    setStoredItem(STORAGE_KEYS.ADIANTAMENTOS_PROFESSORES, lista);

    // IMPORTANTE: NÃO gerar movimentação financeira nessa etapa. É apenas recibo digital.

    // Auditoria (CONFIRMAÇÃO: Professor confirmou recebimento)
    this.registrarAuditoria(
      'Recibo Digital de Adiantamento',
      'ADIANTAMENTO_PROFESSOR',
      adiant.id,
      `${formatProfessorNome(professorLogado.name)} confirmou o recebimento de adiantamento de ${formatCurrency(
        adiant.valor
      )} (${adiant.formaPagamento || 'PIX'}). Recibo digital emitido.`,
      professorLogado
    );

    return adiant;
  }

  public getAdiantamentosSolicitadosCount(): number {
    return this.getAdiantamentosProfessores().filter((a) => a.status === 'SOLICITADO').length;
  }

  public getMeusAdiantamentosPendentesConfirmacaoCount(professorId: string): number {
    return this.getAdiantamentosProfessores(professorId).filter(
      (a) => a.status === 'PAGO_AGUARDANDO_CONFIRMACAO'
    ).length;
  }

  // Caixa e Auditoria (ADMIN)
  public getMovimentacoesCaixa(tipo?: 'TODAS' | 'ENTRADA' | 'SAIDA'): MovimentacaoCaixa[] {
    let list = getStoredItem<MovimentacaoCaixa[]>(
      STORAGE_KEYS.MOVIMENTACOES_CAIXA,
      INITIAL_MOVIMENTACOES_CAIXA
    );

    // Sanitização e reclassificação semântica do Saldo Inicial pré-existente e atualização de nomes renomeados
    let updated = false;
    list = list.map((m) => {
      if ((m.id === 'mov-00' || m.referenciaId === 'saldo-abertura') && m.origem !== 'SALDO_INICIAL') {
        updated = true;
        return {
          ...m,
          origem: 'SALDO_INICIAL' as OrigemMovimentacao,
          descricao: 'Saldo Anterior Consolidado',
          dataHora: '2026-08-31T23:59:59Z',
          registradoPorNome: 'Sistema (Saldo Inicial)',
        };
      }
      if (m.descricao && (m.descricao.includes('Gabriel Santos') || m.descricao.includes('Juliana Ribeiro'))) {
        updated = true;
        return {
          ...m,
          descricao: m.descricao
            .replace(/Gabriel Santos/g, 'Kawan Silva')
            .replace(/Juliana Ribeiro/g, 'Ryan Medeiros'),
        };
      }
      return m;
    });
    if (updated) {
      setStoredItem(STORAGE_KEYS.MOVIMENTACOES_CAIXA, list);
    }

    if (tipo && tipo !== 'TODAS') {
      list = list.filter((m) => m.tipo === tipo);
    }
    return list.sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  }

  // Rastreabilidade detalhada da movimentação do caixa (Somente Leitura)
  public getDetalhesMovimentacaoCaixa(movimentacaoId: string): DetalhesMovimentacaoCaixa | null {
    const movimentacoes = this.getMovimentacoesCaixa();
    const mov = movimentacoes.find((m) => m.id === movimentacaoId);
    if (!mov) return null;

    if (mov.origem === 'MENSALIDADE') {
      const pagamentos = this.getTodosPagamentosAlunos();
      let pag = pagamentos.find((p) => p.id === mov.referenciaId);
      if (!pag) {
        pag = pagamentos.find((p) => p.mensalidadeId === mov.referenciaId);
      }

      const mensalidades = this.getMensalidades();
      let men = pag ? mensalidades.find((m) => m.id === pag.mensalidadeId) : undefined;
      if (!men) {
        men = mensalidades.find((m) => m.id === mov.referenciaId || m.pagamentoId === mov.referenciaId);
      }

      const alunos = this.getAlunos();
      const aluno = pag
        ? alunos.find((a) => a.id === pag.alunoId)
        : men
        ? alunos.find((a) => a.id === men.alunoId)
        : undefined;

      const alunoNome = aluno?.nome || pag?.alunoNome || men?.alunoNome;
      if (alunoNome || pag || men) {
        const dataPag =
          pag?.dataPagamento ||
          (pag?.informadoEm
            ? pag.informadoEm.split('T')[0]
            : men?.ultimoPagamentoData
            ? men.ultimoPagamentoData.split('T')[0]
            : mov.dataHora.split('T')[0]);
        const dataConf = pag?.confirmadoEm
          ? pag.confirmadoEm.split('T')[0]
          : men?.ultimoPagamentoConfirmadoEm
          ? men.ultimoPagamentoConfirmadoEm.split('T')[0]
          : mov.dataHora.split('T')[0];

        return {
          movimentacao: mov,
          tipoOrigem: 'MENSALIDADE',
          alunoNome: alunoNome || 'Aluno',
          alunoId: aluno?.id || pag?.alunoId || men?.alunoId,
          competencia: men?.competencia || pag?.competencia || 'Setembro/2026',
          valor: mov.valor,
          formaPagamento: pag?.formaPagamento || men?.ultimoPagamentoForma || 'PIX',
          dataPagamento: formatDateBR(dataPag),
          dataConfirmacao: formatDateBR(dataConf),
          dataVencimentoMensalidade: men?.dataVencimento ? formatDateBR(men.dataVencimento) : '-',
          registradoPorNome: pag?.informadoPorNome || mov.registradoPorNome,
          confirmadoPorNome: pag?.confirmadoPorNome || mov.registradoPorNome,
          referenciaCodigo: pag?.id || mov.referenciaId,
          observacao: pag?.observacao,
          statusFormatado: pag?.statusConfirmacao === 'CONFIRMADO' ? 'Confirmado' : 'Aguardando',
        };
      }
    } else if (mov.origem === 'DESPESA') {
      const despesas = this.getDespesas();
      const desp = despesas.find((d) => d.id === mov.referenciaId);
      if (desp) {
        const dataPagamentoReal = desp.dataPagamento
          ? formatDateBR(desp.dataPagamento)
          : mov.dataHora
          ? formatDateBR(mov.dataHora.split('T')[0])
          : formatDateBR(desp.data);

        return {
          movimentacao: mov,
          tipoOrigem: 'DESPESA',
          descricaoDespesa: desp.descricao,
          categoriaDespesa: desp.categoria,
          valorDespesa: desp.valor,
          dataDespesa: formatDateBR(desp.data),
          dataPagamentoDespesa: dataPagamentoReal,
          formaPagamentoDespesa: desp.formaPagamento,
          criadoPorDespesa: desp.criadoPorNome,
          pagoPorDespesa: desp.pagoPorNome || desp.criadoPorNome,
          statusDespesa: desp.status === 'PAGA' ? 'Paga' : 'Pendente',
          referenciaCodigo: desp.id,
          observacaoDespesa: desp.observacao,
        };
      }
    } else if (mov.origem === 'PAGAMENTO_PROFESSOR') {
      const pagamentosProf = this.getPagamentosProfessores();
      const pagProf = pagamentosProf.find((p) => p.id === mov.referenciaId);
      if (pagProf) {
        return {
          movimentacao: mov,
          tipoOrigem: 'PAGAMENTO_PROFESSOR',
          professorNome: pagProf.professorNome,
          competenciaProfessor: pagProf.competencia,
          valorProfessor: pagProf.valor,
          dataPagamentoProfessor: formatDateBR(pagProf.dataPagamento),
          formaPagamentoProfessor: pagProf.formaPagamento,
          registradoPorProfessor: pagProf.registradoPorNome,
          reciboConfirmadoPeloProfessor: pagProf.status === 'RECEBIMENTO_CONFIRMADO',
          dataConfirmacaoRecebimentoProfessor: pagProf.confirmadoEm
            ? formatDateTimeBR(pagProf.confirmadoEm)
            : undefined,
          referenciaCodigo: pagProf.id,
        };
      }
    } else if (mov.origem === 'ADIANTAMENTO_PROFESSOR') {
      const adiantamentos = this.getAdiantamentosProfessores();
      const adiant = adiantamentos.find((a) => a.id === mov.referenciaId);
      if (adiant) {
        return {
          movimentacao: mov,
          tipoOrigem: 'ADIANTAMENTO_PROFESSOR',
          professorNome: adiant.professorNome,
          valorProfessor: adiant.valor,
          dataPagamentoProfessor: adiant.dataPagamento
            ? formatDateBR(adiant.dataPagamento)
            : formatDateBR(mov.dataHora.slice(0, 10)),
          formaPagamentoProfessor: adiant.formaPagamento || 'PIX',
          registradoPorProfessor: adiant.registradoPorNome || mov.registradoPorNome,
          reciboConfirmadoPeloProfessor: adiant.status === 'CONFIRMADO',
          dataConfirmacaoRecebimentoProfessor: adiant.confirmadoRecebimentoEm
            ? formatDateTimeBR(adiant.confirmadoRecebimentoEm)
            : undefined,
          dataRegistroAdiantamento: adiant.pagoEm
            ? formatDateTimeBR(adiant.pagoEm)
            : formatDateTimeBR(mov.dataHora),
          motivoAdiantamento: adiant.motivo,
          referenciaCodigo: adiant.id,
          statusReciboAdiantamento:
            adiant.status === 'CONFIRMADO'
              ? `Recebimento confirmado pelo professor em ${formatDateTimeBR(
                  adiant.confirmadoRecebimentoEm || ''
                )}`
              : 'Aguardando confirmação do professor',
          observacao: adiant.observacaoPagamento || adiant.motivo,
        };
      }
    } else if (mov.origem === 'ESTORNO') {
      return {
        movimentacao: mov,
        tipoOrigem: 'ESTORNO',
        referenciaCodigo: mov.referenciaId,
        observacao: mov.descricao,
      };
    } else if (mov.origem === 'SALDO_INICIAL') {
      return {
        movimentacao: mov,
        tipoOrigem: 'SALDO_INICIAL',
        referenciaCodigo: mov.referenciaId || 'saldo-abertura',
        observacao: 'Saldo inicial consolidado no Caixa antes do período de apuração.',
      };
    }

    // Origem não localizada nos cadastros
    return {
      movimentacao: mov,
      tipoOrigem: 'DESCONHECIDO',
      referenciaCodigo: mov.referenciaId,
    };
  }

  public getAuditoriaLogs(): AuditoriaLog[] {
    let list = getStoredItem<AuditoriaLog[]>(
      STORAGE_KEYS.AUDITORIA,
      INITIAL_AUDITORIA
    );

    let modified = false;
    list = list.map((log) => {
      let changed = false;
      let usuarioNome = log.usuarioNome;
      let detalhes = log.detalhes;

      if (log.usuarioId === 'usr-prof-2' && usuarioNome !== 'Prof. Kawan Silva') {
        usuarioNome = 'Prof. Kawan Silva';
        changed = true;
      } else if (log.usuarioId === 'usr-prof-3' && usuarioNome !== 'Prof. Ryan Medeiros') {
        usuarioNome = 'Prof. Ryan Medeiros';
        changed = true;
      }

      if (
        detalhes &&
        (detalhes.includes('Gabriel Santos') ||
          detalhes.includes('Juliana Ribeiro') ||
          detalhes.includes('Prof. Prof.') ||
          detalhes.includes('Profa. Profa.'))
      ) {
        detalhes = cleanProfDuplication(
          detalhes
            .replace(/Gabriel Santos/g, 'Kawan Silva')
            .replace(/Juliana Ribeiro/g, 'Ryan Medeiros')
        );
        changed = true;
      }

      if (changed) {
        modified = true;
        return { ...log, usuarioNome, detalhes };
      }
      return log;
    });

    if (modified) {
      setStoredItem(STORAGE_KEYS.AUDITORIA, list);
    }

    return list.sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  }

  private registrarAuditoria(
    acao: string,
    entidade: AuditoriaLog['entidade'],
    entidadeId: string,
    detalhes: string,
    usuario: User
  ): void {
    const logs = getStoredItem<AuditoriaLog[]>(
      STORAGE_KEYS.AUDITORIA,
      INITIAL_AUDITORIA
    );
    const novoLog: AuditoriaLog = {
      id: `aud-${Date.now().toString().slice(-6)}`,
      acao,
      entidade,
      entidadeId,
      detalhes,
      usuarioId: usuario.id,
      usuarioNome: usuario.name,
      dataHora: new Date().toISOString(),
    };
    logs.unshift(novoLog);
    setStoredItem(STORAGE_KEYS.AUDITORIA, logs);
  }

  // Dashboard Professor
  public getDashboardProfessorStats(professorId: string): DashboardProfessorStats {
    const mensalidades = this.getMensalidades();
    const alunos = this.getAlunos();
    const pagamentosProf = this.getPagamentosProfessores(professorId);

    const hoje = getTodayDateStr();
    const hojeMais7 = getFutureDateStr(7);

    // Alunos em atraso: vencidos antes de hoje e ainda não quitados (nem aguardando confirmação, nem novo aluno com pagamento inicial pendente)
    const totalAtrasados = mensalidades.filter((m) => {
      const aluno = alunos.find((a) => a.id === m.alunoId);
      if (!aluno || aluno.status !== 'ATIVO') return false;
      if (m.status === 'QUITADA' || m.status === 'AGUARDANDO_CONFIRMACAO') return false;
      if (this.isPagamentoInicialPendente(aluno.id)) return false;
      return m.status === 'ATRASADA' || (m.status === 'PENDENTE' && m.dataVencimento < hoje);
    }).length;

    // Próximos 7 dias: hoje até hoje + 7 dias (pendentes do ciclo normal, não quitadas nem aguardando)
    const totalProximos7Dias = mensalidades.filter((m) => {
      const aluno = alunos.find((a) => a.id === m.alunoId);
      if (!aluno || aluno.status !== 'ATIVO') return false;
      if (m.status === 'QUITADA' || m.status === 'AGUARDANDO_CONFIRMACAO') return false;
      if (this.isPagamentoInicialPendente(aluno.id)) return false;
      return (
        m.status === 'PENDENTE' &&
        m.dataVencimento >= hoje &&
        m.dataVencimento <= hojeMais7
      );
    }).length;

    // Aguardando confirmação: pagamentos já informados e aguardando confirmação do ADMIN
    const totalAguardandoConfirmacao = mensalidades.filter((m) => {
      const aluno = alunos.find((a) => a.id === m.alunoId);
      return aluno?.status === 'ATIVO' && m.status === 'AGUARDANDO_CONFIRMACAO';
    }).length;

    // Meus recebimentos pendentes (da academia para o professor: repasses + adiantamentos aguardando confirmação)
    const meusRepassesPendentes = pagamentosProf.filter(
      (p) => p.status === 'AGUARDANDO_RECEBIMENTO'
    ).length;
    const meusAdiantamentosPendentes = this.getMeusAdiantamentosPendentesConfirmacaoCount(professorId);
    const meusPagamentosPendentes = meusRepassesPendentes + meusAdiantamentosPendentes;

    return {
      totalAtrasados,
      totalVencemSemana: totalProximos7Dias,
      totalProximos7Dias,
      totalAguardandoConfirmacao,
      meusPagamentosPendentes,
    };
  }

  // Dashboard Admin
  public getDashboardAdminStats(): DashboardAdminStats {
    const movimentacoes = this.getMovimentacoesCaixa();
    const mensalidades = this.getMensalidades();
    const alunos = this.getAlunos();
    const hoje = getTodayDateStr();
    const hojeMais7 = getFutureDateStr(7);

    // Saldo do Caixa = Todas as Entradas - Todas as Saídas
    let saldoCaixa = 0;
    let entradasMes = 0;
    let saidasMes = 0;

    const anoMesAtual = hoje.slice(0, 7);

    for (const mov of movimentacoes) {
      if (mov.tipo === 'ENTRADA') {
        saldoCaixa += mov.valor;
        // Saldo de abertura/inicial NÃO entra nas entradas operacionais do mês
        if (mov.origem !== 'SALDO_INICIAL' && mov.dataHora.startsWith(anoMesAtual)) {
          entradasMes += mov.valor;
        }
      } else {
        saldoCaixa -= mov.valor;
        if (mov.dataHora.startsWith(anoMesAtual)) {
          saidasMes += mov.valor;
        }
      }
    }

    const resultadoMes = entradasMes - saidasMes;

    const totalAguardandoConfirmacao = mensalidades.filter(
      (m) => m.status === 'AGUARDANDO_CONFIRMACAO'
    ).length;

    const totalAtrasados = mensalidades.filter((m) => {
      const aluno = alunos.find((a) => a.id === m.alunoId);
      if (!aluno || aluno.status !== 'ATIVO') return false;
      if (m.status === 'QUITADA' || m.status === 'AGUARDANDO_CONFIRMACAO') return false;
      if (this.isPagamentoInicialPendente(aluno.id)) return false;
      return m.status === 'ATRASADA' || (m.status === 'PENDENTE' && m.dataVencimento < hoje);
    }).length;

    const totalVencemSemana = mensalidades.filter((m) => {
      const aluno = alunos.find((a) => a.id === m.alunoId);
      if (!aluno || aluno.status !== 'ATIVO') return false;
      if (this.isPagamentoInicialPendente(aluno.id)) return false;
      return (
        m.status === 'PENDENTE' &&
        m.dataVencimento >= hoje &&
        m.dataVencimento <= hojeMais7
      );
    }).length;

    return {
      saldoCaixa,
      entradasMes,
      saidasMes,
      resultadoMes,
      totalAguardandoConfirmacao,
      totalAtrasados,
      totalVencemSemana,
    };
  }

  public getCicloMensalCaixa(anoMes?: string): CicloMensalCaixa {
    return getCicloMensalCaixa(anoMes);
  }

  /**
   * Resumo Financeiro Mensal (Somente Leitura):
   * Separa rigidamente:
   * - Saldo de Abertura (posição financeira consolidada antes do período + saldos iniciais)
   * - Entradas Operacionais (mensalidades confirmadas + outras receitas do mês)
   * - Saídas Operacionais (despesas operacionais pagas + pagamentos de professores)
   * - Resultado Operacional do Período (Entradas Operacionais - Saídas Operacionais)
   * - Saldo Final do Caixa (Saldo de Abertura + Resultado Operacional)
   * - Ciclo Mensal do Caixa (Status, período e contagem regressiva dinâmicos)
   */
  public getFechamentoMensal(anoMes?: string): ResumoFinanceiroMensal {
    const targetAnoMes = anoMes || getTodayDateStr().slice(0, 7);
    const ciclo = this.getCicloMensalCaixa(targetAnoMes);
    const todasMovimentacoes = this.getMovimentacoesCaixa();
    const inicioDoMes = `${targetAnoMes}-01`;

    // 1. Saldo de Abertura:
    // Saldo financeiro acumulado anterior ao primeiro dia do mês
    // + qualquer registro explícito de SALDO_INICIAL datado no mês
    let saldoAbertura = 0;
    for (const m of todasMovimentacoes) {
      if (m.dataHora < inicioDoMes) {
        if (m.tipo === 'ENTRADA') {
          saldoAbertura += m.valor;
        } else {
          saldoAbertura -= m.valor;
        }
      } else if (m.dataHora.startsWith(targetAnoMes) && m.origem === 'SALDO_INICIAL') {
        if (m.tipo === 'ENTRADA') {
          saldoAbertura += m.valor;
        } else {
          saldoAbertura -= m.valor;
        }
      }
    }

    // 2. Entradas e Saídas Operacionais do mês (excluindo SALDO_INICIAL)
    const movimentacoesDoMes = todasMovimentacoes.filter(
      (m) => m.dataHora.startsWith(targetAnoMes) && m.origem !== 'SALDO_INICIAL'
    );

    let mensalidadesConfirmadas = 0;
    let outrasEntradas = 0;
    let despesasPagas = 0;
    let pagamentosProfessores = 0;
    let adiantamentosProfessores = 0;

    for (const m of movimentacoesDoMes) {
      if (m.tipo === 'ENTRADA') {
        if (m.origem === 'MENSALIDADE') {
          mensalidadesConfirmadas += m.valor;
        } else {
          outrasEntradas += m.valor;
        }
      } else {
        if (m.origem === 'DESPESA') {
          despesasPagas += m.valor;
        } else if (m.origem === 'PAGAMENTO_PROFESSOR') {
          pagamentosProfessores += m.valor;
        } else if (m.origem === 'ADIANTAMENTO_PROFESSOR') {
          adiantamentosProfessores += m.valor;
        }
      }
    }

    const totalEntradasOperacionais = mensalidadesConfirmadas + outrasEntradas;
    const totalSaidasOperacionais =
      despesasPagas + pagamentosProfessores + adiantamentosProfessores;
    const resultadoOperacional = totalEntradasOperacionais - totalSaidasOperacionais;
    const saldoFinal = saldoAbertura + resultadoOperacional;

    return {
      anoMes: targetAnoMes,
      ciclo,
      saldoAbertura,
      mensalidadesConfirmadas,
      outrasEntradas,
      totalEntradasOperacionais,
      despesasPagas,
      pagamentosProfessores,
      adiantamentosProfessores,
      totalSaidasOperacionais,
      resultadoOperacional,
      saldoFinal,
    };
  }

  // Obter períodos disponíveis com base no histórico de movimentações e mês atual
  public getPeriodosDisponiveis(): { value: string; label: string; isAtual: boolean; isEncerrado: boolean }[] {
    const hoje = getTodayDateStr();
    const mesAtual = hoje.slice(0, 7);

    const mesesSet = new Set<string>();
    mesesSet.add(mesAtual);

    const movimentacoes = this.getMovimentacoesCaixa();
    for (const m of movimentacoes) {
      if (m.dataHora && m.dataHora.length >= 7) {
        mesesSet.add(m.dataHora.slice(0, 7));
      }
    }

    const mesesNomes = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const ordenados = Array.from(mesesSet).sort((a, b) => b.localeCompare(a));

    return ordenados.map((ym) => {
      const [ano, mes] = ym.split('-');
      const mesNum = parseInt(mes, 10);
      const nomeMes = mesesNomes[mesNum - 1] || mes;
      const isAtual = ym === mesAtual;
      const isEncerrado = ym < mesAtual;
      const sufixo = isAtual ? ' — Atual' : isEncerrado ? ' — Encerrado' : '';
      return {
        value: ym,
        label: `${nomeMes} / ${ano}${sufixo}`,
        isAtual,
        isEncerrado,
      };
    });
  }
}

export const financeService = new FinanceService();
