import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
const compilado = await build({ stdin: { contents: `
export * from './src/systems/MapaTiled.ts';
export * from './src/systems/Colisao.ts';
export * from './src/systems/PontosMapa.ts';
`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false });
const { lerMapaTiled, PontosMapa, posicaoValida } = await import(`data:text/javascript;base64,${Buffer.from(compilado.outputFiles[0].text).toString('base64')}`);
const lista = JSON.parse(await readFile('src/data/mapas/pontos.json', 'utf8'));

function percorrer(mapa, sistema, geometria) {
  // Percorre o mapa em uma malha de 2 px, usando a mesma colisão dos pés.
  const passo = 2, colunas = Math.ceil(mapa.largura / passo), linhas = Math.ceil(mapa.altura / passo);
  const inicio = mapa.pontos.get('chegada');
  const fila = [[Math.round(inicio.x / passo), Math.round(inicio.y / passo)]];
  const visitados = new Set(); const alcancados = new Set();
  for (let i = 0; i < fila.length; i++) {
    const [x,y] = fila[i], chave = y * colunas + x;
    if (x < 0 || x >= colunas || y < 0 || y >= linhas || visitados.has(chave)) continue;
    visitados.add(chave); const posicao = { x: x * passo, y: y * passo };
    if (!posicaoValida(posicao, geometria)) continue;
    for (const [nome,p] of mapa.pontos) if (sistema.perto(posicao,p)) alcancados.add(nome);
    fila.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }
  return alcancados;
}
for (const area of Object.keys(lista)) {
  const fonte = JSON.parse(await readFile(`public/assets/mapas/${area}/mapa.json`, 'utf8'));
  const imagem = await readFile(`public/assets/mapas/${area}/fundo.png`);
  const avisos = [];
  const mapa = lerMapaTiled(fonte, a => avisos.push(a));
  assert.deepEqual(avisos, []);
  assert.deepEqual([mapa.largura, mapa.altura], [imagem.readUInt32BE(16), imagem.readUInt32BE(20)]);
  const camadaOclusores = fonte.layers.find(camada => camada.name === 'oclusores');
  for (const objeto of camadaOclusores?.objects ?? []) {
    const propriedades = Object.fromEntries((objeto.properties ?? []).map(({ name, value }) => [name, value]));
    assert.match(propriedades.imagem, /^oclusores\/[a-z0-9-]+\.png$/i, `${area}: imagem do oclusor ${objeto.name}`);
    assert.ok(Number.isFinite(propriedades.baseY), `${area}: baseY do oclusor ${objeto.name}`);
    const recorte = await readFile(`public/assets/mapas/${area}/${propriedades.imagem}`);
    assert.deepEqual([objeto.width, objeto.height], [recorte.readUInt32BE(16), recorte.readUInt32BE(20)], `${area}: tamanho do recorte ${objeto.name}`);
  }
  for (const ponto of lista[area]) assert.ok(mapa.pontos.has(ponto.nome), `${area}: ${ponto.nome}`);
  const sistema = new PontosMapa(mapa);
  const geometria = { caminhavel: mapa.caminhavel, obstaculos: mapa.obstaculos, elipsePes: mapa.elipsePes };
  assert.ok(posicaoValida(mapa.pontos.get('chegada'), geometria), `${area}: chegada bloqueada`);
  if (area === 'quarto') {
    for (const nome of ['cama', 'criado-mudo', 'escrivaninha', 'guarda-roupa']) {
      assert.ok(mapa.obstaculos.some(obstaculo => obstaculo.nome === nome), `quarto: colisão ausente para ${nome}`);
    }
    assert.equal(posicaoValida({ x: 83, y: 257 }, geometria), false, 'O jogador não pode ficar sobre a cama');
  }
  if (area === 'portaria') {
    const alcanceAntesDeLiberar = percorrer(mapa, sistema, geometria);
    assert.ok(alcanceAntesDeLiberar.has('speaker'), 'O speaker deve ser acessivel antes de liberar as catracas');
    assert.ok(!alcanceAntesDeLiberar.has('saida'), 'A catraca precisa bloquear a passagem antes de liberar');
    assert.equal(mapa.obstaculos.filter(o => o.nome?.startsWith('catraca-')).length, 3);
    const fixas = mapa.obstaculos.filter(o => !o.nome?.startsWith('catraca-'));
    const catraca = mapa.pontos.get('catraca');
    assert.equal(catraca.propriedades.bloqueado, true);
    assert.equal(sistema.raio(catraca), 48);
    assert.equal(sistema.interacao(catraca), undefined);
    sistema.executar({ tipo: 'liberar', ponto: 'catraca' });
    assert.equal(catraca.propriedades.bloqueado, false);
    assert.deepEqual(mapa.obstaculos, fixas);
    assert.deepEqual(mapa.oclusores.filter(o => o.nome.startsWith('catraca-')).map(o => o.nome).sort(), ['catraca-1', 'catraca-2', 'catraca-3']);
  }
  if (area === 'recepcao') {
    assert.ok(percorrer(mapa, sistema, geometria).has('catraca-facial'), 'Leitor facial acess?vel antes de abrir a passagem');
    const mesa = mapa.oclusores.find(o => o.nome === 'mesa');
    const pontoAtrasDaMesa = { x: 250, y: 340 };
    assert.ok(mesa && pontoAtrasDaMesa.y < mesa.baseY, 'A mesa da recepcao precisa de baseY acima da faixa de passagem');
    assert.ok(posicaoValida(pontoAtrasDaMesa, geometria), 'A passagem atras da mesa precisa ser caminhavel');
    mapa.pontos.set('__teste-atras-da-mesa', { ...pontoAtrasDaMesa, propriedades: { tipo: 'interacao', raio: 1 } });
    assert.ok(percorrer(mapa, sistema, geometria).has('__teste-atras-da-mesa'), 'O personagem precisa alcancar a faixa atras da mesa');
    mapa.pontos.delete('__teste-atras-da-mesa');
    sistema.executar({ tipo: 'liberar', ponto: 'catraca-facial' });
    assert.equal(mapa.obstaculos.some(o => o.nome === 'catraca-facial'), false);
    assert.ok(mapa.oclusores.some(o => o.nome === 'catraca-facial'), 'A catraca facial continua desenhada depois de liberar a passagem');
  }
  if (area === 'corredor-b') {
    const saida = mapa.pontos.get('saida');
    assert.equal(sistema.saida(saida), undefined);
    sistema.executar({ tipo: 'liberar', ponto: 'saida' });
    assert.equal(sistema.saida(saida)[0], 'saida');
    assert.equal(mapa.pontos.get('cone-1').propriedades.certo, true);
  }
  if (area === 'corredor-a') {
    const grade = mapa.oclusores.find(o => o.nome === 'grade-1');
    let pontoAtrasDaGrade;
    if (grade) {
      for (let y = Math.min(grade.baseY - 1, grade.y + grade.h - 1); y >= grade.y && !pontoAtrasDaGrade; y -= 1) {
        for (let deslocamento = 0; deslocamento <= grade.w; deslocamento += 1) {
          const candidatos = [grade.x + grade.w / 2 - deslocamento, grade.x + grade.w / 2 + deslocamento];
          pontoAtrasDaGrade = candidatos.find(x => x >= grade.x && x <= grade.x + grade.w && posicaoValida({ x, y }, geometria));
          if (pontoAtrasDaGrade !== undefined) { pontoAtrasDaGrade = { x: pontoAtrasDaGrade, y }; break; }
        }
      }
    }
    assert.ok(grade && pontoAtrasDaGrade && pontoAtrasDaGrade.y < grade.baseY, 'A grade amarela precisa ter uma faixa caminhavel por tras');
    mapa.pontos.set('__teste-atras-da-grade', { ...pontoAtrasDaGrade, propriedades: { tipo: 'interacao', raio: 1 } });
    assert.ok(percorrer(mapa, sistema, geometria).has('__teste-atras-da-grade'), 'O personagem precisa alcancar a faixa atras da grade');
    mapa.pontos.delete('__teste-atras-da-grade');
  }
  const pensamento = [...mapa.pontos].find(([,p]) => p.propriedades.tipo === 'pensamento');
  if (pensamento) {
    assert.equal(sistema.pensamento(pensamento[1])[0], pensamento[0]);
    assert.equal(sistema.pensamento(pensamento[1]), undefined);
  }
  const alcancados = percorrer(mapa, sistema, geometria);
  if (area === 'portaria') assert.ok(alcancados.has('saida'), 'A passagem pela catraca precisa ficar acessivel depois de liberar');
  const inacessiveis = [...mapa.pontos].filter(([nome,p]) => ['saida','interacao'].includes(p.propriedades.tipo) && !alcancados.has(nome)).map(([nome]) => nome);
  assert.deepEqual(inacessiveis, [], `${area}: pontos inalcançáveis depois de liberar as catracas`);
  console.log(`${area}: ${mapa.obstaculos.length} colisões, ${mapa.pontos.size} pontos; fora do alcance: ${inacessiveis.join(', ') || 'nenhum'}`);
}
console.log('Sete mapas reais lidos sem fallback; raios, pensamentos, saídas e liberação de catracas verificados.');
