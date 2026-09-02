import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Line, Paginated } from '../lib/types';
import { formatDateTime } from '../lib/format';
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

function LineForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/lines', { code, name, description: description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lines'] });
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
        <label className="label" htmlFor="line-code">
          Código
        </label>
        <input
          id="line-code"
          className="input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="L001"
          maxLength={20}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="line-name">
          Nome
        </label>
        <input
          id="line-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Linha Centro-Bairro"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="line-description">
          Descrição (opcional)
        </label>
        <textarea
          id="line-description"
          className="input min-h-[70px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
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
          {mutation.isPending ? 'Salvando…' : 'Cadastrar linha'}
        </button>
      </div>
    </form>
  );
}

export function LinesRegistry() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);

  const lines = useQuery({
    queryKey: ['lines', { page }],
    queryFn: () => api.get<Paginated<Line>>('/lines', { page, pageSize: 20 }),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/lines/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lines'] }),
  });

  const rows = lines.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Linhas"
        description="Cadastro central das linhas de transporte público."
        actions={
          can('admin', 'operator') && (
            <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
              Nova linha
            </button>
          )
        }
      />

      <Card>
        <CardHeader title="Linhas cadastradas" action={<Badge tone="info">{rows.length}</Badge>} />
        {lines.isLoading && <Spinner />}
        {lines.isError && <ErrorState error={lines.error} onRetry={() => lines.refetch()} />}
        {lines.data && rows.length === 0 && <EmptyState title="Nenhuma linha cadastrada" />}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-head">Código</th>
                  <th className="table-head">Nome</th>
                  <th className="table-head">Descrição</th>
                  <th className="table-head">Situação</th>
                  <th className="table-head">Criada em</th>
                  {can('admin') && <th className="table-head">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((line) => (
                  <tr key={line.id}>
                    <td className="table-cell font-medium text-slate-800">{line.code}</td>
                    <td className="table-cell">{line.name}</td>
                    <td className="table-cell max-w-xs truncate">{line.description ?? '—'}</td>
                    <td className="table-cell">
                      <Badge tone={line.active ? 'success' : 'neutral'}>
                        {line.active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </td>
                    <td className="table-cell">{formatDateTime(line.created_at)}</td>
                    {can('admin') && (
                      <td className="table-cell">
                        {line.active && (
                          <button
                            type="button"
                            className="btn-danger px-2 py-1 text-xs"
                            onClick={() => deactivate.mutate(line.id)}
                            disabled={deactivate.isPending}
                          >
                            Desativar
                          </button>
                        )}
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
        <Modal title="Nova linha" onClose={() => setShowForm(false)}>
          <LineForm onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </>
  );
}
