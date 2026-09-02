import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const DEMO = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(DEMO, '..');

const norm = (id: string) => id.split('?')[0].replace(/\\/g, '/');

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
        return code.replace(
          /<TileLayer[\s\S]*?\/>/,
          '<>{/* base cartografica indisponivel na demonstracao estatica */}</>',
        );
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
