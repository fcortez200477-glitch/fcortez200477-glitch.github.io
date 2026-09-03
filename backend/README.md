<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/brand/moblytix-logo-dark.svg">
    <img src="./assets/brand/moblytix-logo.svg" alt="Moblytix" width="380">
  </picture>
</p>

# Moblytix — Backend de Mobilidade Urbana

Backend de API para gestão de **mobilidade urbana**, construído em **Node.js + TypeScript + Express**,
com **PostgreSQL + PostGIS** para armazenamento e consulta de dados espaciais (posições de veículos,
sensores de tráfego, incidentes, traçados de rotas).

## Módulos

| Módulo | Rotas base | Descrição |
|---|---|---|
| Visão Geral | `GET /overview/kpis` | Indicadores agregados de frota, incidentes, pontualidade e tráfego |
| Monitoramento de Transporte Público | `/transport/*` | Posições em tempo real, histórico e traçado (GeoJSON) das rotas |
| Controle de Tráfego | `/traffic/*` | Cadastro de sensores e ingestão/consulta de leituras (contagem, velocidade, ocupação) |
| Gestão de Incidentes | `/incidents/*` | CRUD de incidentes geolocalizados (acidente, obra, alagamento, etc.) |
| Cadastros Centrais | `/lines/*`, `/vehicles/*`, `/users/*` | Linhas, veículos e usuários |
| Relatórios Urbanos | `/reports/*` | Pontualidade por linha e lentidão/congestionamento por sensor |
| Documentação de APIs | `/api/docs` | Swagger UI (OpenAPI 3) gerado a partir do código |

Todas as rotas de negócio ficam sob o prefixo configurável `API_PREFIX` (padrão `/api/v1`).

## Arquitetura

```
src/
  config/        # env (validado com zod) e logger estruturado (pino)
  db/            # pool pg, migrations (node-pg-migrate) e seed
  middlewares/   # auth (JWT/RBAC), validação (zod), rate limit, tratamento de erros
  modules/       # um diretório por módulo de domínio (controller + schemas + service)
  docs/          # geração do OpenAPI (swagger-jsdoc) a partir de comentários @openapi
  utils/         # helpers (HttpError, asyncHandler, geo/PostGIS, paginação)
  app.ts         # composição do Express app (sem side-effects de rede)
  server.ts      # bootstrap: conexão com DB + start do HTTP server + graceful shutdown
```

Padrão por módulo: `*.schemas.ts` (validação de entrada com zod) → `*.controller.ts` (rotas Express,
com anotações `@openapi` para a documentação) → `*.service.ts` quando há regra de negócio isolada
(ex.: `auth`). Toda a persistência usa **SQL parametrizado** via `pg` (sem ORM), com PostGIS acessado
através de funções nativas (`ST_GeomFromEWKT`, `ST_DWithin`, `ST_Distance`, `ST_AsGeoJSON`, etc.).

## Segurança

- **Autenticação JWT** (`Authorization: Bearer <token>`), com expiração configurável.
- **RBAC** por papel (`admin`, `operator`, `analyst`, `viewer`) aplicado por rota via middleware `authorize(...)`.
- **Chave de dispositivo** (`X-Device-Key`) como alternativa ao JWT para ingestão automatizada de
  sensores/rastreadores, sem expor credenciais de usuário.
- **Validação estrita de entrada** com `zod` em body/query/params — falha fecha (400) para payloads inesperados.
- **SQL parametrizado** em 100% das queries (proteção contra SQL injection); nomes de coluna usados em
  updates dinâmicos vêm de listas fixas de campos permitidos pelo schema zod, nunca do payload bruto.
- **Helmet** (cabeçalhos HTTP seguros), **CORS** restrito por `CORS_ORIGIN`, **rate limiting** global e
  reforçado em `/auth/login`.
- Senhas com **bcrypt** (custo configurável via `BCRYPT_SALT_ROUNDS`).
- Segredos e credenciais somente via variáveis de ambiente (`.env`, nunca commitado).

## Escalabilidade

- API **stateless** (estado de sessão vive apenas no JWT) — permite escalonamento horizontal atrás de
  um load balancer sem sticky sessions.
- **Pool de conexões** PostgreSQL configurável (`DB_POOL_MAX`), com timeouts de idle.
- **Índices GIST** em todas as colunas geométricas (`vehicle_positions`, `routes`, `stops`,
  `traffic_sensors`, `incidents`) para consultas espaciais (`ST_DWithin`, proximidade) performáticas em escala.
- Séries temporais de alto volume (`vehicle_positions`, `traffic_readings`) isoladas em tabelas próprias
  com índice composto `(entidade_id, recorded_at)` — candidatas naturais a particionamento por tempo
  (`pg_partman`/partição declarativa) quando o volume justificar.
- **Views** (`vw_line_punctuality`, `vw_traffic_congestion_24h`) centralizam agregações de relatório;
  podem evoluir para *materialized views* com refresh agendado se o custo de leitura crescer.
- Paginação obrigatória (`page`/`pageSize`) em todas as listagens.
- Compressão HTTP (`compression`) e logging estruturado assíncrono (`pino`) de baixo overhead.
- Pronto para conteinerização (Dockerfile multi-stage + docker-compose com Postgis) e execução atrás
  de um proxy reverso/gateway de API.

## Como rodar localmente

Ao iniciar, o servidor (`npm run dev` / `npm start`) sempre aplica as migrations
pendentes e, se a base ainda estiver vazia (sem nenhum usuário), roda o seed de
dados de exemplo automaticamente — não é preciso chamar `migrate:up`/`seed` à mão
no fluxo normal.

```bash
cp .env.example .env
# edite .env com suas credenciais

cd .. && docker compose up -d db   # sobe apenas o Postgres+PostGIS (compose na raiz do repo)
cd backend
npm install
npm run dev                      # aplica migrations, semeia se necessário, sobe a API em http://localhost:3000
```

Usuário admin criado pelo seed: `admin@urbanmobility.local` / `Admin@123` (troque a senha em produção).

Documentação interativa: `http://localhost:3000/api/docs`
Especificação OpenAPI (JSON): `http://localhost:3000/api/docs.json`

### Com Docker Compose (banco + API + painel web)

O `docker-compose.yml` está na raiz do repositório e sobe os três serviços juntos
(`db`, `api` e `web` — o painel web servido por Nginx na porta 80, com proxy de `/api`
para o serviço `api`). A API já sobe com o schema em dia e a base semeada na
primeira execução:

```bash
cd ..
docker compose up -d --build
```

API em `http://localhost:3000`, painel web em `http://localhost`.

### Migrations e seed manuais

Os scripts `npm run migrate:up` / `migrate:down` / `migrate:create` e `npm run seed`
continuam disponíveis para uso manual (rollback, nova migration, popular dados de
teste sob demanda) — ver [Scripts](#scripts). Rodados manualmente fora do
bootstrap do servidor, use `docker compose exec api <script>` quando estiver em
container.

## Testes

```bash
npm test
```

## Painel web

A interface que consome esta API está em [`../frontend`](../frontend) (React + TypeScript + Vite,
com mapas Leaflet e gráficos Recharts). Suba o backend primeiro e siga o
[README do frontend](../frontend/README.md).

## Marca

Logotipo, símbolo, variantes para fundo claro/escuro, versão monocromática e exports PNG
(favicon/app icon) ficam em [`assets/brand/`](./assets/brand/), com as regras de uso, cores e
tipografia em [`assets/brand/BRAND.md`](./assets/brand/BRAND.md).

## Scripts

- `npm run dev` — desenvolvimento com hot-reload (`tsx watch`)
- `npm run build` / `npm start` — build e execução em produção
- `npm run migrate:up` / `migrate:down` / `migrate:create` — migrations (node-pg-migrate)
- `npm run seed` — popula dados de exemplo
- `npm test` — testes automatizados (vitest + supertest)
- `npm run lint` — lint do código TypeScript
