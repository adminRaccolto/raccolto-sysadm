export type RegraDiaNaoUtil = 'PROXIMO_DIA_UTIL' | 'ANTERIOR_DIA_UTIL' | 'MANTER';

export interface ParcelaPreview {
  parcelaNumero: number;
  valor: number;
  vencimento: string;
  ajustadoDiaNaoUtil: boolean;
}

export interface SimulacaoFluxoItem {
  id: string;
  descricao: string;
  contaGerencialId: string;
  tipo: 'ENTRADA' | 'SAIDA';
  valor: number;
  data: string;
}

function cloneDate(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function toDateKey(value: string | Date) {
  const date = typeof value === 'string'
    ? (value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`))
    : value;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 10);
}

export function addMonths(dateInput: string | Date, months: number) {
  const date = typeof dateInput === 'string' ? new Date(`${dateInput}T00:00:00`) : cloneDate(dateInput);
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

export function isWeekend(dateInput: string | Date) {
  const date = typeof dateInput === 'string' ? new Date(`${dateInput}T00:00:00`) : dateInput;
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function adjustBusinessDay(dateInput: string | Date, regra: RegraDiaNaoUtil) {
  const date = typeof dateInput === 'string' ? new Date(`${dateInput}T00:00:00`) : cloneDate(dateInput);
  if (regra === 'MANTER') {
    return { date, adjusted: false };
  }
  let adjusted = false;
  while (isWeekend(date)) {
    adjusted = true;
    if (regra === 'PROXIMO_DIA_UTIL') {
      date.setDate(date.getDate() + 1);
    } else {
      date.setDate(date.getDate() - 1);
    }
  }
  return { date, adjusted };
}

export function toInputDate(dateInput: string | Date) {
  const date = typeof dateInput === 'string' ? new Date(`${dateInput}T00:00:00`) : dateInput;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 10);
}

export function distribuirParcelas(total: number, quantidade: number) {
  const centavos = Math.round(total * 100);
  const base = Math.floor(centavos / quantidade);
  const resto = centavos - base * quantidade;
  return Array.from({ length: quantidade }).map((_, index) => (base + (index === quantidade - 1 ? resto : 0)) / 100);
}

export function gerarParcelas(params: {
  valorTotal: number;
  quantidadeParcelas: number;
  primeiroVencimento: string;
  intervaloMeses: number;
  regraDiaNaoUtil: RegraDiaNaoUtil;
}) {
  const valores = distribuirParcelas(params.valorTotal, params.quantidadeParcelas);
  return Array.from({ length: params.quantidadeParcelas }).map((_, index) => {
    const baseDate = addMonths(params.primeiroVencimento, index * params.intervaloMeses);
    const adjusted = adjustBusinessDay(baseDate, params.regraDiaNaoUtil);
    return {
      parcelaNumero: index + 1,
      valor: valores[index],
      vencimento: toInputDate(adjusted.date),
      ajustadoDiaNaoUtil: adjusted.adjusted,
    } satisfies ParcelaPreview;
  });
}

export function monthKey(dateInput: string | Date) {
  const date = typeof dateInput === 'string' ? new Date(`${dateInput}T00:00:00`) : dateInput;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1));
}
