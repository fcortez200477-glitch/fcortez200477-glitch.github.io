import type {
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  UserRole,
  VehicleStatus,
  VehicleType,
} from './types';

export const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateTime.format(date);
}

export function formatNumber(value: string | number | null | undefined, digits = 0) {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatPercent(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(num) ? '—' : `${num.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

/** Segundos -> "3 min 20 s" (usado no atraso medio de viagens). */
export function formatDuration(seconds: string | number | null | undefined) {
  if (seconds === null || seconds === undefined || seconds === '') return '—';
  const total = Math.round(typeof seconds === 'string' ? Number(seconds) : seconds);
  if (Number.isNaN(total)) return '—';
  const sign = total < 0 ? '-' : '';
  const abs = Math.abs(total);
  const min = Math.floor(abs / 60);
  const sec = abs % 60;
  return min > 0 ? `${sign}${min} min ${sec}s` : `${sign}${sec}s`;
}

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  bus: 'Ônibus',
  brt: 'BRT',
  van: 'Van',
  metro: 'Metrô',
  tram: 'VLT',
};

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  active: 'Ativo',
  maintenance: 'Manutenção',
  inactive: 'Inativo',
};

export const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = {
  accident: 'Acidente',
  congestion: 'Congestionamento',
  roadwork: 'Obra na via',
  flooding: 'Alagamento',
  vehicle_breakdown: 'Veículo quebrado',
  obstruction: 'Obstrução',
  other: 'Outro',
};

export const INCIDENT_SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  resolved: 'Resolvido',
  cancelled: 'Cancelado',
};

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  operator: 'Operador',
  analyst: 'Analista',
  viewer: 'Consulta',
};
