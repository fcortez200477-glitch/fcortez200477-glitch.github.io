import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../lib/auth';

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full">
      {/* Painel de marca — oculto em telas pequenas */}
      <div className="hidden w-1/2 flex-col justify-between bg-brand-gradient p-12 text-white lg:flex">
        <img src="/moblytix-logo-dark.svg" alt="Moblytix" className="h-12 self-start" />
        <div>
          <h1 className="max-w-md font-display text-3xl font-bold leading-tight text-white">
            Mobilidade urbana sob controle, em tempo real.
          </h1>
          <p className="mt-4 max-w-md text-indigo-50/90">
            Monitoramento de transporte público, controle de tráfego por sensores, gestão de
            incidentes e relatórios de pontualidade — em uma única plataforma.
          </p>
        </div>
        <p className="text-sm text-indigo-100/70">
          Dados espaciais em PostgreSQL/PostGIS · API documentada em OpenAPI
        </p>
      </div>

      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <img src="/moblytix-logo.svg" alt="Moblytix" className="mb-8 h-10 lg:hidden" />
          <h2 className="text-2xl font-bold">Entrar</h2>
          <p className="mt-1 text-sm text-slate-500">Acesse o painel com suas credenciais.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
