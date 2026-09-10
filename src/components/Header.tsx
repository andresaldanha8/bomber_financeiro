import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User as UserIcon, RotateCcw, ChevronDown, Check } from 'lucide-react';
import { financeService } from '../services/financeService';
import { BomberLogo } from './BomberLogo';

interface HeaderProps {
  onDataReset?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onDataReset }) => {
  const { currentUser, users, switchUser, isAdmin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleReset = () => {
    if (window.confirm('Deseja reiniciar todos os dados para o estado inicial de demonstração?')) {
      financeService.resetToDefault();
      if (onDataReset) onDataReset();
      window.location.reload();
    }
  };

  return (
    <header
      id="main-header"
      className="sticky top-0 z-40 bg-[#0e0e11]/95 backdrop-blur-md border-b border-white/10 text-white shadow-lg shadow-black/40"
    >
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Official Brand Logo */}
        <div className="flex items-center">
          <BomberLogo size="sm" showSubtitle={true} />
        </div>

        {/* User Switcher Pill */}
        <div className="relative">
          <button
            id="btn-user-switcher-toggle"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#18181b] hover:bg-[#202024] border border-white/15 transition-all text-left focus:outline-none focus:ring-2 focus:ring-lime-400 shadow-sm"
            aria-label="Trocar perfil de acesso"
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                isAdmin
                  ? 'bg-gradient-to-r from-[#D4FF00] to-[#16A34A] text-black shadow-xs shadow-lime-500/20'
                  : 'bg-zinc-800 text-lime-400 border border-lime-400/30 shadow-xs'
              }`}
            >
              {currentUser?.avatar || 'U'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold leading-tight text-zinc-100 max-w-[120px] truncate">
                {currentUser?.name}
              </p>
              <p className="text-[10px] font-bold leading-tight text-zinc-400">
                {isAdmin ? 'ADMIN' : 'PROFESSOR'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {/* Switcher Dropdown */}
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div
                id="user-switcher-dropdown"
                className="absolute right-0 mt-2 w-72 bg-[#18181b] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-white"
              >
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-xs font-bold text-zinc-200">
                    Alternar Sessão (Simulador)
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Teste permissões de Admin e Professores
                  </p>
                </div>

                <div className="py-1 space-y-1">
                  {users.map((user) => {
                    const isSelected = user.id === currentUser?.id;
                    const isUserAdmin = user.role === 'ADMIN';
                    return (
                      <button
                        key={user.id}
                        id={`btn-switch-user-${user.id}`}
                        onClick={() => {
                          switchUser(user.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-white/10 text-white ring-1 ring-lime-400/40'
                            : 'hover:bg-white/5 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                              isUserAdmin
                                ? 'bg-gradient-to-r from-[#D4FF00] to-[#16A34A] text-black'
                                : 'bg-zinc-800 text-lime-400 border border-lime-400/30'
                            }`}
                          >
                            {user.avatar || 'U'}
                          </div>
                          <div>
                            <p className="text-xs font-bold leading-tight text-white">
                              {user.name}
                            </p>
                            <span
                              className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                                isUserAdmin
                                  ? 'bg-lime-400/15 text-lime-300 border border-lime-400/30'
                                  : 'bg-white/10 text-zinc-300 border border-white/10'
                              }`}
                            >
                              {user.role}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-lime-400" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 mt-1 border-t border-white/10">
                  <button
                    id="btn-reset-demo-data"
                    onClick={handleReset}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-lime-400 hover:bg-white/5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar dados iniciais do MVP</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
