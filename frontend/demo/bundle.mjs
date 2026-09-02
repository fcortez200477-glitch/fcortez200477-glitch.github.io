// Empacota a build de demonstracao num unico arquivo HTML autossuficiente,
// pronto para abrir localmente, anexar num e-mail ou publicar como pagina.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEMO = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(DEMO, 'dist');
const PUBLIC = path.join(DEMO, '..', 'public');
const OUT = path.join(DEMO, 'moblytix-demo.html');

const pick = (ext) => {
  const dir = path.join(DIST, 'assets');
  const file = fs.readdirSync(dir).find((f) => f.endsWith(ext));
  if (!file) throw new Error(`nenhum arquivo ${ext} em ${dir} — rode "npm run build:demo" antes`);
  return fs.readFileSync(path.join(dir, file), 'utf8');
};

let html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const css = pick('.css');
let js = pick('.js');

// Os logos sao referenciados por caminho absoluto (/moblytix-*.svg). Num arquivo
// unico nao ha servidor para servi-los, entao viram data URI.
for (const name of ['moblytix-logo-dark.svg', 'moblytix-logo.svg', 'moblytix-mark.svg']) {
  const uri = `data:image/svg+xml;base64,${fs.readFileSync(path.join(PUBLIC, name)).toString('base64')}`;
  js = js.split(`/${name}`).join(uri);
  html = html.split(`/${name}`).join(uri);
}

const demoCss = `
:root { --demo-banner-h: 40px; }
#demo-banner {
  position: fixed; inset: 0 0 auto 0; z-index: 2000;
  display: flex; align-items: center; justify-content: center; gap: .6rem;
  height: var(--demo-banner-h); padding: 0 1rem;
  background: linear-gradient(135deg, #4338CA 0%, #06B6D4 100%);
  color: #fff; font: 500 13px/1.3 Inter, system-ui, sans-serif; text-align: center;
}
#demo-banner strong { font-weight: 600; }
#demo-banner span { opacity: .85; }
#root { padding-top: var(--demo-banner-h); height: 100%; box-sizing: border-box; }
/* Sem tiles do OpenStreetMap: uma malha discreta mantem a leitura de mapa. */
.leaflet-container {
  background-color: #E7EAF0;
  background-image:
    linear-gradient(rgba(148,163,184,.35) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148,163,184,.35) 1px, transparent 1px);
  background-size: 48px 48px, 48px 48px;
}
.leaflet-control-attribution { display: none; }
`;

const banner =
  '<div id="demo-banner">' +
  '<strong>Moblytix — demonstração</strong>' +
  '<span>dados capturados de uma execução real da API; o mapa aparece sem base ' +
  'cartográfica porque tiles externos não carregam aqui</span>' +
  '</div>';

// Mantem apenas o conteudo do body: quem publica injeta doctype/head/body.
let body = /<body[^>]*>([\s\S]*?)<\/body>/.exec(html)[1];
body = body.replace(/<script[^>]*src=[^>]*><\/script>/g, '').replace(/<link[^>]*stylesheet[^>]*>/g, '');

const page = [
  '<title>Moblytix</title>',
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600' +
    '&family=Poppins:wght@600;700&display=swap" rel="stylesheet">',
  `<style>${css}</style>`,
  `<style>${demoCss}</style>`,
  banner,
  body.trim(),
  `<script type="module">${js}</script>`,
].join('\n');

fs.writeFileSync(OUT, page);
console.log(`gerado: ${OUT} (${Math.round(page.length / 1024)} kB)`);
