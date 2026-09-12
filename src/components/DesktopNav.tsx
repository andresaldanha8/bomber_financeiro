import React from 'react';
import { useAuth } from '../context/AuthContext';
import { TabType } from './BottomNav';
import {
  LayoutDashboard,
  Users,
  Wallet,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';

interface DesktopNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  badgeAguardandoConfirmacao?: number;
  badgeMeusPagamentos?: number;
  isAdmin?: boolean;
}

export const DesktopNav: React.FC<DesktopNavProps> = ({
  activeTab,
  onTabChange,
  badgeAguardandoConfirmacao = 0,
  badgeMeusPagamentos = 0,
  isAdmin: propIsAdmin,
}) => {
  const auth = useAuth();
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : auth.isAdmin;

  return (
    <div
      id="desktop-nav-container"
      className="hidden sm:block bg-[#0e0e11] border-b border-white/10 sticky top-[57px] z-30 shadow-md shadow-black/20"
    >
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            id="desktop-tab-inicio"
            onClick={() => onTabChange('inicio')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'inicio'
                ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Início</span>
          </button>

          <button
            id="desktop-tab-alunos"
            onClick={() => onTabChange('alunos')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'alunos'
                ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Alunos</span>
          </button>

          {!isAdmin && (
            <button
              id="desktop-tab-meus-pagamentos"
              onClick={() => onTabChange('meus_pagamentos')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'meus_pagamentos'
                  ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                  : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Recebimentos</span>
              {badgeMeusPagamentos > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-lime-400 text-black text-xs font-black">
                  {badgeMeusPagamentos}
                </span>
              )}
            </button>
          )}

          {isAdmin && (
            <>
              <button
                id="desktop-tab-confirmacoes"
                onClick={() => onTabChange('confirmacoes')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'confirmacoes'
                    ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                    : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Pagamentos</span>
                {badgeAguardandoConfirmacao > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-xs font-black">
                    {badgeAguardandoConfirmacao}
                  </span>
                )}
              </button>

              <button
                id="desktop-tab-caixa"
                onClick={() => onTabChange('caixa')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'caixa'
                    ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                    : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Caixa & Despesas</span>
              </button>

              <button
                id="desktop-tab-professores"
                onClick={() => onTabChange('professores')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'professores'
                    ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                    : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Equipe</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
