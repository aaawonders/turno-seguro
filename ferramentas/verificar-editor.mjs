import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { loadConfigFromFile } from 'vite';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const compilado = await build({ stdin: { contents: `
  export * from './src/systems/ModeloEditor.ts';
  export * from './src/systems/CameraMapa.ts';
  export * from './src/systems/MapaTiled.ts';
`, resolveDir: process.cwd() }, bundle: true,
  platform: 'node', format: 'esm', write: false });
const { ModeloEditor, areas, pontosDaArea, limitesCamera, lerMapaTiled } = await import(
  `data:text/javascript;base64,${Buffer.from(compilado.outputFiles[0].text).toString('base64')}`);
const modelo = new ModeloEditor('quarto');
for (const [largura, altura] of [[453, 460], [837, 900], [695, 1003]]) {
  const variavel = new ModeloEditor('quarto');
  variavel.definirTamanho(largura, altura);
  const exportado = JSON.parse(variavel.exportar());
  const interpretado = lerMapaTiled(exportado, () => {});
  assert.deepEqual([interpretado.largura, interpretado.altura], [largura, altura]);
  assert.deepEqual(interpretado.elipsePes, { raioX: 10, raioY: 5 });
  const natural = lerMapaTiled(exportado, () => {}, { largura: 450, altura: 459 });
  assert.deepEqual([natural.largura, natural.altura], [450, 459], 'O fundo prevalece sobre metadados antigos.');
}
assert.deepEqual(limitesCamera(453, 460, 360, 640), { x: 0, y: -90, largura: 453, altura: 640 });
assert.deepEqual(limitesCamera(200, 300, 360, 640), { x: -80, y: -170, largura: 360, altura: 640 });
assert.deepEqual(limitesCamera(837, 900, 360, 640), { x: 0, y: 0, largura: 837, altura: 900 });
const ids = new ModeloEditor('quarto');
ids.adicionar('pontos', { name: 'chegada', x: 10, y: 10 });
ids.objetos('pontos')[0].id = 80;
const idsReabertos = new ModeloEditor('quarto', JSON.parse(ids.exportar()));
assert.equal(idsReabertos.objetos('pontos')[0].id, 80, 'IDs importados devem ser preservados.');
const fotografiaSemAlteracao = idsReabertos.fotografia();
assert.equal(idsReabertos.confirmar(fotografiaSemAlteracao), false);
assert.equal(areas.length, 7);
assert.equal(modelo.validar().length, 2);
modelo.alterar(() => modelo.adicionar('caminhavel', { x: 0, y: 0,
  polygon: [{ x: 0, y: 0 }, { x: 512, y: 0 }, { x: 512, y: 768 }, { x: 0, y: 768 }] }));
modelo.alterar(() => modelo.adicionar('colisao', { x: 100, y: 100, width: 40, height: 60 }));
modelo.alterar(() => modelo.adicionar('oclusores', { x: 100, y: 50, width: 40, height: 110,
  properties: [{ name: 'baseY', type: 'int', value: 160 }] }));
modelo.alterar(() => {
  for (const p of pontosDaArea('quarto')) modelo.adicionar('pontos', {
    x: 40, y: 40, name: p.nome, point: true,
    properties: Object.entries(p.propriedades).map(([name, value]) => ({ name, value })),
  });
});
assert.deepEqual(modelo.validar(), []);
const antes = modelo.exportar();
modelo.desfazer(); assert.equal(modelo.objetos('pontos').length, 0);
modelo.refazer(); assert.equal(modelo.objetos('pontos').length, 5);
const reaberto = new ModeloEditor('quarto', JSON.parse(antes));
assert.deepEqual(reaberto.documento.layers, modelo.documento.layers, 'Exportar/reabrir deve preservar as quatro camadas.');
assert.equal(reaberto.objetos('oclusores')[0].properties[0].value, 160);
reaberto.alterar(() => { reaberto.objetos('pontos')[0].x = 600; });
assert.ok(reaberto.validar().some(a => a.includes('chegada')));
assert.equal(pontosDaArea('corredor-b').find(p => p.nome === 'cone-1').propriedades.certo, true);
assert.equal(pontosDaArea('corredor-b').find(p => p.nome === 'saida').propriedades.bloqueado, true);

// Exercita o middleware de desenvolvimento num diretório temporário isolado.
const carregado = await loadConfigFromFile({ command: 'serve', mode: 'development' });
const plugin = carregado.config.plugins.find(p => p.name === 'salvar-mapa-editor');
assert.equal(plugin.apply, 'serve');
const temporario = await mkdtemp(join(tmpdir(), 'turno-editor-check-'));
try {
  let rota;
  plugin.configureServer({ config: { root: temporario }, middlewares: {
    use(caminho, callback) { assert.equal(caminho, '/__editor/mapa'); rota = callback; },
  } });
  async function requisitar(area, method = 'POST') {
    const req = { method, url: `/?area=${encodeURIComponent(area)}`, headers: { host: 'localhost' },
      async *[Symbol.asyncIterator]() { yield Buffer.from(antes); } };
    const res = { statusCode: 200, setHeader() {}, end() {} };
    await rota(req, res); return res.statusCode;
  }
  assert.equal(await requisitar('../fora'), 400);
  assert.equal(await requisitar('quarto', 'GET'), 405);
  assert.equal(await requisitar('quarto'), 200);
  const salvo = JSON.parse(await readFile(join(temporario, 'public/assets/mapas/quarto/mapa.json'), 'utf8'));
  assert.deepEqual(salvo.layers, JSON.parse(antes).layers);
} finally {
  assert.ok(resolve(temporario).startsWith(resolve(tmpdir()) + '\\') || resolve(temporario).startsWith(resolve(tmpdir()) + '/'));
  await rm(temporario, { recursive: true, force: true });
}
console.log('Editor verificado: camadas, exportação/reabertura, histórico, validações e gravação com caminhos restritos.');
