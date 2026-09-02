# Moblytix — Guia de Marca

## Conceito

O símbolo combina os dois lados do nome: uma **rota ascendente** que se lê ao mesmo tempo como
traçado de percurso (**Mob**ilidade) e como linha de tendência de um gráfico (ana**lytix**), com
pontos de dados ao longo do caminho (pings de GPS/leituras de sensores) e um **pino de mapa** no
ponto final — a posição monitorada em tempo real.

## Arquivos

| Arquivo | Uso |
|---|---|
| `moblytix-logo.svg` | Lockup horizontal — fundos claros (uso principal) |
| `moblytix-logo-dark.svg` | Lockup horizontal — fundos escuros |
| `moblytix-mark.svg` | Símbolo isolado — favicon, app icon, avatar |
| `moblytix-mark-mono.svg` | Símbolo em cor única (herda `currentColor`) — carimbos, impressão 1 cor, marca d'água |
| `moblytix-wordmark.svg` | Apenas o wordmark, sem símbolo |
| `moblytix-mark-512.png` | Símbolo em PNG 512×512 (transparente) |
| `moblytix-icon-180.png` | Apple touch icon 180×180 |
| `moblytix-favicon-32.png` | Favicon 32×32 |
| `moblytix-logo-1200.png` | Lockup em PNG 1200px (redes sociais, apresentações) |

Prefira sempre os **SVGs**: são vetoriais, leves e não dependem de fontes instaladas.

## Cores

| Papel | Hex |
|---|---|
| Índigo (início do gradiente) | `#4338CA` |
| Ciano (fim do gradiente) | `#06B6D4` |
| Tinta / wordmark "Mob" | `#1E1B4B` |
| Ciano do wordmark "lytix" (fundo claro) | `#0891B2` |
| Ciano do wordmark "lytix" (fundo escuro) | `#22D3EE` |

O gradiente do símbolo corre na diagonal (canto superior esquerdo → inferior direito).

## Tipografia

Wordmark em **Poppins Bold**, já **convertido em curvas** nos SVGs — por isso renderiza idêntico em
qualquer ambiente, sem precisar da fonte instalada. Para textos de apoio na interface, Poppins
(títulos) e Inter ou a fonte de sistema (corpo) combinam bem com a marca.

## Uso

- **Área de respiro**: mantenha ao redor do logo uma margem livre equivalente ao raio do canto do
  símbolo (≈ 23% da altura do símbolo).
- **Tamanho mínimo**: lockup a partir de 24px de altura; símbolo isolado a partir de 16px.
- Em fundos escuros use `moblytix-logo-dark.svg`; em fundos coloridos ou fotográficos, use o
  símbolo sobre uma área sólida ou o `moblytix-mark-mono.svg` em branco.
- **Não faça**: distorcer proporções, trocar as cores do gradiente, aplicar sombras, contornar o
  wordmark ou reordenar símbolo e wordmark.

## Regeneração dos arquivos

Os SVGs foram gerados por script a partir da fonte Poppins Bold (wordmark vetorizado com
`opentype.js`) e os PNGs exportados por rasterização headless dos SVGs. Para alterar a marca,
edite os SVGs diretamente — eles são a fonte da verdade e não têm dependências externas.
