import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function importarTypeScript(caminho) {
  const fonte = await readFile(new URL(caminho, import.meta.url), 'utf8');
  const saida = ts.transpileModule(fonte, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(saida).toString('base64')}`);
}

const documento = JSON.parse(await readFile(
  new URL('../src/data/mapas/teste.json', import.meta.url), 'utf8',
));
const avisos = [];
const { lerMapaTiled, poligonoDoObjeto } = await importarTypeScript('../src/systems/MapaTiled.ts');
const { posicaoValida, resolverMovimento, pontoDentroDoPoligono } =
  await importarTypeScript('../src/systems/Colisao.ts');
const mapa = lerMapaTiled(documento, (aviso) => avisos.push(aviso));
const geometria = { caminhavel: mapa.caminhavel, obstaculos: mapa.obstaculos, elipsePes: mapa.elipsePes };

assert.equal(avisos.length, 0, `Mapa válido não deve avisar: ${avisos.join('; ')}`);
assert.deepEqual([mapa.largura, mapa.altura], [512, 768]);
assert.equal(mapa.obstaculos.length, 3);
assert.equal(mapa.oclusores.length, 0,
  'O armário embutido não pode sobrepor um recorte retangular de piso ao jogador.');
const mapaComOclusor = lerMapaTiled({
  ...documento,
  layers: documento.layers.map((camada) => camada.name === 'oclusores' ? {
    ...camada,
    objects: [{ name: 'maquina', x: 100, y: 200, width: 60, height: 80,
      properties: [{ name: 'baseY', value: 270 }, { name: 'imagem', value: 'oclusores/maquina.png' }] }],
  } : camada),
});
assert.equal(mapaComOclusor.oclusores[0].baseY, 270);
assert.equal(mapa.pontos.get('chegada').x, 256);
assert.equal(mapa.pontos.has('npc-teste'), true);
assert.equal(posicaoValida({ x: 256, y: 369 }, geometria), true);
assert.equal(posicaoValida({ x: 10, y: 10 }, geometria), false);
assert.equal(posicaoValida({ x: 190, y: 358 }, geometria), false);
assert.equal(pontoDentroDoPoligono({ x: 0, y: 0 }, [
  { x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 },
]), true);

const deslizado = resolverMovimento({ x: 130, y: 330 }, { x: 190, y: 358 }, geometria);
assert.deepEqual(deslizado, { x: 190, y: 330 }, 'O personagem deve deslizar pela caixa.');
assert.deepEqual(resolverMovimento({ x: 256, y: 369 }, { x: 10, y: 10 }, geometria),
  { x: 256, y: 369 }, 'O personagem deve permanecer dentro do piso.');

const objetoRotacionado = poligonoDoObjeto({
  x: 10, y: 10, width: 20, height: 10, rotation: 90,
});
assert.ok(Math.abs(objetoRotacionado[1].x - 10) < 1e-10);
assert.ok(Math.abs(objetoRotacionado[1].y - 30) < 1e-10);

console.log('Mapa Tiled e colisões isométricas verificados.');
