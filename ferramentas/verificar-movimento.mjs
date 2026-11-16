import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const fonte = await readFile(new URL('../src/input/vetores.ts', import.meta.url), 'utf8');
const codigo = ts.transpileModule(fonte, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { aplicarZonaMorta, aproximarVetor } = await import(
  `data:text/javascript;base64,${Buffer.from(codigo).toString('base64')}`
);
const dados = JSON.parse(await readFile(new URL('../src/data/teste.json', import.meta.url), 'utf8'));
const zona = dados.controles.zonaMortaJoystick;

assert.deepEqual(aplicarZonaMorta(0.1, 0, zona), { x: 0, y: 0 });
assert.ok(aplicarZonaMorta(zona + 0.001, 0, zona).x < 0.002,
  'A saída da zona morta deve ser contínua.');
assert.deepEqual(aplicarZonaMorta(1, 0, zona), { x: 1, y: 0 });
const diagonal = aplicarZonaMorta(1, 1, zona);
assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-10,
  'A diagonal não deve ultrapassar a velocidade máxima.');

for (const fps of [30, 60, 120, 144]) {
  let velocidade = { x: 0, y: 0 };
  for (let quadro = 0; quadro < Math.ceil(fps / 5); quadro++) {
    velocidade = aproximarVetor(velocidade, { x: dados.jogador.velocidade, y: 0 },
      dados.jogador.aceleracao / fps);
  }
  assert.equal(velocidade.x, dados.jogador.velocidade);
  for (let quadro = 0; quadro < Math.ceil(fps / 10); quadro++) {
    velocidade = aproximarVetor(velocidade, { x: 0, y: 0 },
      dados.jogador.desaceleracao / fps);
  }
  assert.deepEqual(velocidade, { x: 0, y: 0 }, `Parada responsiva em ${fps} FPS.`);
}

assert.deepEqual(aproximarVetor({ x: 5, y: 0 }, { x: 0, y: 0 }, 10), { x: 0, y: 0 },
  'A frenagem não deve ultrapassar o zero e provocar oscilação.');
console.log('Movimento verificado: zona morta, diagonais, aceleração e frenagem em 30–144 FPS.');
