import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      id="toast-container"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          id={`toast-${toast.id}`}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top duration-200 ${
            toast.type === 'success'
              ? 'bg-[#18181b] text-lime-200 border-lime-500/40 shadow-lime-950/40'
              : toast.type === 'error'
              ? 'bg-[#18181b] text-red-200 border-red-500/40 shadow-red-950/40'
              : 'bg-[#18181b] text-white border-white/15 shadow-black/60'
          }`}
        >
          {toast.type === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-lime-400 shrink-0 mt-0.5" />
          )}
          {toast.type === 'error' && (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          {toast.type === 'info' && (
            <Info className="w-5 h-5 text-lime-400 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">{toast.title}</p>
            {toast.description && (
              <p className="text-xs text-zinc-400 mt-0.5 leading-snug">{toast.description}</p>
            )}
          </div>

          <button
            id={`toast-close-${toast.id}`}
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fechar notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
