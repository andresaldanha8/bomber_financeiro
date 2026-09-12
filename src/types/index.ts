export type UserRole = 'ADMIN' | 'PROFESSOR';

export interface User {
  id: string;
  name: string;
  username?: string;
  email?: string;
  role: UserRole;
  active?: boolean;
  avatar?: string;
  chavePix?: string;
  especialidade?: string;
}

export interface Plano {
  id: string;
  nome: string;
  preco: number;
  descricao: string;
}

export type AlunoStatus = 'ATIVO' | 'INATIVO';

export interface Aluno {
  id: string;
  nome: string;
  telefone: string;
  dataEntrada: string; // YYYY-MM-DD
  diaVencimento: number; // 1 a 31
  planoId: string; // Condição de entrada comercial ('plano-individual', 'plano-dupla', 'plano-trio')
  valorMensalidade: number; // Valor padrão recorrente (R$ 80,00)
  status: AlunoStatus;
  observacao?: string;
  criadoPorId: string;
  criadoPorNome: string;
  criadoEm: string; // ISO string
}

export type StatusMensalidade = 'PENDENTE' | 'AGUARDANDO_CONFIRMACAO' | 'QUITADA' | 'ATRASADA';
export type FormaPagamento = 'PIX' | 'DINHEIRO';

export interface Mensalidade {
  id: string;
  alunoId: string;
  alunoNome: string;
  competencia: string; // Ex: "Setembro/2026"
  anoMes: string; // Ex: "2026-09"
  valor: number;
  dataVencimento: string; // YYYY-MM-DD
  status: StatusMensalidade;
  pagamentoId?: string;
  ultimoPagamentoData?: string; // Data real do pagamento (YYYY-MM-DD ou ISO de quando foi pago)
  ultimoPagamentoForma?: FormaPagamento;
  ultimoPagamentoConfirmadoEm?: string; // ISO string de quando foi confirmado
}

export type StatusConfirmacaoPagamento = 'AGUARDANDO_CONFIRMACAO' | 'CONFIRMADO' | 'ESTORNADO';

export interface PagamentoAluno {
  id: string;
  mensalidadeId: string;
  alunoId: string;
  alunoNome: string;
  valor: number;
  formaPagamento: FormaPagamento;
  competencia: string;
  dataPagamento?: string; // Data real do pagamento (YYYY-MM-DD)
  dataVencimento?: string; // Data de vencimento original da mensalidade (YYYY-MM-DD)
  informadoPorId: string;
  informadoPorNome: string;
  informadoEm: string; // ISO string
  statusConfirmacao: StatusConfirmacaoPagamento;
  confirmadoPorId?: string;
  confirmadoPorNome?: string;
  confirmadoEm?: string; // ISO string
  motivoEstorno?: string;
  observacao?: string;
}

export type CategoriaDespesa =
  | 'Professores'
  | 'Energia'
  | 'Água'
  | 'Internet'
  | 'Aluguel'
  | 'Manutenção'
  | 'Equipamentos'
  | 'Produtos/Material'
  | 'Impostos/Taxas'
  | 'Outros';

export type StatusDespesa = 'PAGA' | 'PENDENTE';

export interface Despesa {
  id: string;
  descricao: string;
  categoria: CategoriaDespesa;
  valor: number;
  data: string; // YYYY-MM-DD (Data da despesa / competência da obrigação)
  formaPagamento: string;
  status: StatusDespesa;
  criadoPorId: string;
  criadoPorNome: string;
  criadoEm: string;
  dataPagamento?: string; // YYYY-MM-DD (Data real do pagamento)
  pagoPorId?: string;
  pagoPorNome?: string;
  pagoEm?: string; // ISO string
  observacao?: string;
}

export type StatusPagamentoProfessor = 'AGUARDANDO_RECEBIMENTO' | 'RECEBIMENTO_CONFIRMADO';

export interface PagamentoProfessor {
  id: string;
  professorId: string;
  professorNome: string;
  competencia: string; // Ex: "Agosto/2026", "Setembro/2026"
  valor: number;
  dataPagamento: string; // Data em que o admin realizou
  formaPagamento: string; // Ex: 'PIX', 'Dinheiro'
  status: StatusPagamentoProfessor;
  registradoPorId: string;
  registradoPorNome: string;
  registradoEm: string;
  confirmadoEm?: string; // Data e hora que o professor clicou "Confirmar que recebi"
}

export type StatusAdiantamento =
  | 'SOLICITADO'
  | 'RECUSADO'
  | 'PAGO_AGUARDANDO_CONFIRMACAO'
  | 'CONFIRMADO';

export interface AdiantamentoProfessor {
  id: string;
  professorId: string;
  professorNome: string;
  valor: number;
  dataSolicitacao: string; // ISO string
  motivo?: string;
  status: StatusAdiantamento;

  analisadoPorId?: string;
  analisadoPorNome?: string;
  analisadoEm?: string;
  motivoRecusa?: string;

  dataPagamento?: string; // YYYY-MM-DD
  formaPagamento?: string;
  registradoPorId?: string;
  registradoPorNome?: string;
  pagoEm?: string; // ISO string
  observacaoPagamento?: string;

  confirmadoRecebimentoEm?: string; // ISO string
}

export type TipoMovimentacaoCaixa = 'ENTRADA' | 'SAIDA';
export type OrigemMovimentacao =
  | 'MENSALIDADE'
  | 'DESPESA'
  | 'PAGAMENTO_PROFESSOR'
  | 'ADIANTAMENTO_PROFESSOR'
  | 'ESTORNO'
  | 'SALDO_INICIAL';

export interface MovimentacaoCaixa {
  id: string;
  tipo: TipoMovimentacaoCaixa;
  origem: OrigemMovimentacao;
  referenciaId: string;
  descricao: string;
  valor: number;
  dataHora: string;
  registradoPorNome: string;
}

export interface AuditoriaLog {
  id: string;
  acao: string;
  entidade: 'ALUNO' | 'PAGAMENTO_ALUNO' | 'DESPESA' | 'PAGAMENTO_PROFESSOR' | 'ADIANTAMENTO_PROFESSOR' | 'CAIXA';
  entidadeId: string;
  detalhes: string;
  usuarioId: string;
  usuarioNome: string;
  dataHora: string;
}

export interface DashboardProfessorStats {
  totalAtrasados: number;
  totalVencemSemana: number;
  totalProximos7Dias?: number;
  totalAguardandoConfirmacao: number;
  meusPagamentosPendentes: number;
}

export interface DashboardAdminStats {
  saldoCaixa: number;
  entradasMes: number;
  saidasMes: number;
  resultadoMes: number;
  totalAguardandoConfirmacao: number;
  totalAtrasados: number;
  totalVencemSemana: number;
}

export interface DetalhesMovimentacaoCaixa {
  movimentacao: MovimentacaoCaixa;
  tipoOrigem:
    | 'MENSALIDADE'
    | 'DESPESA'
    | 'PAGAMENTO_PROFESSOR'
    | 'ADIANTAMENTO_PROFESSOR'
    | 'ESTORNO'
    | 'SALDO_INICIAL'
    | 'DESCONHECIDO';
  // Dados de Mensalidade de Aluno
  alunoNome?: string;
  alunoId?: string;
  competencia?: string;
  valor?: number;
  formaPagamento?: string;
  dataPagamento?: string;
  dataConfirmacao?: string;
  dataVencimentoMensalidade?: string;
  registradoPorNome?: string;
  confirmadoPorNome?: string;
  referenciaCodigo?: string;
  observacao?: string;
  statusFormatado?: string;

  // Dados de Despesa
  descricaoDespesa?: string;
  categoriaDespesa?: CategoriaDespesa | string;
  valorDespesa?: number;
  dataDespesa?: string;
  dataPagamentoDespesa?: string;
  formaPagamentoDespesa?: string;
  criadoPorDespesa?: string;
  pagoPorDespesa?: string;
  statusDespesa?: string;
  observacaoDespesa?: string;

  // Dados de Pagamento / Adiantamento de Professor
  professorNome?: string;
  competenciaProfessor?: string;
  valorProfessor?: number;
  dataPagamentoProfessor?: string;
  formaPagamentoProfessor?: string;
  registradoPorProfessor?: string;
  reciboConfirmadoPeloProfessor?: boolean;
  dataConfirmacaoRecebimentoProfessor?: string;
  dataRegistroAdiantamento?: string;
  motivoAdiantamento?: string;
  statusReciboAdiantamento?: string;
}

export interface CicloMensalCaixa {
  anoMes: string;
  ano: number;
  mes: number;
  nomeMes: string;
  isAtual: boolean;
  isEncerrado: boolean;
  isFuturo: boolean;
  dataInicio: string; // YYYY-MM-01
  dataInicioFormatada: string; // DD/MM/AAAA
  dataFim: string; // YYYY-MM-DD
  dataFimFormatada: string; // DD/MM/AAAA
  fechamentoPrevistoFormatado: string; // DD/MM/AAAA
  diasRestantes?: number;
  mensagemContagem?: string;
  dataAtualFormatada: string;
}

export interface ResumoFinanceiroMensal {
  anoMes: string;
  ciclo: CicloMensalCaixa;
  saldoAbertura: number;
  mensalidadesConfirmadas: number;
  outrasEntradas: number;
  totalEntradasOperacionais: number;
  despesasPagas: number;
  pagamentosProfessores: number;
  adiantamentosProfessores: number;
  totalSaidasOperacionais: number;
  resultadoOperacional: number;
  saldoFinal: number;
}

