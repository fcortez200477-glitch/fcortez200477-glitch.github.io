import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Marker, Popup } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  Paginated,
} from '../lib/types';
import {
  formatDateTime,
  INCIDENT_SEVERITY_LABEL,
  INCIDENT_STATUS_LABEL,
  INCIDENT_TYPE_LABEL,
} from '../lib/format';
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
import { incidentIcon, MapView } from '../components/MapView';

const SEVERITY_TONE: Record<IncidentSeverity, 'neutral' | 'warning' | 'danger' | 'info'> = {
  low: 'info',
  medium: 'neutral',
  high: 'warning',
  critical: 'danger',
};

const STATUS_TONE: Record<IncidentStatus, 'neutral' | 'warning' | 'success' | 'danger'> = {
  open: 'danger',
  in_progress: 'warning',
  resolved: 'success',
  cancelled: 'neutral',
};

function NewIncidentForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<IncidentType>('accident');
  const [severity, setSeverity] = useState<IncidentSeverity>('medium');
  const [description, setDescription] = useState('');
  const [roadName, setRoadName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/incidents', {
        type,
        severity,
        description,
        roadName: roadName || undefined,
        position: { lat: Number(lat), lng: Number(lng) },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="incident-type">
            Tipo
          </label>
          <select
            id="incident-type"
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as IncidentType)}
          >
            {Object.entries(INCIDENT_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="incident-severity">
            Severidade
          </label>
          <select
            id="incident-severity"
            className="input"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
          >
            {Object.entries(INCIDENT_SEVERITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="incident-description">
          Descrição
        </label>
        <textarea
          id="incident-description"
          className="input min-h-[80px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minLength={5}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="incident-road">
          Via (opcional)
        </label>
        <input
          id="incident-road"
          className="input"
          value={roadName}
          onChange={(e) => setRoadName(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="incident-lat">
            Latitude
          </label>
          <input
            id="incident-lat"
            className="input"
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="incident-lng">
            Longitude
          </label>
          <input
            id="incident-lng"
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
          {mutation.error instanceof Error ? mutation.error.message : 'Erro ao registrar'}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Registrando…' : 'Registrar incidente'}
        </button>
      </div>
    </form>
  );
}

export function Incidents() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('open');
  const [severity, setSeverity] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const incidents = useQuery({
    queryKey: ['incidents', { page, status, severity, type }],
    queryFn: () =>
      api.get<Paginated<Incident>>('/incidents', {
        page,
        pageSize: 20,
        status: status || undefined,
        severity: severity || undefined,
        type: type || undefined,
      }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: IncidentStatus }) =>
      api.patch(`/incidents/${id}`, { status: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
  });

  const rows = incidents.data?.data ?? [];

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    const points = rows.map((incident) => [incident.lat, incident.lng] as [number, number]);
    return points.length > 0 ? points : null;
  }, [rows]);

  function resetFilters() {
    setStatus('');
    setSeverity('');
    setType('');
    setPage(1);
  }

  return (
    <>
      <PageHeader
        title="Gestão de incidentes"
        description="Ocorrências na via geolocalizadas, com acompanhamento de status."
        actions={
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            Registrar incidente
          </button>
        }
      />

      <Card className="mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="filter-status">
              Status
            </label>
            <select
              id="filter-status"
              className="input"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {Object.entries(INCIDENT_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filter-severity">
              Severidade
            </label>
            <select
              id="filter-severity"
              className="input"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {Object.entries(INCIDENT_SEVERITY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filter-type">
              Tipo
            </label>
            <select
              id="filter-type"
              className="input"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {Object.entries(INCIDENT_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" className="btn-secondary w-full" onClick={resetFilters}>
              Limpar filtros
            </button>
          </div>
        </div>
      </Card>

      {rows.length > 0 && (
        <div className="mb-6">
          <MapView bounds={bounds} height={360}>
            {rows.map((incident) => (
              <Marker
                key={incident.id}
                position={[incident.lat, incident.lng]}
                icon={incidentIcon(incident.severity)}
              >
                <Popup>
                  <p className="font-semibold">{INCIDENT_TYPE_LABEL[incident.type]}</p>
                  <p className="text-xs text-slate-600">{incident.description}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {INCIDENT_SEVERITY_LABEL[incident.severity]} ·{' '}
                    {INCIDENT_STATUS_LABEL[incident.status]}
                  </p>
                </Popup>
              </Marker>
            ))}
          </MapView>
        </div>
      )}

      <Card>
        <CardHeader title="Ocorrências" action={<Badge tone="info">{rows.length}</Badge>} />
        {incidents.isLoading && <Spinner />}
        {incidents.isError && <ErrorState error={incidents.error} onRetry={() => incidents.refetch()} />}
        {incidents.data && rows.length === 0 && (
          <EmptyState title="Nenhum incidente encontrado" description="Ajuste os filtros ou registre uma nova ocorrência." />
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-head">Tipo</th>
                  <th className="table-head">Descrição</th>
                  <th className="table-head">Via</th>
                  <th className="table-head">Severidade</th>
                  <th className="table-head">Status</th>
                  <th className="table-head">Registrado em</th>
                  {can('admin', 'operator') && <th className="table-head">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((incident) => (
                  <tr key={incident.id}>
                    <td className="table-cell font-medium text-slate-800">
                      {INCIDENT_TYPE_LABEL[incident.type]}
                    </td>
                    <td className="table-cell max-w-xs truncate" title={incident.description}>
                      {incident.description}
                    </td>
                    <td className="table-cell">{incident.road_name ?? '—'}</td>
                    <td className="table-cell">
                      <Badge tone={SEVERITY_TONE[incident.severity]}>
                        {INCIDENT_SEVERITY_LABEL[incident.severity]}
                      </Badge>
                    </td>
                    <td className="table-cell">
                      <Badge tone={STATUS_TONE[incident.status]}>
                        {INCIDENT_STATUS_LABEL[incident.status]}
                      </Badge>
                    </td>
                    <td className="table-cell">{formatDateTime(incident.reported_at)}</td>
                    {can('admin', 'operator') && (
                      <td className="table-cell">
                        <div className="flex flex-wrap gap-2">
                          {incident.status === 'open' && (
                            <button
                              type="button"
                              className="btn-secondary px-2 py-1 text-xs"
                              onClick={() =>
                                updateStatus.mutate({ id: incident.id, next: 'in_progress' })
                              }
                            >
                              Atender
                            </button>
                          )}
                          {incident.status !== 'resolved' && incident.status !== 'cancelled' && (
                            <button
                              type="button"
                              className="btn-secondary px-2 py-1 text-xs"
                              onClick={() => updateStatus.mutate({ id: incident.id, next: 'resolved' })}
                            >
                              Resolver
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
          <span className="text-sm text-slate-500">Página {page}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={rows.length < 20}
            >
              Próxima
            </button>
          </div>
        </div>
      </Card>

      {showForm && (
        <Modal title="Registrar incidente" onClose={() => setShowForm(false)}>
          <NewIncidentForm onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </>
  );
}
