import { LoginScreen } from './components/LoginScreen';
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { DesktopNav } from './components/DesktopNav';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentsList } from './components/StudentsList';
import { ConfirmationsList } from './components/ConfirmationsList';
import { TeacherPaymentsView } from './components/TeacherPaymentsView';
import { CashflowView, CaixaSubView } from './components/CashflowView';
import { AuditView } from './components/AuditView';
import { PaymentModal } from './components/PaymentModal';
import { StudentFormModal } from './components/StudentFormModal';
import { ConfirmPaymentModal } from './components/ConfirmPaymentModal';
import { ExpenseModal } from './components/ExpenseModal';
import { TeacherPaymentModal } from './components/TeacherPaymentModal';
import { MonthlyClosingModal } from './components/MonthlyClosingModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Aluno, FormaPagamento, Mensalidade, PagamentoAluno } from './types';
import { financeService } from './services/financeService';

// Abas permitidas por perfil
const ADMIN_ALLOWED_TABS: TabType[] = [
  'inicio',
  'alunos',
  'confirmacoes',
  'caixa',
  'professores',
];

const PROFESSOR_ALLOWED_TABS: TabType[] = [
  'inicio',
  'alunos',
  'meus_pagamentos',
];

function MainContent() {
  const {
    currentUser,
    isAdmin,
    isAuthenticated,
    isLoading,
} = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('inicio');
  const [caixaSubView, setCaixaSubView] = useState<CaixaSubView>('VISAO_GERAL');
  const [refreshKey, setRefreshKey] = useState(0);

  // Validação em tempo real: verifica se a aba ativa é permitida para o perfil atual
  const isTabAllowed = isAdmin
    ? ADMIN_ALLOWED_TABS.includes(activeTab)
    : PROFESSOR_ALLOWED_TABS.includes(activeTab);

  // Se não for permitida para o perfil ativo, redireciona imediatamente para 'inicio' (evita telas brancas e flashes)
  const effectiveActiveTab: TabType = isTabAllowed ? activeTab : 'inicio';

  // Sincroniza o estado de activeTab assim que a role mudar e a aba for restrita
  useEffect(() => {
    if (!isTabAllowed) {
      setActiveTab('inicio');
    }
  }, [isAdmin, currentUser?.role, isTabAllowed]);

  const handleTabChange = (tab: TabType) => {
    const isAllowed = isAdmin
      ? ADMIN_ALLOWED_TABS.includes(tab)
      : PROFESSOR_ALLOWED_TABS.includes(tab);

    const targetTab = isAllowed ? tab : 'inicio';
    setActiveTab(targetTab);
    if (targetTab === 'caixa') {
      setCaixaSubView('VISAO_GERAL');
    }
  };

  // Modais
  const [paymentModalAluno, setPaymentModalAluno] = useState<{
    aluno: Aluno;
    mensalidade?: Mensalidade;
  } | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingAluno, setEditingAluno] = useState<Aluno | null>(null);
  const [confirmModalPagamento, setConfirmModalPagamento] = useState<PagamentoAluno | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isTeacherPaymentModalOpen, setIsTeacherPaymentModalOpen] = useState(false);
  const [isMonthlyClosingModalOpen, setIsMonthlyClosingModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const triggerRefresh = () => {
  setRefreshKey((k) => k + 1);
};

if (isLoading) {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400">
      <div className="text-sm font-bold animate-pulse">
        Carregando sessão...
      </div>
    </div>
  );
}

if (!isAuthenticated || !currentUser) {
  return <LoginScreen />;
}

  // Contadores de Badges
  const pagamentosAguardando = financeService.getPagamentosAguardandoConfirmacao().length;
  const meusPagamentosPendentes = !isAdmin
    ? financeService
        .getPagamentosProfessores(currentUser.id)
        .filter((p) => p.status === 'AGUARDANDO_RECEBIMENTO').length
    : 0;

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col text-zinc-100 font-sans antialiased selection:bg-[#D4FF00] selection:text-black">
      {/* Container de Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header Principal */}
      <Header onDataReset={triggerRefresh} />

      {/* Navegação Desktop (Abas Superiores) */}
      <DesktopNav
        activeTab={effectiveActiveTab}
        onTabChange={handleTabChange}
        badgeAguardandoConfirmacao={pagamentosAguardando}
        badgeMeusPagamentos={meusPagamentosPendentes}
        isAdmin={isAdmin}
      />

      {/* Conteúdo Central Responsivo Mobile-First */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 pt-4 pb-20 sm:pb-8">
        {/* Banner de Identificação de Perfil (Informativo para o MVP) */}
        <div className="mb-3.5 px-3.5 py-2.5 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-between shadow-md shadow-black/30">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400 font-medium">Sessão Ativa:</span>
            <span className="font-bold text-white">{currentUser.name}</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isAdmin
                  ? 'bg-lime-400/20 text-lime-300 border border-lime-400/40 shadow-xs shadow-lime-500/10'
                  : 'bg-zinc-800 text-zinc-300 border border-white/15'
              }`}
            >
              {currentUser.role}
            </span>
          </div>

          <div className="text-[11px] text-zinc-400 hidden sm:block">
            {isAdmin
              ? 'Acesso total: Caixa, Despesas, Confirmação e Auditoria'
              : 'Acesso operacional: Registro de mensalidades e Meus Pagamentos'}
          </div>
        </div>

        {/* Roteamento de Telas */}
        {effectiveActiveTab === 'inicio' && (
          <>
            {isAdmin ? (
              <AdminDashboard
                key={`admin-dash-${currentUser?.id}-${refreshKey}`}
                onOpenConfirmModal={(pag) => setConfirmModalPagamento(pag)}
                onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
                onOpenStudentModal={() => setIsStudentModalOpen(true)}
                onOpenTeacherPaymentModal={() => setIsTeacherPaymentModalOpen(true)}
                onOpenMonthlyClosingModal={() => setIsMonthlyClosingModalOpen(true)}
                onNavigateTab={(tab) => handleTabChange(tab)}
                onOpenExtratoCaixa={() => {
                  handleTabChange('caixa');
                  setCaixaSubView('EXTRATO');
                }}
              />
            ) : (
              <TeacherDashboard
                key={`teacher-dash-${currentUser?.id}-${refreshKey}`}
                onOpenPaymentModal={(aluno, mensalidade) =>
                  setPaymentModalAluno({ aluno, mensalidade })
                }
                onOpenStudentModal={() => {
                  setEditingAluno(null);
                  setIsStudentModalOpen(true);
                }}
                onNavigateToAlunos={() => handleTabChange('alunos')}
                onEditStudent={(aluno) => {
                  setEditingAluno(aluno);
                  setIsStudentModalOpen(true);
                }}
              />
            )}
          </>
        )}

        {effectiveActiveTab === 'alunos' && (
          <StudentsList
            key={`students-${currentUser?.id}-${refreshKey}`}
            onOpenPaymentModal={(aluno, mensalidade) =>
              setPaymentModalAluno({ aluno, mensalidade })
            }
            onOpenStudentModal={() => {
              setEditingAluno(null);
              setIsStudentModalOpen(true);
            }}
            onEditStudent={(aluno) => {
              setEditingAluno(aluno);
              setIsStudentModalOpen(true);
            }}
          />
        )}

        {effectiveActiveTab === 'meus_pagamentos' && !isAdmin && (
          <TeacherPaymentsView
            key={`my-payments-${currentUser?.id}-${refreshKey}`}
            onSuccessConfirmation={() => {
              triggerRefresh();
              addToast(
                'success',
                'Recebimento Confirmado!',
                'Seu recibo digital foi assinado e registrado com sucesso.'
              );
            }}
          />
        )}

        {effectiveActiveTab === 'confirmacoes' && isAdmin && (
          <ConfirmationsList
            key={`confirmations-${currentUser?.id}-${refreshKey}`}
            onOpenConfirmModal={(pag) => setConfirmModalPagamento(pag)}
          />
        )}

        {effectiveActiveTab === 'caixa' && isAdmin && (
          <CashflowView
            key={`cashflow-${currentUser?.id}-${refreshKey}`}
            subView={caixaSubView}
            onSubViewChange={setCaixaSubView}
            onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
            onOpenMonthlyClosingModal={() => setIsMonthlyClosingModalOpen(true)}
            onExpensePaid={(desp) => {
              triggerRefresh();
              addToast(
                'success',
                'Pagamento Registrado!',
                `Despesa "${desp.descricao}" baixada com sucesso no Caixa.`
              );
            }}
          />
        )}

        {effectiveActiveTab === 'professores' && isAdmin && (
          <AuditView
            key={`audit-${currentUser?.id}-${refreshKey}`}
            onOpenTeacherPaymentModal={() => setIsTeacherPaymentModalOpen(true)}
          />
        )}
      </main>

      {/* Navegação Inferior Mobile */}
      <BottomNav
        activeTab={effectiveActiveTab}
        onTabChange={handleTabChange}
        badgeAguardandoConfirmacao={pagamentosAguardando}
        badgeMeusPagamentos={meusPagamentosPendentes}
        isAdmin={isAdmin}
      />

      {/* MODAL 1: Registrar Pagamento de Aluno (PIX ou Dinheiro) */}
      {paymentModalAluno && (
        <PaymentModal
          isOpen={true}
          aluno={paymentModalAluno.aluno}
          mensalidade={paymentModalAluno.mensalidade}
          onClose={() => setPaymentModalAluno(null)}
          onSuccess={(forma: FormaPagamento) => {
            triggerRefresh();
            if (isAdmin) {
              addToast(
                'success',
                `Recebimento (${forma}) Confirmado!`,
                'Valor lançado no Caixa e mensalidade quitada com sucesso.'
              );
            } else {
              addToast(
                'success',
                `Pagamento (${forma}) Informado!`,
                'Enviado para a fila de conferência do ADMIN.'
              );
            }
          }}
        />
      )}

      {/* MODAL 2: Cadastrar / Editar Aluno */}
      <StudentFormModal
        isOpen={isStudentModalOpen}
        alunoParaEditar={editingAluno}
        onClose={() => {
          setIsStudentModalOpen(false);
          setEditingAluno(null);
        }}
        onSuccess={(nomeAluno, isEdicao) => {
          triggerRefresh();
          addToast(
            'success',
            isEdicao ? 'Dados do Aluno Atualizados!' : 'Aluno Cadastrado com Sucesso!',
            isEdicao
              ? `As alterações no cadastro de ${nomeAluno} foram salvas com sucesso.`
              : `${nomeAluno} foi cadastrado e sua primeira mensalidade foi gerada.`
          );
        }}
      />

      {/* MODAL 3: Conferência de Pagamento pelo Admin */}
      <ConfirmPaymentModal
        isOpen={!!confirmModalPagamento}
        pagamento={confirmModalPagamento}
        onClose={() => setConfirmModalPagamento(null)}
        onSuccess={(acao) => {
          triggerRefresh();
          if (acao === 'CONFIRMADO') {
            addToast(
              'success',
              'Pagamento Confirmado pelo Admin!',
              'Mensalidade quitada, entrada gerada no Caixa e próximo ciclo ativado.'
            );
          } else {
            addToast(
              'error',
              'Pagamento Estornado',
              'O registro foi recusado e a mensalidade revertida para pendente.'
            );
          }
        }}
      />

      {/* MODAL 4: Nova Despesa (Admin) */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={(desc) => {
          triggerRefresh();
          addToast(
            'success',
            'Despesa Registrada!',
            `Despesa "${desc}" registrada e contabilizada no caixa.`
          );
        }}
      />

      {/* MODAL 5: Pagar Professor (Admin) */}
      <TeacherPaymentModal
        isOpen={isTeacherPaymentModalOpen}
        onClose={() => setIsTeacherPaymentModalOpen(false)}
        onSuccess={(nomeProf) => {
          triggerRefresh();
          addToast(
            'success',
            'Repasse Registrado!',
            `Saída gerada no caixa. Pagamento disponibilizado para ${nomeProf} assinar o recibo.`
          );
        }}
      />

      {/* MODAL 6: Fechamento Mensal (Admin) */}
      <MonthlyClosingModal
        isOpen={isMonthlyClosingModalOpen}
        onClose={() => setIsMonthlyClosingModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
