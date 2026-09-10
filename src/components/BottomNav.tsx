import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Wallet,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';

export type TabType =
  | 'inicio'
  | 'alunos'
  | 'meus_pagamentos'
  | 'confirmacoes'
  | 'caixa'
  | 'professores';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  badgeAguardandoConfirmacao?: number;
  badgeMeusPagamentos?: number;
  isAdmin?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  badgeAguardandoConfirmacao = 0,
  badgeMeusPagamentos = 0,
  isAdmin: propIsAdmin,
}) => {
  const auth = useAuth();
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : auth.isAdmin;

  return (
    <nav
      id="bottom-navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0e0e11]/95 backdrop-blur-lg border-t border-white/10 shadow-2xl sm:hidden pb-safe"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {/* Tab 1: Início */}
        <button
          id="nav-tab-inicio"
          onClick={() => onTabChange('inicio')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-bold transition-colors ${
            activeTab === 'inicio' ? 'text-lime-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Início</span>
        </button>

        {/* Tab 2: Alunos */}
        <button
          id="nav-tab-alunos"
          onClick={() => onTabChange('alunos')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-bold transition-colors ${
            activeTab === 'alunos' ? 'text-lime-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Alunos</span>
        </button>

        {/* Tabs exclusivas do PROFESSOR */}
        {!isAdmin && (
          <button
            id="nav-tab-meus-pagamentos"
            onClick={() => onTabChange('meus_pagamentos')}
            className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-bold transition-colors ${
              activeTab === 'meus_pagamentos' ? 'text-lime-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Wallet className="w-5 h-5 mb-0.5" />
            <span>Recebimentos</span>
            {badgeMeusPagamentos > 0 && (
              <span className="absolute top-1.5 right-4 w-4 h-4 bg-lime-400 text-black font-black text-[10px] rounded-full flex items-center justify-center shadow-xs">
                {badgeMeusPagamentos}
              </span>
            )}
          </button>
        )}

        {/* Tabs exclusivas do ADMIN */}
        {isAdmin && (
          <>
            {/* Tab: Confirmar */}
            <button
              id="nav-tab-confirmacoes"
              onClick={() => onTabChange('confirmacoes')}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-bold transition-colors ${
                activeTab === 'confirmacoes' ? 'text-lime-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 mb-0.5" />
              <span>Confirmar</span>
              {badgeAguardandoConfirmacao > 0 && (
                <span className="absolute top-1.5 right-3 px-1 min-w-[16px] h-4 bg-amber-400 text-black font-black text-[10px] rounded-full flex items-center justify-center shadow-xs">
                  {badgeAguardandoConfirmacao}
                </span>
              )}
            </button>

            {/* Tab: Caixa & Despesas */}
            <button
              id="nav-tab-caixa"
              onClick={() => onTabChange('caixa')}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-bold transition-colors ${
                activeTab === 'caixa' ? 'text-lime-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <DollarSign className="w-5 h-5 mb-0.5" />
              <span>Caixa</span>
            </button>

            {/* Tab: Professores & Auditoria */}
            <button
              id="nav-tab-professores"
              onClick={() => onTabChange('professores')}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-bold transition-colors ${
                activeTab === 'professores' ? 'text-lime-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <ShieldCheck className="w-5 h-5 mb-0.5" />
              <span>Equipe</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
};
