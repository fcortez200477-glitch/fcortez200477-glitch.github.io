<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/moblytix-logo-dark.svg">
    <img src="./public/moblytix-logo.svg" alt="Moblytix" width="380">
  </picture>
</p>

# Moblytix — Painel Web

Interface web do Moblytix, construída em **React + TypeScript + Vite**, consumindo a
[API Moblytix](../backend). Mapas com **Leaflet/PostGIS**, gráficos com **Recharts** e
estilo com **Tailwind CSS**.

## Telas

| Tela | Rota | O que faz |
|---|---|---|
| Login | `/login` | Autenticação JWT contra `POST /auth/login` |
| Visão geral | `/` | KPIs de frota, incidentes, pontualidade e tráfego + alertas críticos |
| Transporte público | `/transporte` | Mapa com posição dos veículos em tempo real e traçado das rotas (GeoJSON) |
| Tráfego | `/trafego` | Mapa de sensores, série temporal de velocidade/ocupação e cadastro de sensores |
| Incidentes | `/incidentes` | Mapa + tabela com filtros, registro de ocorrência e mudança de status |
| Linhas | `/cadastros/linhas` | CRUD de linhas |
| Veículos | `/cadastros/veiculos` | CRUD da frota e vínculo com linhas |
| Usuários | `/cadastros/usuarios` | Contas e perfis de acesso (restrito a administradores) |
| Relatórios urbanos | `/relatorios` | Pontualidade por linha, lentidão por via e incidentes por tipo |
| Documentação da API | `/documentacao` | Índice dos endpoints e atalho para o Swagger UI |

## Arquitetura

```
src/
  lib/
    api.ts        # cliente HTTP: injeta o JWT, normaliza erros, dispara logout em 401
    auth.tsx      # AuthProvider + useAuth (sessão, papel do usuário, permissões)
    types.ts      # contratos de dados espelhando as respostas da API
    format.ts     # formatação pt-BR e rótulos dos enums de domínio
  components/
    Layout.tsx    # navegação lateral, cabeçalho móvel e sessão
    MapView.tsx   # wrapper do Leaflet com reenquadramento e marcadores por CSS
    ui.tsx        # Card, Badge, Modal, PageHeader, estados de carga/erro/vazio
  pages/          # uma tela por módulo do backend
```

Estado do servidor é gerenciado por **TanStack Query** (cache, revalidação e polling —
o monitoramento de transporte atualiza a cada 15s). O controle de acesso da interface
espelha o RBAC do backend: `can('admin', 'operator')` esconde ações que a API recusaria.

## Como rodar

```bash
cp .env.example .env
npm install
npm run dev        # http://localhost:5173
```

Em desenvolvimento o Vite faz proxy de `/api` para `VITE_PROXY_TARGET`
(padrão `http://localhost:3000`), então o backend pode rodar sem configuração de CORS.
Suba o backend antes (veja [`../backend/README.md`](../backend/README.md)) e entre com o
usuário criado pelo seed: `admin@urbanmobility.local` / `Admin@123`.

> A rota de documentação é `/documentacao`, e não `/api/...`: qualquer caminho iniciado
> por `/api` seria capturado pelo proxy e nunca chegaria ao roteador do SPA.

## Build de produção

```bash
npm run build      # gera dist/
npm run preview    # serve o build localmente
```

O build separa `react`, `charts` (Recharts) e `map` (Leaflet) em chunks próprios, para que
as dependências pesadas fiquem em cache entre deploys e não atrasem o primeiro render.

Em produção, aponte `VITE_API_URL` para a URL pública da API (ex.: `https://api.seudominio.com/api/v1`)
e garanta que essa origem esteja liberada no `CORS_ORIGIN` do backend. Por ser um SPA com
rotas no cliente, o servidor estático precisa redirecionar todas as rotas para `index.html`.

## Mapas

A base cartográfica padrão é o **OpenStreetMap** — gratuito, sem chave de API e sem
cadastro. Se as ruas não aparecerem (rede corporativa, proxy, firewall), a interface
avisa em vez de mostrar um retângulo vazio.

Para trocar de provedor, basta configurar duas variáveis — nenhuma mudança de código:

```bash
VITE_MAP_TILE_URL=https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png
VITE_MAP_ATTRIBUTION=&copy; OpenStreetMap, &copy; CARTO
```

Alternativas gratuitas comuns: **CARTO** (visual claro, combina com a interface),
**MapTiler** e **Stadia** (exigem chave, têm plano gratuito) ou um servidor de tiles
próprio. A política de uso do OpenStreetMap pede atribuição visível e desaconselha
volume alto de requisições — para produção com muitos usuários, prefira um provedor
dedicado ou hospede seus próprios tiles.

## Demonstração sem backend

Para apresentações a clientes ou avaliação da interface, existe uma build que gera a
aplicação navegável num **único arquivo HTML**, sem precisar de API nem banco:

```bash
npm run demo:tiles    # opcional, uma vez: baixa e embute a base cartográfica
npm run build:demo    # gera demo/moblytix-demo.html
```

O passo `demo:tiles` existe porque páginas publicadas normalmente **bloqueiam imagens
de outros domínios** — sem ele o mapa da demonstração fica só com uma malha de
referência (marcadores e rotas continuam nas posições corretas). O script baixa apenas
os tiles da área coberta pelos dados, com intervalo entre requisições, e os embute como
data URI. Precisa de acesso à internet e roda uma única vez.

O arquivo pode ser aberto direto no navegador, anexado num e-mail ou hospedado em
qualquer lugar. O código da aplicação não muda — [`demo/vite.demo.config.ts`](./demo/vite.demo.config.ts)
apenas troca, **nesta build**, três coisas: a camada de API pelo mock em
[`demo/mock-api.ts`](./demo/mock-api.ts), o `BrowserRouter` por `HashRouter` (hospedagem
estática não reescreve rotas) e remove a camada de tiles (páginas publicadas costumam
bloquear imagens externas; o mapa fica com uma malha e mantém rotas e marcadores).

As respostas em [`demo/data.json`](./demo/data.json) foram capturadas de uma execução real
da API sobre PostgreSQL/PostGIS, então os números são coerentes entre si. As escritas
(cadastros, mudança de status) funcionam em memória e voltam ao estado inicial ao recarregar.

## Scripts

- `npm run dev` — servidor de desenvolvimento com HMR
- `npm run build` — typecheck + build de produção
- `npm run build:demo` — gera a demonstração em arquivo único (`demo/moblytix-demo.html`)
- `npm run demo:tiles` — baixa e embute a base cartográfica usada pela demonstração
- `npm run preview` — serve o build gerado
- `npm run typecheck` — apenas a verificação de tipos
