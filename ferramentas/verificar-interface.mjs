import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Regressão no navegador real: sem dependências e com perfil isolado.
const pasta = resolve('artifacts/interface');
await mkdir(pasta, { recursive: true });
const navegador = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=9337', `--user-data-dir=${resolve(pasta, 'perfil')}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const esperar = ms => new Promise(r => setTimeout(r, ms));
let conexao;
try {
  let abas;
  for (let i = 0; i < 50; i++) {
    try { abas = await (await fetch('http://127.0.0.1:9337/json')).json(); break; } catch { await esperar(200); }
  }
  assert.ok(abas?.length, 'Navegador não iniciou');
  conexao = new WebSocket(abas.find(a => a.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => conexao.addEventListener('open', r, { once: true }));
  let sequencia = 0;
  const pendentes = new Map();
  const erros = [];
  conexao.addEventListener('message', e => {
    const d = JSON.parse(e.data);
    if (d.method === 'Runtime.exceptionThrown') erros.push(d.params.exceptionDetails.text);
    const p = pendentes.get(d.id);
    if (p) { pendentes.delete(d.id); d.error ? p.reject(new Error(d.error.message)) : p.resolve(d.result); }
  });
  const chamar = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequencia;
    pendentes.set(id, { resolve, reject });
    conexao.send(JSON.stringify({ id, method, params }));
  });
  const avaliar = async expression => {
    const r = await chamar('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const ate = async expressao => {
    for (let i = 0; i < 100; i++) { if (await avaliar(expressao)) return; await esperar(100); }
    throw new Error(`Tempo esgotado: ${expressao}`);
  };
  const clicar = async seletor => {
    const p = await avaliar(`(() => { const b=document.querySelector(${JSON.stringify(seletor)}); if(!b) return null; const r=b.getBoundingClientRect(); const x=r.x+r.width/2,y=r.y+r.height/2; return {x,y,habilitado:!b.disabled,alcancavel:b.contains(document.elementFromPoint(x,y))}; })()`);
    assert.ok(p?.habilitado && p.alcancavel, `Botão inacessível: ${seletor} ${JSON.stringify(p)}`);
    await chamar('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await chamar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await esperar(100);
  };
  const foto = async nome => {
    const r = await chamar('Page.captureScreenshot', { format: 'png' });
    await writeFile(resolve(pasta, `${nome}.png`), Buffer.from(r.data, 'base64'));
  };
  const fecharDialogo = async () => {
    const total = await avaliar(`Number(document.querySelector('.texto-dialogo')?.dataset.totalPaginas||1)`);
    for (let pagina = 1; pagina <= total; pagina += 1) {
      await ate(`(()=>{const i=document.querySelector('.indicador-avanco');return i && !i.hidden})()`);
      await clicar('.ui-dialogo');
      if (pagina < total) await ate(`Number(document.querySelector('.texto-dialogo')?.dataset.paginaAtual)===${pagina + 1}`);
      else await ate(`!document.querySelector('.ui-dialogo')`);
    }
  };
  const verificarOclusao = async (area, capitulo, nome, nomeCaptura, alvoFixo) => {
    await chamar('Page.navigate', { url: `http://127.0.0.1:5173/?mapa=${encodeURIComponent(area)}` });
    await ate(`Boolean(document.querySelector('#mundo canvas'))`);
    await avaliar(`(async()=>{window.modulos=await import(document.querySelector('script[src*="/src/main.ts"]').src)})()`);
    const mundoPronto = `(()=>{const m=modulos.jogo.scene.getScene('Mapa');const o=m.mapa?.oclusores?.find(item=>item.nome===${JSON.stringify(nome)});return m.area===${JSON.stringify(area)}&&m.capitulo===${capitulo}&&Boolean(m.jogador&&m.profundidade&&o&&m.camadaMundo?.getChildren().some(item=>item.texture?.key===o.textura))})()`;
    try { await ate(mundoPronto); } catch (erro) {
      const diagnostico = await avaliar(`(()=>{const m=modulos.jogo.scene.getScene('Mapa');return {area:m.area,ativa:m.scene.isActive(),jogador:!!m.jogador,profundidade:!!m.profundidade,oclusores:m.mapa?.oclusores?.map(item=>[item.nome,item.textura]),filhos:m.camadaMundo?.list?.map(item=>item.texture?.key).filter(Boolean)}})()`);
      throw new Error(`${erro.message}; estado=${JSON.stringify(diagnostico)}`);
    }
    await avaliar(`(()=>{const m=modulos.jogo.scene.getScene('Mapa');m.dialogo=false;m.aguardando=false;m.executando=false;m.fila=[];document.querySelector('.ui-dialogo')?.remove()})()`);
    const medidas = await avaliar(`(async()=>{
      const m=modulos.jogo.scene.getScene('Mapa');
      const {posicaoValida}=await import('/src/systems/Colisao.ts');
      const o=m.mapa.oclusores.find(item=>item.nome===${JSON.stringify(nome)});
      if(!o)return {erro:'Oclusor ausente'};
      let atras=${alvoFixo ? JSON.stringify(alvoFixo) : 'null'};
      if(!atras){
        for(let y=Math.min(o.baseY-1,o.y+o.h-1);y>=o.y&&!atras;y-=1){
          for(let deslocamento=0;deslocamento<=o.w&&!atras;deslocamento+=1){
            const centro=o.x+o.w/2;
            for(const x of [centro-deslocamento,centro+deslocamento]){
              if(x>=o.x&&x<=o.x+o.w&&posicaoValida({x,y},m.geometria)){atras={x,y};break;}
            }
          }
        }
      }
      if(!atras||!posicaoValida(atras,m.geometria))return {erro:'Sem ponto caminhavel atras do oclusor',oclusor:o};
      const filhos=m.camadaMundo.getChildren?.()??m.camadaMundo.list;
      const ordenarEm=(y)=>{
        m.jogador.setPosition(atras.x,y-58);
        m.profundidade.ordenar(m.objetosComBase);
        return {jogador:filhos.indexOf(m.jogador),oclusor:filhos.findIndex(item=>item.texture?.key===o.textura),profundidadeJogador:m.jogador.depth,baseOclusor:o.baseY};
      };
      const resultadoAtras=ordenarEm(atras.y);
      const resultadoFrente=ordenarEm(o.baseY+2);
      ordenarEm(atras.y);
      return {atras,resultadoAtras,resultadoFrente};
    })()`);
    assert.ok(!medidas.erro, JSON.stringify(medidas));
    assert.ok(medidas.resultadoAtras.jogador < medidas.resultadoAtras.oclusor, `${area}: personagem deveria ficar atras de ${nome}: ${JSON.stringify(medidas)}`);
    assert.ok(medidas.resultadoFrente.jogador > medidas.resultadoFrente.oclusor, `${area}: personagem deveria ficar a frente de ${nome}: ${JSON.stringify(medidas)}`);
    await esperar(200);
    await foto(nomeCaptura);
  };
  const verificarTransicaoPorta = async () => {
    await chamar('Page.navigate', { url: 'http://127.0.0.1:5173/' });
    await ate(`Boolean(document.querySelector('#mundo canvas'))`);
    const progresso = {
      personagem: 'julia', capitulo: 1, area: 'quarto', iniciado: true,
      flags: { uniforme: true, 'mensagem-renata': true }, respostas: {},
      tentativasD1: [], inspecao: [], diasAbertos: [], audio: false,
    };
    await avaliar(`localStorage.setItem('missao-turno-seguro:v1',${JSON.stringify(JSON.stringify(progresso))})`);
    await chamar('Page.navigate', { url: 'http://127.0.0.1:5173/?mapa=quarto' });
    await ate(`location.search.includes('mapa=quarto')&&Boolean(document.querySelector('#mundo canvas'))`);
    await avaliar(`(async()=>{window.modulos=await import(document.querySelector('script[src*="/src/main.ts"]').src)})()`);
    await ate(`(()=>{const m=modulos.jogo.scene.getScene('Mapa');return m.area==='quarto'&&m.mundoPronto})()`);
    await avaliar(`modulos.jogo.scene.getScene('Mapa').sair('porta')`);
    await ate(`Boolean(document.querySelector('.ui-dialogo'))`);
    await fecharDialogo();
    await ate(`(()=>{const m=modulos.jogo.scene.getScene('Mapa');return m.area==='portaria'&&m.mundoPronto&&Boolean(m.jogador?.anims)})()`);
    await esperar(300);
    const estado = await avaliar(`(()=>{const m=modulos.jogo.scene.getScene('Mapa');return {area:m.area,capitulo:m.capitulo,mundoPronto:m.mundoPronto,animacoes:!!m.jogador?.anims,fps:m.game.loop.actualFps}})()`);
    assert.equal(estado.area, 'portaria');
    assert.equal(estado.capitulo, 2);
    assert.equal(estado.mundoPronto, true);
    assert.equal(estado.animacoes, true);
    assert.ok(estado.fps > 0, JSON.stringify(estado));
    await foto('transicao-portaria');
  };
  await chamar('Runtime.enable');
  await chamar('Page.enable');
  await chamar('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 1, mobile: true });
  await chamar('Page.navigate', { url: 'http://127.0.0.1:5173/' });
  await ate(`Boolean(document.querySelector('.tela-menu'))`);
  await avaliar(`localStorage.clear()`);
  await chamar('Page.reload');
  await ate(`Boolean(document.querySelector('.tela-menu'))`);
  await foto('menu');
  await clicar('.botoes-menu button');
  await ate(`Boolean(document.querySelector('.cartao-personagem'))`);
  await clicar('[data-personagem="lucas"]');
  await foto('selecao');
  await clicar('.botao-comecar');
  await ate(`Boolean(document.querySelector('.ui-dialogo'))`);
  await avaliar(`(async()=>{window.modulos=await import(document.querySelector('script[src*="/src/main.ts"]').src);})()`);
  await ate(`Boolean(modulos.jogo.scene.getScene('Mapa').jogador)`);
  assert.equal(await avaliar(`modulos.jogo.scene.getScene('Mapa').jogador.texture.key`), 'lucas-pijama');
  assert.equal(await avaliar(`modulos.jogo.scene.getScene('Mapa').mapa.oclusores.length`), 0, 'O quarto não deve herdar oclusores de outro mapa');
  assert.ok(await avaliar(`Math.abs(modulos.jogo.scene.getScene('Mapa').jogador.depth-(modulos.jogo.scene.getScene('Mapa').jogador.y+58))<0.01`), 'Profundidade do jogador deve seguir os pés');
  await esperar(500);
  assert.ok(await avaliar(`document.querySelector('.texto-dialogo').textContent.length>0`), 'Texto não começou a digitar');
  const alinhamentoNome = await avaliar(`(()=>{const e=document.querySelector('.nome-dialogo'),r=document.createRange();r.selectNodeContents(e);const b=e.getBoundingClientRect(),t=r.getBoundingClientRect();return {x:Math.abs((b.left+b.right-t.left-t.right)/2),y:Math.abs((b.top+b.bottom-t.top-t.bottom)/2)}})()`);
  assert.ok(alinhamentoNome.x<=2&&alinhamentoNome.y<=2, `Nome desalinhado na moldura: ${JSON.stringify(alinhamentoNome)}`);
  await foto('dialogo');
  await fecharDialogo();
  await avaliar(`modulos.jogo.scene.getScene('Mapa').executarGatilho('aoInteragir:guarda-roupa')`);
  await ate(`Boolean(document.querySelector('.ui-dialogo'))`);
  assert.equal(await avaliar(`modulos.jogo.scene.getScene('Mapa').jogador.texture.key`), 'lucas');
  await fecharDialogo();
  await avaliar(`modulos.jogo.scene.getScene('Mapa').executarGatilho('aoInteragir:escrivaninha')`);
  await ate(`Boolean(document.querySelector('.celular-ui'))`);
  for (const [w,h] of [[320,568],[360,640],[390,844],[768,1024]]) {
    await chamar('Emulation.setDeviceMetricsOverride', { width:w, height:h, deviceScaleFactor:1, mobile:true });
    await esperar(150);
    const medidas = await avaliar(`(()=>{const b=document.querySelector('.botao-resposta').getBoundingClientRect(),t=document.querySelector('.tela-celular').getBoundingClientRect(),m=document.querySelector('.moldura-celular').getBoundingClientRect(),c=document.querySelector('#mundo canvas').getBoundingClientRect();return {altura:b.height,baixo:b.bottom,topo:b.top,dentro:b.left>=t.left&&b.right<=t.right&&b.top>=t.top&&b.bottom<=t.bottom,escala:getComputedStyle(document.querySelector('#interface')).getPropertyValue('--px').trim(),tela:t.width,moldura:m.width,largura:document.documentElement.scrollWidth,canvas:c.width}})()`);
    assert.ok(medidas.altura>=44 && medidas.baixo<=h && medidas.topo>=0 && medidas.dentro && medidas.tela>0 && medidas.moldura>medidas.tela && medidas.largura<=w, JSON.stringify({w,h,medidas}));
    await foto(`celular-${w}`);
  }
  await clicar('.botao-resposta');
  await ate(`Boolean(document.querySelector('.ui-dialogo'))`);
  await fecharDialogo();
  await ate(`Boolean(document.querySelector('.celular-ui'))`);
  await clicar('.celular-ui .botao-continuar-ui');
  assert.equal(await avaliar(`modulos.jogo.scene.getScene('Mapa').aguardando`), false);
  assert.equal(await avaliar(`modulos.jogo.scene.getScene('Mapa').pontos.mapa.pontos.get('porta').propriedades.bloqueado`), false);
  await avaliar(`modulos.eventos.emit('ui:calendario')`);
  for(let i=0;i<4;i++) await clicar(`.cartao-calendario:nth-child(${i+1})`);
  await clicar('.botao-confirmar');
  await chamar('Emulation.setDeviceMetricsOverride', { width:320, height:568, deviceScaleFactor:1, mobile:true });
  await esperar(200);
  await avaliar(`modulos.eventos.emit('ui:relato')`);
  const medidasTablet = await avaliar(`(()=>{const f=document.querySelector('.moldura-tablet').getBoundingClientRect(),t=document.querySelector('.tela-tablet').getBoundingClientRect(),b=document.querySelector('.tela-tablet .botao-confirmar').getBoundingClientRect();return {dentro:t.left>=f.left&&t.right<=f.right&&t.top>=f.top&&t.bottom<=f.bottom,botaoDentro:b.left>=t.left&&b.right<=t.right&&b.top>=t.top&&b.bottom<=t.bottom,quadro:[f.width,f.height],tela:[t.width,t.height],botao:b.height}})()`);
  assert.ok(medidasTablet.dentro && medidasTablet.botaoDentro && medidasTablet.botao>=44, JSON.stringify(medidasTablet));
  await foto('tablet-320');
  await clicar('.tela-tablet .botao-confirmar');
  await avaliar(`modulos.eventos.emit('dialogo:abrir',{personagem:'Júlia',expressao:'preocupada',texto:'Ah, e essa semana tem SIPAT! A Semana Interna de Prevenção de Acidentes do Trabalho, que a CIPA organiza todo ano com o SESMT. O foco deste ano é saúde mental: estresse, pressão e pedir ajuda sem vergonha.'})`);
  await ate(`Boolean(document.querySelector('.ui-dialogo'))`);
  await ate(`(()=>{const i=document.querySelector('.indicador-avanco');return i && !i.hidden})()`);
  const textoLongo = await avaliar(`(()=>{const p=document.querySelector('.texto-dialogo'),a=document.querySelector('.conteudo-dialogo'),c=document.querySelector('.ui-dialogo').getBoundingClientRect();return {texto:p.textContent,rolagem:a.scrollHeight>a.clientHeight,paginas:Number(p.dataset.totalPaginas),topo:c.top,baixo:c.bottom}})()`);
  assert.ok(textoLongo.texto.length>40 && !textoLongo.rolagem && textoLongo.paginas>1 && textoLongo.topo>=0 && textoLongo.baixo<=568, JSON.stringify(textoLongo));
  await foto('dialogo-longo-320');
  await fecharDialogo();
  // Reabre a seleção para conferir também a folha da Júlia sem reutilizar a do Lucas.
  await avaliar(`void modulos.jogo.scene.getScene('Mapa').scene.start('Selecao')`);
  await ate(`Boolean(document.querySelector('.cartao-personagem'))`);
  await clicar('[data-personagem="julia"]');
  await clicar('.botao-comecar');
  await ate(`Boolean(document.querySelector('.ui-dialogo'))`);
  assert.equal(await avaliar(`modulos.jogo.scene.getScene('Mapa').jogador.texture.key`), 'julia-pijama');
  await fecharDialogo();
  await avaliar(`modulos.eventos.emit('dialogo:abrir',{personagem:String.fromCharCode(74,250,108,105,97)+' (pensando)',texto:'Teste de pensamento.'})`);
  await ate(`Boolean(document.querySelector('.ui-dialogo'))`);
  const marcadorPensamento = await avaliar(`(()=>({nome:document.querySelector('.nome-dialogo').textContent,marcador:document.querySelector('.marcador-pensando')?.textContent,italico:document.querySelector('.texto-dialogo')?.classList.contains('pensamento')}))()`);
  assert.deepEqual(marcadorPensamento, { nome: 'Júlia', marcador: '(pensando)', italico: true });
  await fecharDialogo();
  await verificarOclusao('recepcao', 2, 'mesa', 'recepcao-atras-mesa', { x: 250, y: 340 });
  await verificarOclusao('corredor-a', 4, 'grade-1', 'corredor-atras-grade');
  await verificarTransicaoPorta();
  assert.deepEqual(erros, [], 'Exceções no navegador');
  console.log('Interface validada em 320, 360, 390 e 768 px: escala do canvas, diálogo paginado, molduras de celular e tablet, personagens, uniforme, porta e calendário.');
  console.log(`Capturas: ${pasta}`);
  await chamar('Browser.close');
} finally {
  conexao?.close();
  navegador.kill();
}
