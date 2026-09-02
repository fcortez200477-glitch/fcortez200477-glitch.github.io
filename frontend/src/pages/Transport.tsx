import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Marker, Polyline, Popup } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { api } from '../lib/api';
import type { Line, LiveVehicle, Paginated, RouteGeometry } from '../lib/types';
import { formatDateTime, formatNumber } from '../lib/format';
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';
import { MapView, vehicleIcon } from '../components/MapView';

const REFRESH_MS = 15_000;

export function Transport() {
  const [lineId, setLineId] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const lines = useQuery({
    queryKey: ['lines', { page: 1, pageSize: 100, active: true }],
    queryFn: () => api.get<Paginated<Line>>('/lines', { page: 1, pageSize: 100, active: true }),
  });

  // Seleciona a primeira linha assim que a lista chega.
  const selectedLineId = lineId || lines.data?.data[0]?.id || '';

  const live = useQuery({
    queryKey: ['transport', 'live', selectedLineId],
    queryFn: () => api.get<{ data: LiveVehicle[] }>(`/transport/lines/${selectedLineId}/vehicles/live`),
    enabled: Boolean(selectedLineId),
    refetchInterval: autoRefresh ? REFRESH_MS : false,
  });

  const routes = useQuery({
    queryKey: ['transport', 'routes', selectedLineId],
    queryFn: () => api.get<{ data: RouteGeometry[] }>(`/transport/lines/${selectedLineId}/routes`),
    enabled: Boolean(selectedLineId),
  });

  const vehicles = live.data?.data ?? [];

  // GeoJSON usa [lng, lat]; o Leaflet espera [lat, lng].
  const routeLines = useMemo(
    () =>
      (routes.data?.data ?? [])
        .filter((route) => route.geometry?.coordinates?.length)
        .map((route) => ({
          id: route.id,
          name: route.name,
          positions: route.geometry!.coordinates.map(
            ([lng, lat]) => [lat, lng] as LatLngExpression,
          ),
        })),
    [routes.data],
  );

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    const points: [number, number][] = [
      ...vehicles.map((v) => [v.lat, v.lng] as [number, number]),
      ...routeLines.flatMap((r) => r.positions as [number, number][]),
    ];
    return points.length > 0 ? points : null;
  }, [vehicles, routeLines]);

  const selectedLine = lines.data?.data.find((line) => line.id === selectedLineId);

  return (
    <>
      <PageHeader
        title="Monitoramento de transporte público"
        description="Posição dos veículos em tempo real sobre o traçado das rotas."
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-300"
              />
              Atualizar a cada 15s
            </label>
            <button type="button" className="btn-secondary" onClick={() => live.refetch()}>
              Atualizar agora
            </button>
          </>
        }
      />

      {lines.isLoading && <Spinner label="Carregando linhas…" />}
      {lines.isError && <ErrorState error={lines.error} onRetry={() => lines.refetch()} />}

      {lines.data && lines.data.data.length === 0 && (
        <Card>
          <EmptyState
            title="Nenhuma linha cadastrada"
            description="Cadastre uma linha em Cadastros → Linhas para começar o monitoramento."
          />
        </Card>
      )}

      {lines.data && lines.data.data.length > 0 && (
        <>
          <div className="mb-4 max-w-sm">
            <label className="label" htmlFor="line">
              Linha
            </label>
            <select
              id="line"
              className="input"
              value={selectedLineId}
              onChange={(e) => setLineId(e.target.value)}
            >
              {lines.data.data.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.code} · {line.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <MapView bounds={bounds} height={520}>
                {routeLines.map((route) => (
                  <Polyline
                    key={route.id}
                    positions={route.positions}
                    pathOptions={{ color: '#4338CA', weight: 5, opacity: 0.55 }}
                  />
                ))}
                {vehicles.map((vehicle) => (
                  <Marker key={vehicle.vehicle_id} position={[vehicle.lat, vehicle.lng]} icon={vehicleIcon()}>
                    <Popup>
                      <p className="font-semibold">{vehicle.plate}</p>
                      <p className="text-xs text-slate-600">
                        {vehicle.speed_kmh ? `${formatNumber(vehicle.speed_kmh, 1)} km/h` : 'Velocidade não informada'}
                      </p>
                      <p className="text-xs text-slate-500">{formatDateTime(vehicle.recorded_at)}</p>
                    </Popup>
                  </Marker>
                ))}
              </MapView>
              {routeLines.length === 0 && routes.data && (
                <p className="mt-2 text-xs text-slate-500">
                  Esta linha ainda não possui traçado de rota cadastrado.
                </p>
              )}
            </div>

            <Card>
              <CardHeader
                title={`Veículos em operação${selectedLine ? ` · ${selectedLine.code}` : ''}`}
                action={<Badge tone="info">{vehicles.length}</Badge>}
              />
              {live.isLoading && <Spinner />}
              {live.isError && <ErrorState error={live.error} onRetry={() => live.refetch()} />}
              {live.data && vehicles.length === 0 && (
                <EmptyState
                  title="Nenhuma posição recebida"
                  description="Os veículos desta linha ainda não enviaram telemetria."
                />
              )}
              {vehicles.length > 0 && (
                <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                  {vehicles.map((vehicle) => (
                    <li key={vehicle.vehicle_id} className="px-5 py-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">{vehicle.plate}</span>
                        <Badge tone={vehicle.status === 'active' ? 'success' : 'warning'}>
                          {vehicle.status === 'active' ? 'Ativo' : 'Manutenção'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {vehicle.speed_kmh ? `${formatNumber(vehicle.speed_kmh, 1)} km/h · ` : ''}
                        {formatDateTime(vehicle.recorded_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
