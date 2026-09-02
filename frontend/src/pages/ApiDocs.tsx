import { Card, CardHeader, PageHeader } from '../components/ui';

const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';
// A UI do Swagger e servida pelo backend fora do prefixo versionado da API.
const DOCS_URL = `${API_URL.replace(/\/api\/v\d+$/, '')}/api/docs`;

const ENDPOINT_GROUPS: { title: string; endpoints: [string, string][] }[] = [
  {
    title: 'Visão geral',
    endpoints: [['GET /overview/kpis', 'Indicadores agregados de frota, incidentes e tráfego']],
  },
  {
    title: 'Transporte público',
    endpoints: [
      ['GET /transport/lines/{id}/vehicles/live', 'Última posição dos veículos da linha'],
      ['GET /transport/lines/{id}/routes', 'Traçado das rotas em GeoJSON'],
      ['GET /transport/vehicles/nearby', 'Veículos num raio a partir de um ponto (PostGIS)'],
      ['GET /transport/vehicles/{id}/history', 'Histórico de posições do veículo'],
      ['POST /transport/positions', 'Ingestão de posição (rastreador embarcado)'],
    ],
  },
  {
    title: 'Tráfego',
    endpoints: [
      ['GET /traffic/sensors', 'Sensores cadastrados'],
      ['POST /traffic/sensors', 'Cadastra sensor geolocalizado'],
      ['GET /traffic/sensors/{id}/readings', 'Leituras históricas do sensor'],
      ['POST /traffic/readings', 'Ingestão de leitura de sensor'],
    ],
  },
  {
    title: 'Incidentes',
    endpoints: [
      ['GET /incidents', 'Lista com filtros de status, severidade e tipo'],
      ['POST /incidents', 'Registra ocorrência na via'],
      ['PATCH /incidents/{id}', 'Atualiza status/severidade'],
      ['GET /incidents/nearby', 'Incidentes abertos próximos a um ponto'],
    ],
  },
  {
    title: 'Cadastros',
    endpoints: [
      ['GET|POST /lines · PATCH|DELETE /lines/{id}', 'Linhas de transporte'],
      ['GET|POST /vehicles · PATCH|DELETE /vehicles/{id}', 'Frota de veículos'],
      ['GET /users · PATCH|DELETE /users/{id}', 'Usuários (restrito a administradores)'],
      ['POST /auth/login · POST /auth/register', 'Autenticação e criação de contas'],
    ],
  },
  {
    title: 'Relatórios urbanos',
    endpoints: [
      ['GET /reports/punctuality', 'Pontualidade por linha'],
      ['GET /reports/congestion', 'Lentidão por sensor (24h)'],
      ['GET /reports/incidents-summary', 'Incidentes por tipo e severidade (30 dias)'],
    ],
  },
];

export function ApiDocs() {
  return (
    <>
      <PageHeader
        title="Documentação da API"
        description="Especificação OpenAPI 3 interativa, servida pelo próprio backend."
        actions={
          <a href={DOCS_URL} target="_blank" rel="noreferrer" className="btn-primary">
            Abrir Swagger UI
          </a>
        }
      />

      <Card className="mb-6 p-5">
        <p className="text-sm text-slate-600">
          Todas as rotas de negócio ficam sob o prefixo <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{API_URL}</code> e
          exigem um token JWT no cabeçalho <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">Authorization: Bearer &lt;token&gt;</code>.
          Dispositivos de ingestão (sensores e rastreadores) podem autenticar com a chave de serviço{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">X-Device-Key</code>.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {ENDPOINT_GROUPS.map((group) => (
          <Card key={group.title}>
            <CardHeader title={group.title} />
            <ul className="divide-y divide-slate-100">
              {group.endpoints.map(([endpoint, description]) => (
                <li key={endpoint} className="px-5 py-3">
                  <code className="text-xs font-semibold text-brand-indigo">{endpoint}</code>
                  <p className="mt-0.5 text-sm text-slate-600">{description}</p>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
