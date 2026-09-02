import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import type { CongestionRow, IncidentSummaryRow, PunctualityRow } from '../lib/types';
import {
  formatDuration,
  formatNumber,
  formatPercent,
  INCIDENT_SEVERITY_LABEL,
  INCIDENT_TYPE_LABEL,
} from '../lib/format';
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';

const CHART_HEIGHT = 300;

/** Verde acima da meta, âmbar em atenção, vermelho abaixo do aceitável. */
function punctualityColor(percent: number) {
  if (percent >= 90) return '#059669';
  if (percent >= 75) return '#D97706';
  return '#DC2626';
}

export function Reports() {
  const punctuality = useQuery({
    queryKey: ['reports', 'punctuality'],
    queryFn: () => api.get<{ data: PunctualityRow[] }>('/reports/punctuality'),
  });

  const congestion = useQuery({
    queryKey: ['reports', 'congestion'],
    queryFn: () => api.get<{ data: CongestionRow[] }>('/reports/congestion'),
  });

  const summary = useQuery({
    queryKey: ['reports', 'incidents-summary'],
    queryFn: () => api.get<{ data: IncidentSummaryRow[] }>('/reports/incidents-summary'),
  });

  const punctualityChart = (punctuality.data?.data ?? [])
    .filter((row) => row.punctuality_percent !== null)
    .map((row) => ({
      name: row.line_code,
      valor: Number(row.punctuality_percent),
    }));

  const congestionChart = (congestion.data?.data ?? [])
    .filter((row) => row.avg_speed_kmh !== null)
    .slice(0, 10)
    .map((row) => ({
      name: row.road_name.length > 18 ? `${row.road_name.slice(0, 17)}…` : row.road_name,
      valor: Number(row.avg_speed_kmh),
    }));

  return (
    <>
      <PageHeader
        title="Relatórios urbanos"
        description="Pontualidade do transporte público, lentidão nas vias e histórico de incidentes."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Pontualidade por linha (%)" />
          {punctuality.isLoading && <Spinner />}
          {punctuality.isError && <ErrorState error={punctuality.error} onRetry={() => punctuality.refetch()} />}
          {punctuality.data && punctualityChart.length === 0 && (
            <EmptyState
              title="Sem dados de pontualidade"
              description="O relatório considera apenas viagens com status concluído."
            />
          )}
          {punctualityChart.length > 0 && (
            <div className="p-4" style={{ height: CHART_HEIGHT }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={punctualityChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, 'Pontualidade']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {punctualityChart.map((entry) => (
                      <Cell key={entry.name} fill={punctualityColor(entry.valor)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Velocidade média por via — 24h (km/h)" />
          {congestion.isLoading && <Spinner />}
          {congestion.isError && <ErrorState error={congestion.error} onRetry={() => congestion.refetch()} />}
          {congestion.data && congestionChart.length === 0 && (
            <EmptyState
              title="Sem leituras de sensores"
              description="Cadastre sensores e envie leituras para gerar o relatório."
            />
          )}
          {congestionChart.length > 0 && (
            <div className="p-4" style={{ height: CHART_HEIGHT }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={congestionChart}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value} km/h`, 'Velocidade média']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
                  />
                  <Bar dataKey="valor" fill="#0891B2" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Detalhamento de pontualidade" />
        {punctuality.data && punctuality.data.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-head">Linha</th>
                  <th className="table-head">Viagens concluídas</th>
                  <th className="table-head">No horário</th>
                  <th className="table-head">Pontualidade</th>
                  <th className="table-head">Atraso médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {punctuality.data.data.map((row) => (
                  <tr key={row.line_id}>
                    <td className="table-cell font-medium text-slate-800">
                      {row.line_code} · {row.line_name}
                    </td>
                    <td className="table-cell">{formatNumber(row.trips_completed)}</td>
                    <td className="table-cell">{formatNumber(row.trips_on_time)}</td>
                    <td className="table-cell">{formatPercent(row.punctuality_percent)}</td>
                    <td className="table-cell">{formatDuration(row.avg_delay_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !punctuality.isLoading && <EmptyState title="Sem dados para exibir" />
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader title="Incidentes por tipo e severidade (30 dias)" />
        {summary.isLoading && <Spinner />}
        {summary.isError && <ErrorState error={summary.error} onRetry={() => summary.refetch()} />}
        {summary.data?.data.length === 0 && (
          <EmptyState title="Nenhum incidente nos últimos 30 dias" />
        )}
        {summary.data && summary.data.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-head">Tipo</th>
                  <th className="table-head">Severidade</th>
                  <th className="table-head">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.data.data.map((row) => (
                  <tr key={`${row.type}-${row.severity}`}>
                    <td className="table-cell font-medium text-slate-800">
                      {INCIDENT_TYPE_LABEL[row.type]}
                    </td>
                    <td className="table-cell">{INCIDENT_SEVERITY_LABEL[row.severity]}</td>
                    <td className="table-cell">{formatNumber(row.total)}</td>
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
