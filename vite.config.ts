import { defineConfig } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pontos from './src/data/mapas/pontos.json';

export default defineConfig({
  base: '/',
  plugins: [{
    name: 'salvar-mapa-editor',
    apply: 'serve',
    configureServer(servidor) {
      servidor.middlewares.use('/__editor/mapa', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        // Apenas as sete áreas conhecidas; nenhum caminho recebido é usado diretamente.
        const area = new URL(req.url ?? '/', 'http://localhost').searchParams.get('area');
        if (!area || !Object.hasOwn(pontos, area)) { res.statusCode = 400; res.end('Área inválida'); return; }
        const origem = req.headers.origin;
        if (origem && new URL(origem).host !== req.headers.host) { res.statusCode = 403; res.end(); return; }
        try {
          let corpo = '';
          for await (const parte of req) {
            corpo += parte.toString();
            if (Buffer.byteLength(corpo) > 1_000_000) { res.statusCode = 413; res.end(); return; }
          }
          const documento = JSON.parse(corpo);
          if (documento.type !== 'map' || !Array.isArray(documento.layers)) throw new Error('Mapa inválido');
          const pasta = resolve(servidor.config.root, 'public/assets/mapas', area);
          await mkdir(pasta, { recursive: true });
          await writeFile(resolve(pasta, 'mapa.json'), JSON.stringify(documento, null, 2) + '\n', 'utf8');
          res.setHeader('Content-Type', 'application/json'); res.end('{"salvo":true}');
        } catch { res.statusCode = 400; res.end('JSON inválido ou falha na gravação'); }
      });
    },
  }],
  build: {
    target: 'es2022',
  },
});
