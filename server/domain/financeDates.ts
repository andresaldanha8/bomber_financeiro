/**
 * Datas civis: YYYY-MM-DD ou Date cujos campos UTC representam o dia civil.
 * DATE e datas efetivas de atividade são normalizados para meia-noite UTC.
 * Não passar um instante local como Date: converter antes com dataCivilDoInstante.
 * entryDate existente (12:00 UTC) conserva o mesmo dia ao normalizar.
 * API: transmitir datas civis como YYYY-MM-DD, sem conversão de fuso.
 * A Date normalizada é apenas um recipiente de calendário, NÃO um instante.
 * NUNCA aplicar dataCivilDoInstante a essa Date: isso pode recuar um dia.
 */
export type DataCivil = string | Date;

export function normalizarDataCivil(value: DataCivil): Date {
  if (value instanceof Date && !Number.isFinite(value.getTime())) {
    throw new Error('Data civil inválida.');
  }
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Use uma data civil YYYY-MM-DD.');
  const date = new Date(`${text}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new Error('Data civil inválida.');
  }
  return date;
}

/** Apenas timestamps reais (ex.: new Date()). Nunca receber uma data civil. */
export function dataCivilDoInstante(instant: Date): Date {
  if (!Number.isFinite(instant.getTime())) throw new Error('Instante inválido.');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return normalizarDataCivil(`${part('year')}-${part('month')}-${part('day')}`);
}

export function compararDatasCivis(a: DataCivil, b: DataCivil): number {
  return Math.sign(normalizarDataCivil(a).getTime() - normalizarDataCivil(b).getTime());
}

export function obterCompetencia(date: DataCivil): Date {
  const result = normalizarDataCivil(date);
  result.setUTCDate(1);
  return result;
}

export function obterCompetenciaSeguinte(date: DataCivil): Date {
  const result = obterCompetencia(date);
  result.setUTCMonth(result.getUTCMonth() + 1);
  return normalizarDataCivil(result);
}

export function ultimoDiaDoMes(date: DataCivil): number {
  const next = obterCompetenciaSeguinte(date);
  next.setUTCDate(0);
  return next.getUTCDate();
}

export function validarDiaBase(diaBase: number): void {
  if (!Number.isInteger(diaBase) || diaBase < 1 || diaBase > 31) {
    throw new Error('Dia-base deve ser um inteiro entre 1 e 31.');
  }
}

export function calcularVencimento(competencia: DataCivil, diaBase: number): Date {
  validarDiaBase(diaBase);
  const date = obterCompetencia(competencia);
  date.setUTCDate(Math.min(diaBase, ultimoDiaDoMes(date)));
  return date;
}

export function primeiraCompetenciaAposReativacao(date: DataCivil, diaBase: number): Date {
  const competencia = obterCompetencia(date);
  return compararDatasCivis(date, calcularVencimento(competencia, diaBase)) <= 0
    ? competencia : obterCompetenciaSeguinte(competencia);
}
