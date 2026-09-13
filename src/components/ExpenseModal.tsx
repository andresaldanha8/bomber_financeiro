import React, { useState } from 'react';
import { CategoriaDespesa } from '../types';
import { criarDespesa, CATEGORIES_LABELS } from '../services/despesasApi';
import { X, Receipt, AlertCircle } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (descricao: string) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<CategoriaDespesa>(CATEGORIES_LABELS[0] as CategoriaDespesa);
  const [valor, setValor] = useState('');
  const [data, setData] = useState(() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) return setErrorMsg('Informe a descrição da despesa.');
    const valorNum = parseFloat(valor.replace(',', '.'));
    if (Number.isNaN(valorNum) || valorNum <= 0) return setErrorMsg('Informe um valor válido maior que zero.');
    if (loading) return;

    try {
      setLoading(true);
      setErrorMsg('');
      await criarDespesa({ descricao: descricao.trim(), categoria, valor: valorNum, data });
      onSuccess(descricao.trim());
      // reset
      setDescricao('');
      setCategoria(CATEGORIES_LABELS[0] as CategoriaDespesa);
      setValor('');
      setData(new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()));
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao cadastrar despesa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="expense-modal-backdrop" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div id="expense-modal-content" className="w-full sm:max-w-md bg-[#18181b] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 text-white">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/40 text-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-black text-white tracking-tight">Nova Despesa da Academia</h2>
          </div>
          <button id="btn-close-expense-modal" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label htmlFor="input-despesa-descricao" className="block text-xs font-bold text-zinc-300 mb-1">Descrição da Despesa *</label>
            <input type="text" id="input-despesa-descricao" required placeholder="Ex: Conta de Luz Enel, Material de limpeza..." value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white font-medium placeholder:text-zinc-500" />
          </div>

          <div>
            <label htmlFor="select-despesa-categoria" className="block text-xs font-bold text-zinc-300 mb-1">Categoria *</label>
            <select id="select-despesa-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaDespesa)} className="w-full text-sm px-3 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white">
              {CATEGORIES_LABELS.map((cat) => (
                <option key={cat} value={cat} className="bg-[#18181b] text-white">{cat}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="input-despesa-valor" className="block text-xs font-bold text-zinc-300 mb-1">Valor (R$) *</label>
              <input type="text" id="input-despesa-valor" required placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} className="w-full text-sm px-3 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white font-black placeholder:text-zinc-500" />
            </div>

            <div>
              <label htmlFor="input-despesa-data" className="block text-xs font-bold text-zinc-300 mb-1">Data *</label>
              <input type="date" id="input-despesa-data" required value={data} onChange={(e) => setData(e.target.value)} className="w-full text-sm px-3 py-2.5 rounded-xl border border-white/10 bg-[#121212] focus:outline-none focus:ring-2 focus:ring-lime-400 text-white" />
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" id="btn-salvar-despesa" disabled={loading} className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-sm shadow-lg shadow-lime-500/20 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-lime-400 disabled:opacity-50">
              {loading ? 'Salvando...' : 'Registrar Despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
