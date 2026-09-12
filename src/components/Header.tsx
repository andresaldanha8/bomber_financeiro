import React from 'react';
import { LogOut } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { BomberLogo } from './BomberLogo';

interface HeaderProps {
  onDataReset?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const { currentUser, isAdmin, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
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

        {/* Usuário autenticado */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#18181b] border border-white/15 shadow-sm">
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
          </div>

          <button
            id="btn-logout"
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-[#18181b] hover:bg-[#202024] border border-white/15 text-zinc-400 hover:text-lime-400 transition-colors focus:outline-none focus:ring-2 focus:ring-lime-400"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};