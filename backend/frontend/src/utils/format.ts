export function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

export function formatCurrency(value?: number | null) {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function labelize(value?: string | null) {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function maskCpfCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function maskPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskCurrencyInputBRL(value: string) {
  const digits = onlyDigits(value);
  if (!digits) return '';
  const amount = Number(digits) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

export function parseCurrencyInputBRL(value?: string | null) {
  if (!value) return undefined;
  const normalized = value.replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toDateInputValue(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function nomeAtribuido(tarefa: { atribuicaoTipo: string; responsavelUsuario?: { nome: string } | null; responsavelCliente?: { razaoSocial: string } | null; }) {
  if (tarefa.atribuicaoTipo === 'CLIENTE') return tarefa.responsavelCliente?.razaoSocial || 'Cliente não informado';
  return tarefa.responsavelUsuario?.nome || 'Analista não informado';
}
