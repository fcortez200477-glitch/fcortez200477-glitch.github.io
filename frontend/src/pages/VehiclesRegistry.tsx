import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Line, Paginated, Vehicle, VehicleStatus, VehicleType } from '../lib/types';
import { formatNumber, VEHICLE_STATUS_LABEL, VEHICLE_TYPE_LABEL } from '../lib/format';
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

const STATUS_TONE: Record<VehicleStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  maintenance: 'warning',
  inactive: 'neutral',
};

function VehicleForm({ lines, onClose }: { lines: Line[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [plate, setPlate] = useState('');
  const [type, setType] = useState<VehicleType>('bus');
  const [capacity, setCapacity] = useState('0');
  const [lineId, setLineId] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/vehicles', {
        plate: plate.toUpperCase(),
        type,
        capacity: Number(capacity),
        lineId: lineId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
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
        <label className="label" htmlFor="vehicle-plate">
          Placa
        </label>
        <input
          id="vehicle-plate"
          className="input uppercase"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          placeholder="ABC1D23"
          minLength={5}
          maxLength={15}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="vehicle-type">
            Tipo
          </label>
          <select
            id="vehicle-type"
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as VehicleType)}
          >
            {Object.entries(VEHICLE_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="vehicle-capacity">
            Capacidade
          </label>
          <input
            id="vehicle-capacity"
            className="input"
            type="number"
            min={0}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="vehicle-line">
          Linha (opcional)
        </label>
        <select
          id="vehicle-line"
          className="input"
          value={lineId}
          onChange={(e) => setLineId(e.target.value)}
        >
          <option value="">Sem linha vinculada</option>
          {lines.map((line) => (
            <option key={line.id} value={line.id}>
              {line.code} · {line.name}
            </option>
          ))}
        </select>
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
          {mutation.isPending ? 'Salvando…' : 'Cadastrar veículo'}
        </button>
      </div>
    </form>
  );
}

export function VehiclesRegistry() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const vehicles = useQuery({
    queryKey: ['vehicles', { page, statusFilter }],
    queryFn: () =>
      api.get<Paginated<Vehicle>>('/vehicles', {
        page,
        pageSize: 20,
        status: statusFilter || undefined,
      }),
  });

  const lines = useQuery({
    queryKey: ['lines', { page: 1, pageSize: 100 }],
    queryFn: () => api.get<Paginated<Line>>('/lines', { page: 1, pageSize: 100 }),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VehicleStatus }) =>
      api.patch(`/vehicles/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });

  const rows = vehicles.data?.data ?? [];
  const lineById = new Map((lines.data?.data ?? []).map((line) => [line.id, line]));

  return (
    <>
      <PageHeader
        title="Veículos"
        description="Frota cadastrada e vínculo com as linhas de operação."
        actions={
          can('admin', 'operator') && (
            <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
              Novo veículo
            </button>
          )
        }
      />

      <Card className="mb-6 p-4">
        <div className="max-w-xs">
          <label className="label" htmlFor="vehicle-status-filter">
            Situação
          </label>
          <select
            id="vehicle-status-filter"
            className="input"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            {Object.entries(VEHICLE_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <CardHeader title="Frota" action={<Badge tone="info">{rows.length}</Badge>} />
        {vehicles.isLoading && <Spinner />}
        {vehicles.isError && <ErrorState error={vehicles.error} onRetry={() => vehicles.refetch()} />}
        {vehicles.data && rows.length === 0 && <EmptyState title="Nenhum veículo encontrado" />}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-head">Placa</th>
                  <th className="table-head">Tipo</th>
                  <th className="table-head">Capacidade</th>
                  <th className="table-head">Linha</th>
                  <th className="table-head">Situação</th>
                  {can('admin', 'operator') && <th className="table-head">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((vehicle) => {
                  const line = vehicle.line_id ? lineById.get(vehicle.line_id) : undefined;
                  return (
                    <tr key={vehicle.id}>
                      <td className="table-cell font-medium text-slate-800">{vehicle.plate}</td>
                      <td className="table-cell">{VEHICLE_TYPE_LABEL[vehicle.type]}</td>
                      <td className="table-cell">{formatNumber(vehicle.capacity)}</td>
                      <td className="table-cell">{line ? `${line.code} · ${line.name}` : '—'}</td>
                      <td className="table-cell">
                        <Badge tone={STATUS_TONE[vehicle.status]}>
                          {VEHICLE_STATUS_LABEL[vehicle.status]}
                        </Badge>
                      </td>
                      {can('admin', 'operator') && (
                        <td className="table-cell">
                          <div className="flex flex-wrap gap-2">
                            {vehicle.status !== 'maintenance' && (
                              <button
                                type="button"
                                className="btn-secondary px-2 py-1 text-xs"
                                onClick={() =>
                                  changeStatus.mutate({ id: vehicle.id, status: 'maintenance' })
                                }
                              >
                                Manutenção
                              </button>
                            )}
                            {vehicle.status !== 'active' && (
                              <button
                                type="button"
                                className="btn-secondary px-2 py-1 text-xs"
                                onClick={() => changeStatus.mutate({ id: vehicle.id, status: 'active' })}
                              >
                                Ativar
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
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
        <Modal title="Novo veículo" onClose={() => setShowForm(false)}>
          <VehicleForm lines={lines.data?.data ?? []} onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </>
  );
}
