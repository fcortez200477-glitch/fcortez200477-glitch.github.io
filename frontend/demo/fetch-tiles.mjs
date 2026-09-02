// Baixa a base cartografica da area coberta pelos dados da demonstracao e a
// embute como data URI. Necessario porque paginas publicadas costumam bloquear
// imagens externas — sem isso o mapa da demo fica sem ruas.
//
// Uso:  npm run demo:tiles     (precisa de acesso a internet, roda uma vez)
//
// Cada tile vira um ImageOverlay com os limites geograficos exatos, entao nao
// e preciso costurar imagens nem depender de biblioteca grafica.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEMO = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DEMO, 'tiles.json');

const TILE_URL = process.env.DEMO_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  process.env.DEMO_TILE_ATTRIBUTION ??
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const MAX_TILES = Number(process.env.DEMO_MAX_TILES ?? 40);
const PADDING = 0.012; // graus de folga ao redor dos dados

const lonToX = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const latToY = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};
const xToLon = (x, z) => (x / 2 ** z) * 360 - 180;
const yToLat = (y, z) => {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

/** Coordenadas presentes nos dados da demo: incidentes, sensores, veiculos e rotas. */
function collectPoints() {
  const data = JSON.parse(fs.readFileSync(path.join(DEMO, 'data.json'), 'utf8'));
  const points = [];
  const push = (lat, lng) => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) points.push([lat, lng]);
  };

  for (const row of data.incidents_all?.data ?? []) push(row.lat, row.lng);
  for (const row of data.sensors?.data ?? []) push(row.lat, row.lng);
  for (const key of ['live_l1', 'live_l2']) {
    for (const row of data[key]?.data ?? []) push(row.lat, row.lng);
  }
  for (const key of ['routes_l1', 'routes_l2']) {
    for (const route of data[key]?.data ?? []) {
      for (const [lng, lat] of route.geometry?.coordinates ?? []) push(lat, lng);
    }
  }
  return points;
}

async function main() {
  const points = collectPoints();
  if (points.length === 0) {
    console.error('Nenhuma coordenada em demo/data.json — nada a baixar.');
    process.exit(1);
  }

  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const bbox = {
    south: Math.min(...lats) - PADDING,
    north: Math.max(...lats) + PADDING,
    west: Math.min(...lngs) - PADDING,
    east: Math.max(...lngs) + PADDING,
  };

  // Maior zoom (mais detalhe) que ainda cabe no orcamento de tiles.
  let zoom = 16;
  let range;
  for (; zoom >= 10; zoom -= 1) {
    const x0 = lonToX(bbox.west, zoom);
    const x1 = lonToX(bbox.east, zoom);
    const y0 = latToY(bbox.north, zoom);
    const y1 = latToY(bbox.south, zoom);
    const count = (x1 - x0 + 1) * (y1 - y0 + 1);
    if (count <= MAX_TILES) {
      range = { x0, x1, y0, y1, count };
      break;
    }
  }
  if (!range) {
    console.error('Area grande demais para o orcamento de tiles. Aumente DEMO_MAX_TILES.');
    process.exit(1);
  }

  console.log(
    `area ${bbox.south.toFixed(4)},${bbox.west.toFixed(4)} → ${bbox.north.toFixed(4)},${bbox.east.toFixed(4)}`,
  );
  console.log(`zoom ${zoom} · ${range.count} tiles`);

  const tiles = [];
  let bytes = 0;

  for (let x = range.x0; x <= range.x1; x += 1) {
    for (let y = range.y0; y <= range.y1; y += 1) {
      const url = TILE_URL.replace('{z}', zoom).replace('{x}', x).replace('{y}', y);
      const response = await fetch(url, {
        // A politica do OSM exige um User-Agent identificavel.
        headers: { 'User-Agent': 'Moblytix-demo-build/1.0 (build de demonstracao)' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} em ${url}`);

      const buffer = Buffer.from(await response.arrayBuffer());
      bytes += buffer.length;
      tiles.push({
        // Limites do tile: [[sul, oeste], [norte, leste]]
        bounds: [
          [yToLat(y + 1, zoom), xToLon(x, zoom)],
          [yToLat(y, zoom), xToLon(x + 1, zoom)],
        ],
        uri: `data:image/png;base64,${buffer.toString('base64')}`,
      });

      // Ritmo cortes para respeitar a politica de uso do provedor.
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  fs.writeFileSync(OUT, JSON.stringify({ zoom, attribution: ATTRIBUTION, tiles }));
  console.log(`gerado: ${OUT} — ${tiles.length} tiles, ${Math.round(bytes / 1024)} kB`);
  console.log('agora rode: npm run build:demo');
}

main().catch((err) => {
  console.error('Falha ao baixar a base cartografica:', err.message);
  console.error('A demo continua funcionando sem ruas (malha de referencia).');
  process.exit(1);
});
