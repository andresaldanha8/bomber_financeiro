import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PagamentoAluno } from '../types';
import pagamentosApi, { PagamentoApi } from '../services/pagamentosApi';
import { getMensalidadeById } from '../services/mensalidadesApi';
import { getStudents } from '../services/studentsApi';
import { adminUsersService } from '../services/adminUsersService';
import { formatCurrency } from '../services/financeService';
import { formatDateTimeBR } from '../services/financeService';
import {
  CheckCircle2,
  QrCode,
  Banknote,
  Clock,
  Check,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

interface ConfirmationsListProps {
  onOpenConfirmModal: (pagamento: PagamentoAluno) => void;
}

export const ConfirmationsList: React.FC<ConfirmationsListProps> = ({
  onOpenConfirmModal,
}) => {
  const [pagamentosPendentes, setPagamentosPendentes] = useState<PagamentoAluno[]>([]);
  const [confirmadosRecentes, setConfirmadosRecentes] = useState<PagamentoAluno[]>([]);
  const { currentUser } = useAuth();
  const formatProfessorPresentation = (name?: string) => {
    if (!name) return '';
    let cleaned = name.trim();
    cleaned = cleaned.replace(/^(?:Prof(?:a)?\.\s*)+/i, (m) => m.replace(/\s+/g, ' '));
    if (/^Prof(?:a)?\./i.test(cleaned)) return cleaned;
    return `Prof. ${cleaned}`;
  };

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const pagos = await pagamentosApi.getPayments({ statusConfirmacao: 'AGUARDANDO' });

        // fetch mensalidades and students to enrich display data
        // collect mensalidade ids from pending and also from recent confirmed later
        const mensalidadeIds = new Set<string>(pagos.map((p) => p.mensalidadeId));
        const mensalidadeMap: Record<string, any> = {};
        await Promise.all(
          Array.from(mensalidadeIds).map(async (id) => {
            try {
              const m = await getMensalidadeById(id);
              mensalidadeMap[id] = m;
            } catch (e) {
              // ignore missing mensalidade
            }
          })
        );

        const students = await getStudents();
        const studentMap: Record<string, any> = {};
        for (const s of students) studentMap[s.id] = s;

        // fetch professors/admin users once to resolve informadoPor/confirmadoPor names
        let users: Array<{ id: string; name: string }> = [];
        try {
          const usersResp = await adminUsersService.list();
          users = usersResp.users.map((u: any) => ({ id: u.id, name: u.name }));
        } catch (e) {
          // if cannot fetch users, continue with empty list
          users = [];
        }
        const userMap: Record<string, string> = {};
        for (const u of users) userMap[u.id] = formatProfessorPresentation(u.name);

        const formatCompetencia = (c?: string) => {
          if (!c) return '—';
          // Accept formats like '2026-10-01T00:00:00.000Z' or '2026-10' or '2026-10-01'
          const m = c.match(/(\d{4})-(\d{2})/);
          if (m) return `${m[2]}/${m[1]}`;
          // fallback: if already 'MM/YYYY' or similar
          const alt = c.match(/(\d{2})\/(\d{4})/);
          if (alt) return `${alt[1]}/${alt[2]}`;
          return c;
        };

        // currentUser is read from hook at component top

        const enriched = pagos.map((p) => {
          const m = mensalidadeMap[p.mensalidadeId];
          const aluno = m ? studentMap[m.studentId] : undefined;
          const informadoById = (p as any).informadoPorId || (p as any).registradoPorId || undefined;
          const informadoNome = p.informadoPorNome || (informadoById && userMap[informadoById]) || undefined;

          const pa: any = {
            id: p.id,
            mensalidadeId: p.mensalidadeId,
            valor: p.valor,
            formaPagamento: p.formaPagamento,
            dataPagamento: p.dataPagamento ?? undefined,
            informadoPorNome: informadoNome ?? (p as any).informadoPorNome ?? undefined,
            informadoPorId: (p as any).informadoPorId ?? (p as any).registradoPorId ?? undefined,
            informadoEm: p.informadoEm ?? undefined,
            observacao: p.observacao ?? undefined,
            alunoNome: aluno ? aluno.nome : (p as any).alunoNome ?? '—',
            competencia: formatCompetencia(m ? m.competencia : (p as any).competencia ?? '—'),
            dataVencimento: m ? m.dataVencimento : undefined,
            statusConfirmacao: p.statusConfirmacao,
            // keep raw user ids for later
          } as PagamentoAluno;

          return pa;
        });

        if (!active) return;
        setPagamentosPendentes(enriched);

        // fetch recent confirmed
        const all = await pagamentosApi.getPayments({ statusConfirmacao: 'CONFIRMADO' });

        // include mensalidade ids from confirmed as well
        for (const p of all) mensalidadeIds.add(p.mensalidadeId);

        // fetch missing mensalidades in batch (unique)
        const missingIds = Array.from(mensalidadeIds).filter((id) => !mensalidadeMap[id]);
        await Promise.all(
          missingIds.map(async (id) => {
            try {
              const m = await getMensalidadeById(id);
              mensalidadeMap[id] = m;
            } catch (e) {
              // ignore
            }
          })
        );



        const recent = all.slice(0, 10).map((p) => {
          const m = mensalidadeMap[p.mensalidadeId];
          const aluno = m ? studentMap[m.studentId] : undefined;
          const confirmadoPorId = (p as any).confirmadoPorId || (p as any).confirmadoPor;
          let confirmadoPorName = (p as any).confirmadoPorNome;
          // prefer current session user when ids match (show raw session name, no Prof. prefix)
          if (confirmadoPorId && currentUser && confirmadoPorId === currentUser.id) {
            confirmadoPorName = currentUser.name;
          } else if (!confirmadoPorName && confirmadoPorId) {
            // if id maps to a professor from adminUsersService, present normalized professor name
            if (userMap[confirmadoPorId]) confirmadoPorName = userMap[confirmadoPorId];
            else confirmadoPorName = undefined;
          }
          if (!confirmadoPorName) confirmadoPorName = 'Usuário não disponível';

          const competenciaVal = formatCompetencia(m ? m.competencia : (p as any).competencia ?? '');
          const alunoNomeVal = aluno ? aluno.nome : (p as any).alunoNome ?? '—';
          return {
            id: p.id,
            alunoNome: alunoNomeVal,
            competencia: competenciaVal,
            formaPagamento: p.formaPagamento,
            confirmadoPorNome: confirmadoPorName,
            confirmadoEm: (p as any).confirmadoEm,
            valor: p.valor,
          } as PagamentoAluno;
        });
        setConfirmadosRecentes(recent as any);
      } catch (err) {
        console.error('Erro ao carregar fila de confirmações:', err);
      }
    })();

    return () => { active = false; };
  }, []);

  return (
    <div id="confirmations-list-view" className="space-y-4 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-base font-black text-white leading-tight tracking-tight">
          Pagamentos para Confirmar
        </h2>
        <p className="text-xs text-zinc-400">
          Confirme o recebimento informado pelo professor.
        </p>
      </div>

      {/* Fila de Pagamentos Pendentes */}
      {pagamentosPendentes.length === 0 ? (
        <div className="p-8 text-center bg-[#1a1a1c] rounded-2xl border border-white/10 space-y-2 text-white">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-white">
            Tudo em dia!
          </p>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Nenhum pagamento informado aguarda conferência no momento.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pagamentosPendentes.map((pag) => (
            <div
              key={pag.id}
              id={`confirm-card-${pag.id}`}
              className="p-4 rounded-2xl bg-[#18181b] border border-white/15 shadow-xl shadow-black/40 space-y-3 text-white"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                        pag.formaPagamento === 'PIX'
                          ? 'bg-lime-400/15 text-lime-300 border border-lime-400/30'
                          : 'bg-white/10 text-zinc-300 border border-white/10'
                      }`}
                    >
                      {pag.formaPagamento === 'PIX' ? (
                        <QrCode className="w-3.5 h-3.5" />
                      ) : (
                        <Banknote className="w-3.5 h-3.5" />
                      )}
                      <span>{pag.formaPagamento}</span>
                    </span>
                    <span className="text-xs font-bold text-zinc-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                      {pag.competencia}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-1.5 leading-tight">
                    {pag.alunoNome}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Informado por <strong className="text-zinc-200">{formatProfessorPresentation(pag.informadoPorNome)}</strong> em {formatDateTimeBR(pag.informadoEm)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-lg font-black text-lime-400 block">
                    {formatCurrency(pag.valor)}
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wide">
                    Aguardando
                  </span>
                </div>
              </div>

              {pag.observacao && (
                <div className="text-xs p-2.5 rounded-xl bg-black/40 border border-white/10 text-zinc-300 italic">
                  "{pag.observacao}"
                </div>
              )}

              {/* Botões de Ação */}
              <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                <button
                  type="button"
                  id={`btn-acao-conferir-${pag.id}`}
                  onClick={() => onOpenConfirmModal(pag)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#D4FF00] to-[#16A34A] hover:brightness-105 text-black font-black text-xs shadow-lg shadow-lime-500/20 transition-all active:scale-98"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Conferir & Confirmar Recebimento</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Histórico Recente de Pagamentos Confirmados */}
      <div className="pt-4 space-y-2">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Últimas Confirmações Realizadas
        </h3>
        <div className="bg-[#1a1a1c] rounded-2xl border border-white/10 overflow-hidden shadow-md shadow-black/20 divide-y divide-white/5">
          {confirmadosRecentes.map((p) => (
            <div key={p.id} className="p-3 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-white">{p.alunoNome}</p>
                <p className="text-[11px] text-zinc-400">
                  {p.competencia} ({p.formaPagamento}) • Confirmado por {p.confirmadoPorNome}
                </p>
              </div>
              <div className="text-right">
                <span className="font-bold text-emerald-400 block">
                  {formatCurrency(p.valor)}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {p.confirmadoEm ? formatDateTimeBR(p.confirmadoEm) : '-'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
