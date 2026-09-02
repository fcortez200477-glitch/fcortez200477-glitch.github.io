import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { CongestionRow, Incident, Kpis, PunctualityRow } from '../lib/types';
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  INCIDENT_SEVERITY_LABEL,
  INCIDENT_TYPE_LABEL,
} from '../lib/format';
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';

function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'danger' | 'success';
}) {
  const valueClass =
    tone === 'danger' ? 'text-red-600' : tone === 'success' ? 'text-emerald-600' : 'text-brand-ink';
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 font-display text-3xl font-bold ${valueClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Overview() {
  const kpis = useQuery({
    queryKey: ['overview', 'kpis'],
    queryFn: () => api.get<Kpis>('/overview/kpis'),
    refetchInterval: 60_000,
  });

  const recentIncidents = useQuery({
    queryKey: ['incidents', { page: 1, pageSize: 5, status: 'open' }],
    queryFn: () =>
      api.get<{ data: Incident[] }>('/incidents', { page: 1, pageSize: 5, status: 'open' }),
  });

  const punctuality = useQuery({
    queryKey: ['reports', 'punctuality'],
    queryFn: () => api.get<{ data: PunctualityRow[] }>('/reports/punctuality'),
  });

  const congestion = useQuery({
    queryKey: ['reports', 'congestion'],
    queryFn: () => api.get<{ data: CongestionRow[] }>('/reports/congestion'),
  });

  return (
    <>
      <PageHeader
        title="Visão geral"
        description={
          kpis.data
            ? `Indicadores atualizados em ${formatDateTime(kpis.data.generatedAt)}`
            : 'Indicadores de desempenho da mobilidade urbana'
        }
        actions={
          <button type="button" className="btn-secondary" onClick={() => kpis.refetch()}>
            Atualizar
          </button>
        }
      />

      {kpis.isLoading && <Spinner />}
      {kpis.isError && <ErrorState error={kpis.error} onRetry={() => kpis.refetch()} />}

      {kpis.data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Veículos ativos"
            value={formatNumber(kpis.data.fleet.active_vehicles)}
            hint={`${formatNumber(kpis.data.fleet.total_vehicles)} na frota · ${formatNumber(
              kpis.data.fleet.vehicles_in_maintenance,
            )} em manutenção`}
          />
          <KpiCard
            label="Incidentes abertos"
            value={formatNumber(kpis.data.incidents.open_incidents)}
            hint={`${formatNumber(kpis.data.incidents.resolved_last_24h)} resolvidos nas últimas 24h`}
            tone={Number(kpis.data.incidents.critical_open) > 0 ? 'danger' : 'default'}
          />
          <KpiCard
            label="Pontualidade média"
            value={formatPercent(kpis.data.punctuality.avg_punctuality_percent)}
            hint="Viagens concluídas com atraso de até 5 min"
            tone={Number(kpis.data.punctuality.avg_punctuality_percent) >= 85 ? 'success' : 'default'}
          />
          <KpiCard
            label="Velocidade média nas vias"
            value={
              kpis.data.traffic.avg_speed_kmh
                ? `${formatNumber(kpis.data.traffic.avg_speed_kmh, 1)} km/h`
                : '—'
            }
            hint="Média dos sensores nas últimas 24h"
          />
        </div>
      )}

      {kpis.data && Number(kpis.data.incidents.critical_open) > 0 && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>{formatNumber(kpis.data.incidents.critical_open)}</strong> incidente(s) de
          severidade crítica em aberto.{' '}
          <Link to="/incidentes" className="font-medium underline">
            Ver incidentes
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Incidentes abertos"
            action={
              <Link to="/incidentes" className="text-sm font-medium text-brand-cyanText">
                Ver todos
              </Link>
            }
          />
          {recentIncidents.isLoading && <Spinner />}
          {recentIncidents.isError && <ErrorState error={recentIncidents.error} />}
          {recentIncidents.data?.data.length === 0 && (
            <EmptyState title="Nenhum incidente aberto" description="A malha viária está sem ocorrências ativas." />
          )}
          {recentIncidents.data && recentIncidents.data.data.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {recentIncidents.data.data.map((incident) => (
                <li key={incident.id} className="flex items-start justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {INCIDENT_TYPE_LABEL[incident.type]}
                      {incident.road_name ? ` · ${incident.road_name}` : ''}
                    </p>
                    <p className="truncate text-xs text-slate-500">{incident.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge
                      tone={
                        incident.severity === 'critical'
                          ? 'danger'
                          : incident.severity === 'high'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {INCIDENT_SEVERITY_LABEL[incident.severity]}
                    </Badge>
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(incident.reported_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Linhas com menor pontualidade"
            action={
              <Link to="/relatorios" className="text-sm font-medium text-brand-cyanText">
                Relatórios
              </Link>
            }
          />
          {punctuality.isLoading && <Spinner />}
          {punctuality.isError && <ErrorState error={punctuality.error} />}
          {punctuality.data?.data.length === 0 && (
            <EmptyState title="Sem viagens concluídas" description="Ainda não há dados de pontualidade." />
          )}
          {punctuality.data && punctuality.data.data.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {punctuality.data.data.slice(0, 5).map((row) => (
                <li key={row.line_id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {row.line_code} · {row.line_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatNumber(row.trips_completed)} viagens concluídas
                    </p>
                  </div>
                  <span className="font-display text-lg font-semibold text-brand-ink">
                    {formatPercent(row.punctuality_percent)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Vias mais lentas (24h)" />
        {congestion.isLoading && <Spinner />}
        {congestion.isError && <ErrorState error={congestion.error} />}
        {congestion.data?.data.length === 0 && (
          <EmptyState title="Nenhum sensor cadastrado" description="Cadastre sensores no módulo de tráfego." />
        )}
        {congestion.data && congestion.data.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-head">Via</th>
                  <th className="table-head">Sensor</th>
                  <th className="table-head">Velocidade média</th>
                  <th className="table-head">Ocupação</th>
                  <th className="table-head">Leituras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {congestion.data.data.slice(0, 6).map((row) => (
                  <tr key={row.sensor_id}>
                    <td className="table-cell font-medium text-slate-800">{row.road_name}</td>
                    <td className="table-cell">{row.sensor_name}</td>
                    <td className="table-cell">
                      {row.avg_speed_kmh ? `${formatNumber(row.avg_speed_kmh, 1)} km/h` : '—'}
                    </td>
                    <td className="table-cell">{formatPercent(row.avg_occupancy_percent)}</td>
                    <td className="table-cell">{formatNumber(row.readings_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
