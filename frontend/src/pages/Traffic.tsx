import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Marker, Popup } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import {
  CartesianGrid,
  Legend,
  Line as ChartLine,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { TrafficReading, TrafficSensor } from '../lib/types';
import { formatDateTime, formatNumber } from '../lib/format';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  Spinner,
} from '../components/ui';
import { MapView, sensorIcon } from '../components/MapView';

function NewSensorForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [roadName, setRoadName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/traffic/sensors', {
        name,
        roadName,
        position: { lat: Number(lat), lng: Number(lng) },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traffic', 'sensors'] });
      onClose();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <div>
        <label className="label" htmlFor="sensor-name">
          Nome do sensor
        </label>
        <input id="sensor-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="sensor-road">
          Via
        </label>
        <input id="sensor-road" className="input" value={roadName} onChange={(e) => setRoadName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="sensor-lat">
            Latitude
          </label>
          <input
            id="sensor-lat"
            className="input"
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="sensor-lng">
            Longitude
          </label>
          <input
            id="sensor-lng"
            className="input"
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            required
          />
        </div>
      </div>

      {mutation.isError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {mutation.error instanceof Error ? mutation.error.message : 'Erro ao salvar'}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando…' : 'Cadastrar sensor'}
        </button>
      </div>
    </form>
  );
}

export function Traffic() {
  const { can } = useAuth();
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const sensors = useQuery({
    queryKey: ['traffic', 'sensors'],
    queryFn: () => api.get<{ data: TrafficSensor[] }>('/traffic/sensors'),
  });

  const sensorId = selectedSensor ?? sensors.data?.data[0]?.id ?? null;

  const readings = useQuery({
    queryKey: ['traffic', 'readings', sensorId],
    queryFn: () =>
      api.get<{ data: TrafficReading[] }>(`/traffic/sensors/${sensorId}/readings`, { limit: 100 }),
    enabled: Boolean(sensorId),
  });

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    const points = (sensors.data?.data ?? []).map((s) => [s.lat, s.lng] as [number, number]);
    return points.length > 0 ? points : null;
  }, [sensors.data]);

  // A API devolve do mais recente para o mais antigo; o gráfico lê cronologicamente.
  const chartData = useMemo(
    () =>
      [...(readings.data?.data ?? [])].reverse().map((reading) => ({
        hora: new Date(reading.recorded_at).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        velocidade: reading.avg_speed_kmh ? Number(reading.avg_speed_kmh) : null,
        ocupacao: reading.occupancy_percent ? Number(reading.occupancy_percent) : null,
      })),
    [readings.data],
  );

  const currentSensor = sensors.data?.data.find((s) => s.id === sensorId);

  return (
    <>
      <PageHeader
        title="Controle de tráfego"
        description="Sensores de via e leituras de fluxo, velocidade e ocupação."
        actions={
          can('admin', 'operator') && (
            <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
              Novo sensor
            </button>
          )
        }
      />

      {sensors.isLoading && <Spinner />}
      {sensors.isError && <ErrorState error={sensors.error} onRetry={() => sensors.refetch()} />}

      {sensors.data && sensors.data.data.length === 0 && (
        <Card>
          <EmptyState
            title="Nenhum sensor cadastrado"
            description="Cadastre o primeiro sensor de tráfego para começar a coletar leituras."
          />
        </Card>
      )}

      {sensors.data && sensors.data.data.length > 0 && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <MapView bounds={bounds} height={380}>
              {sensors.data.data.map((sensor) => (
                <Marker
                  key={sensor.id}
                  position={[sensor.lat, sensor.lng]}
                  icon={sensorIcon(sensor.active)}
                  eventHandlers={{ click: () => setSelectedSensor(sensor.id) }}
                >
                  <Popup>
                    <p className="font-semibold">{sensor.name}</p>
                    <p className="text-xs text-slate-600">{sensor.road_name}</p>
                  </Popup>
                </Marker>
              ))}
            </MapView>

            <Card>
              <CardHeader
                title={
                  currentSensor
                    ? `Leituras · ${currentSensor.name}`
                    : 'Leituras do sensor'
                }
              />
              {readings.isLoading && <Spinner />}
              {readings.isError && <ErrorState error={readings.error} onRetry={() => readings.refetch()} />}
              {readings.data && chartData.length === 0 && (
                <EmptyState
                  title="Sem leituras registradas"
                  description="Este sensor ainda não enviou dados."
                />
              )}
              {chartData.length > 0 && (
                <div className="p-4" style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="hora" tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <ChartLine
                        type="monotone"
                        dataKey="velocidade"
                        name="Velocidade (km/h)"
                        stroke="#4338CA"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                      <ChartLine
                        type="monotone"
                        dataKey="ocupacao"
                        name="Ocupação (%)"
                        stroke="#0891B2"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Sensores"
              action={<Badge tone="info">{sensors.data.data.length}</Badge>}
            />
            <ul className="max-h-[680px] divide-y divide-slate-100 overflow-y-auto">
              {sensors.data.data.map((sensor) => (
                <li key={sensor.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedSensor(sensor.id)}
                    className={`w-full px-5 py-3 text-left transition-colors hover:bg-slate-50 ${
                      sensor.id === sensorId ? 'bg-indigo-50/60' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-slate-800">{sensor.name}</span>
                      {!sensor.active && <Badge>Inativo</Badge>}
                    </div>
                    <p className="truncate text-xs text-slate-500">{sensor.road_name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {formatNumber(sensor.lat, 4)}, {formatNumber(sensor.lng, 4)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {currentSensor && readings.data && readings.data.data.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Últimas leituras" />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-head">Momento</th>
                  <th className="table-head">Veículos</th>
                  <th className="table-head">Velocidade média</th>
                  <th className="table-head">Ocupação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {readings.data.data.slice(0, 10).map((reading) => (
                  <tr key={reading.recorded_at}>
                    <td className="table-cell">{formatDateTime(reading.recorded_at)}</td>
                    <td className="table-cell">{formatNumber(reading.vehicle_count)}</td>
                    <td className="table-cell">
                      {reading.avg_speed_kmh ? `${formatNumber(reading.avg_speed_kmh, 1)} km/h` : '—'}
                    </td>
                    <td className="table-cell">
                      {reading.occupancy_percent ? `${formatNumber(reading.occupancy_percent, 1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showForm && (
        <Modal title="Novo sensor de tráfego" onClose={() => setShowForm(false)}>
          <NewSensorForm onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </>
  );
}
