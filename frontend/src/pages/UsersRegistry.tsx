import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Paginated, User, UserRole } from '../lib/types';
import { formatDateTime, USER_ROLE_LABEL } from '../lib/format';
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

function UserForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');

  const mutation = useMutation({
    // O cadastro de usuarios usa /auth/register, restrito a administradores.
    mutationFn: () => api.post('/auth/register', { name, email, password, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
        <label className="label" htmlFor="user-name">
          Nome
        </label>
        <input id="user-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="user-email">
          E-mail
        </label>
        <input
          id="user-email"
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="user-password">
          Senha provisória
        </label>
        <input
          id="user-password"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <p className="mt-1 text-xs text-slate-500">Mínimo de 8 caracteres.</p>
      </div>
      <div>
        <label className="label" htmlFor="user-role">
          Perfil de acesso
        </label>
        <select
          id="user-role"
          className="input"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
        >
          {Object.entries(USER_ROLE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
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
          {mutation.isPending ? 'Salvando…' : 'Criar usuário'}
        </button>
      </div>
    </form>
  );
}

export function UsersRegistry() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);

  const users = useQuery({
    queryKey: ['users', { page }],
    queryFn: () => api.get<Paginated<User>>('/users', { page, pageSize: 20 }),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => api.patch(`/users/${id}`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const rows = users.data?.data ?? [];

  // A listagem de usuarios e restrita a administradores no backend.
  if (currentUser?.role !== 'admin') {
    return (
      <>
        <PageHeader title="Usuários" />
        <Card>
          <EmptyState
            title="Acesso restrito"
            description="Apenas administradores podem gerenciar usuários do sistema."
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Contas de acesso e perfis de permissão da plataforma."
        actions={
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            Novo usuário
          </button>
        }
      />

      <Card>
        <CardHeader title="Usuários cadastrados" action={<Badge tone="info">{rows.length}</Badge>} />
        {users.isLoading && <Spinner />}
        {users.isError && <ErrorState error={users.error} onRetry={() => users.refetch()} />}
        {users.data && rows.length === 0 && <EmptyState title="Nenhum usuário encontrado" />}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-head">Nome</th>
                  <th className="table-head">E-mail</th>
                  <th className="table-head">Perfil</th>
                  <th className="table-head">Situação</th>
                  <th className="table-head">Criado em</th>
                  <th className="table-head">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  return (
                    <tr key={user.id}>
                      <td className="table-cell font-medium text-slate-800">
                        {user.name}
                        {isSelf && <span className="ml-2 text-xs text-slate-400">(você)</span>}
                      </td>
                      <td className="table-cell">{user.email}</td>
                      <td className="table-cell">
                        <select
                          className="input py-1 text-xs"
                          value={user.role}
                          disabled={isSelf || changeRole.isPending}
                          onChange={(e) =>
                            changeRole.mutate({ id: user.id, role: e.target.value as UserRole })
                          }
                        >
                          {Object.entries(USER_ROLE_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="table-cell">
                        <Badge tone={user.active ? 'success' : 'neutral'}>
                          {user.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="table-cell">{formatDateTime(user.created_at)}</td>
                      <td className="table-cell">
                        {user.active && !isSelf && (
                          <button
                            type="button"
                            className="btn-danger px-2 py-1 text-xs"
                            onClick={() => deactivate.mutate(user.id)}
                            disabled={deactivate.isPending}
                          >
                            Desativar
                          </button>
                        )}
                      </td>
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
        <Modal title="Novo usuário" onClose={() => setShowForm(false)}>
          <UserForm onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </>
  );
}
