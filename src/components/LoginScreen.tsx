import React, { useState } from 'react';
import { LockKeyhole, User, AlertCircle, LoaderCircle } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { BomberLogo } from './BomberLogo';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      setErrorMsg('Informe usuário e senha.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const result = await login(username.trim(), password);

      if (!result.success) {
        setErrorMsg(result.message || 'Não foi possível realizar o login.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <BomberLogo size="sm" showSubtitle={true} />
        </div>

        <div className="bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/40">
          <div className="mb-6">
            <h1 className="text-xl font-black text-white">
              Acessar Bomber Financeiro
            </h1>

            <p className="text-sm text-zinc-400 mt-1">
              Entre com seu usuário e senha.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-bold text-zinc-300 mb-1.5"
              >
                Usuário
              </label>

              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />

                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/10 bg-[#0e0e11] text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  placeholder="Seu usuário"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-bold text-zinc-300 mb-1.5"
              >
                Senha
              </label>

              <div className="relative">
                <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />

                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/10 bg-[#0e0e11] text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  placeholder="Sua senha"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] text-black font-black text-sm shadow-lg shadow-lime-500/20 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-[11px] text-zinc-600">
          Acesso restrito à equipe Bomber Fitness.
        </p>
      </div>
    </div>
  );
};