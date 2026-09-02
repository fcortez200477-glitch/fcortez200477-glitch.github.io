import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const DEMO = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(DEMO, '..');

const norm = (id: string) => id.split('?')[0].replace(/\\/g, '/');

/** Base cartografica embutida por "npm run demo:tiles" (opcional). */
const hasTiles = fs.existsSync(path.join(DEMO, 'tiles.json'));

/**
 * Build de demonstracao: gera uma versao navegavel da interface sem backend,
 * para apresentacoes e avaliacao da UI. O codigo da aplicacao nao muda —
 * as substituicoes abaixo valem apenas para esta build.
 *
 *  - src/lib/api.ts  -> demo/mock-api.ts (respostas capturadas da API real)
 *  - BrowserRouter   -> HashRouter (hospedagem estatica nao reescreve rotas)
 *  - TileLayer       -> removido (paginas publicadas bloqueiam imagens externas)
 */
function demoPlugin(): Plugin {
  return {
    name: 'moblytix-demo',
    enforce: 'pre',
    load(id) {
      if (norm(id).endsWith('/src/lib/api.ts')) {
        return fs.readFileSync(path.join(DEMO, 'mock-api.ts'), 'utf8');
      }
      return null;
    },
    transform(code, id) {
      const file = norm(id);

      if (file.endsWith('/src/App.tsx')) {
        return code.replace(/\bBrowserRouter\b/g, 'HashRouter');
      }

      if (file.endsWith('/src/components/MapView.tsx')) {
        // Paginas publicadas bloqueiam imagens externas, entao a camada de tiles
        // remota nunca carregaria. Se "npm run demo:tiles" ja baixou a base,
        // cada tile entra como ImageOverlay com seus limites geograficos; caso
        // contrario o mapa fica so com a malha de referencia.
        const replacement = hasTiles
          ? `<>
              {(demoTiles.tiles as { bounds: [[number, number], [number, number]]; uri: string }[]).map(
                (t, i) => <ImageOverlay key={i} url={t.uri} bounds={t.bounds} />,
              )}
            </>`
          : '<>{/* base cartografica nao embutida: rode "npm run demo:tiles" */}</>';

        let next = code.replace(/<TileLayer[\s\S]*?\/>/, replacement);

        if (hasTiles) {
          next = next
            .replace(
              "import { MapContainer, TileLayer, useMap } from 'react-leaflet';",
              "import { MapContainer, ImageOverlay, useMap } from 'react-leaflet';\n" +
                `import demoTiles from '${path.join(DEMO, 'tiles.json').replace(/\\/g, '/')}';`,
            )
            // Sem requisicao de tile nao ha o que falhar; o aviso some.
            .replace(
              'const [tilesFailed, setTilesFailed] = useState(false);',
              'const tilesFailed = false;',
            )
            // A atribuicao do provedor continua obrigatoria e visivel.
            .replace(
              '      </MapContainer>',
              '      </MapContainer>\n' +
                '      <p className="absolute bottom-0 right-0 z-[500] bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-600"\n' +
                '         dangerouslySetInnerHTML={{ __html: demoTiles.attribution as string }} />',
            );
        }

        return next;
      }

      return null;
    },
  };
}

export default defineConfig({
  root: APP,
  plugins: [demoPlugin(), react()],
  resolve: {
    // O mock e carregado no lugar de src/lib/api.ts, entao './data.json'
    // resolveria a partir de src/lib/. Apontamos para o arquivo real.
    alias: { './data.json': path.join(DEMO, 'data.json') },
  },
  build: {
    outDir: path.join(DEMO, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: path.join(APP, 'index.html'),
      output: { inlineDynamicImports: true, manualChunks: undefined },
    },
  },
});
