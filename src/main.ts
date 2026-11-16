import Phaser from 'phaser';
import '@fontsource-variable/pixelify-sans';
import '@fontsource/press-start-2p';
import teste from './data/teste.json';
import { Boot } from './scenes/Boot';
import { Menu } from './scenes/Menu';
import { Selecao } from './scenes/Selecao';
import { TesteMovimento } from './scenes/TesteMovimento';
import { Editor } from './scenes/Editor';
import { Mapa } from './scenes/Mapa';
import { EditorUI } from './ui/EditorUI';
import { areas } from './systems/ModeloEditor';
import { eventos } from './state/eventos';
import { audioJogo } from './state/AudioJogo';
import { DialogoTeste } from './ui/DialogoTeste';
import { DepuracaoUI } from './ui/DepuracaoUI';
import { JogoUI } from './ui/JogoUI';
import './style.css';
export { eventos };

const parametros = new URLSearchParams(window.location.search);
const depuracaoAtiva = parametros.get('debug') === '1';
const editorAtivo = parametros.get('editor') === '1';
const elementoInterface = document.getElementById('interface');
const elementoDepuracao = document.getElementById('depuracao');
const elementoRotacao = document.getElementById('aviso-rotacao');

if (!elementoInterface || !elementoDepuracao || !elementoRotacao) {
  throw new Error('A interface do jogo não está completa.');
}
elementoRotacao.textContent = teste.interface.avisoRotacao;

const modoTesteMovimento = parametros.get('mapa') === 'teste';
const dialogo = editorAtivo || !modoTesteMovimento ? undefined : new DialogoTeste(elementoInterface);
const interfaceJogo = editorAtivo || modoTesteMovimento ? undefined : new JogoUI(elementoInterface);
const editor = editorAtivo ? new EditorUI(elementoInterface, areas.find(area => area === parametros.get('mapa'))) : undefined;
const depuracao = new DepuracaoUI(elementoDepuracao, elementoInterface, depuracaoAtiva);

document.addEventListener('contextmenu', impedirPadrao);
document.addEventListener('pointerdown', () => audioJogo.desbloquear(), { once: true, capture: true });
document.addEventListener('keydown', () => audioJogo.desbloquear(), { once: true, capture: true });
document.addEventListener('gesturestart', impedirPadrao);
document.addEventListener('touchmove', impedirRolagem, { passive: false });
window.addEventListener('touchmove', impedirRolagem, { passive: false });

await Promise.all([
  document.fonts.load('600 10px "Pixelify Sans Variable"', 'ãçéêóú'),
  document.fonts.load('400 8px "Press Start 2P"', 'ãçéêóú'),
]);
await document.fonts.ready;

export const jogo = new Phaser.Game({
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  parent: 'mundo',
  backgroundColor: '#093F1A',
  pixelArt: true,
  roundPixels: true,
  disableContextMenu: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 360,
    height: 640,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      fixedStep: false,
      debug: depuracaoAtiva,
      debugShowBody: true,
      debugShowStaticBody: true,
    },
  },
  scene: [Boot, Menu, Selecao, TesteMovimento, Editor, Mapa],
});

const elementoJogo = document.getElementById('jogo');
const elementoMundo = document.getElementById('mundo');
const sobreposicoes = [elementoInterface, document.getElementById('controles-toque')].filter(
  (elemento): elemento is HTMLElement => Boolean(elemento),
);
const medidorAreaSegura = document.createElement('div');
medidorAreaSegura.setAttribute('aria-hidden', 'true');
medidorAreaSegura.style.cssText = [
  'position:fixed', 'visibility:hidden', 'pointer-events:none', 'inset:0',
  'padding-top:env(safe-area-inset-top)', 'padding-right:env(safe-area-inset-right)',
  'padding-bottom:env(safe-area-inset-bottom)', 'padding-left:env(safe-area-inset-left)',
].join(';');
document.body.append(medidorAreaSegura);

const alinharInterfaceAoCanvas = (): void => {
  const canvas = elementoMundo?.querySelector('canvas');
  if (!canvas || !elementoJogo) return;
  const caixaCanvas = canvas.getBoundingClientRect();
  const caixaJogo = elementoJogo.getBoundingClientRect();
  if (caixaCanvas.width <= 0 || caixaCanvas.height <= 0) return;

  const px = caixaCanvas.width / 360;
  const estilosSeguros = getComputedStyle(medidorAreaSegura);
  const converterAreaSegura = (valor: string): string => {
    const pixelsFisicos = Number.parseFloat(valor) || 0;
    return `${pixelsFisicos / px}px`;
  };
  sobreposicoes.forEach((sobreposicao) => {
    sobreposicao.style.setProperty('--px', String(px));
    sobreposicao.style.setProperty('--canvas-x', `${caixaCanvas.left - caixaJogo.left}px`);
    sobreposicao.style.setProperty('--canvas-y', `${caixaCanvas.top - caixaJogo.top}px`);
    sobreposicao.style.setProperty('--safe-top', converterAreaSegura(estilosSeguros.paddingTop));
    sobreposicao.style.setProperty('--safe-right', converterAreaSegura(estilosSeguros.paddingRight));
    sobreposicao.style.setProperty('--safe-bottom', converterAreaSegura(estilosSeguros.paddingBottom));
    sobreposicao.style.setProperty('--safe-left', converterAreaSegura(estilosSeguros.paddingLeft));
    // 48 px físicos dão margem para arredondamento do canvas em telas estreitas.
    sobreposicao.style.setProperty('--toque-minimo', `${Math.max(48, 48 / px)}px`);
  });
};

const observarRedimensionamento = new ResizeObserver(alinharInterfaceAoCanvas);
if (elementoJogo) observarRedimensionamento.observe(elementoJogo);
if (elementoMundo) observarRedimensionamento.observe(elementoMundo);
const observarCanvasInserido = new MutationObserver(() => {
  const canvas = elementoMundo?.querySelector('canvas');
  if (canvas) observarRedimensionamento.observe(canvas);
  alinharInterfaceAoCanvas();
});
if (elementoMundo) observarCanvasInserido.observe(elementoMundo, { childList: true, subtree: true });
window.addEventListener('resize', alinharInterfaceAoCanvas);
requestAnimationFrame(alinharInterfaceAoCanvas);

window.addEventListener('beforeunload', () => {
  dialogo?.destruir();
  interfaceJogo?.destruir();
  editor?.destruir();
  depuracao.destruir();
  observarRedimensionamento.disconnect();
  observarCanvasInserido.disconnect();
  window.removeEventListener('resize', alinharInterfaceAoCanvas);
  medidorAreaSegura.remove();
  eventos.removeAllListeners();
  audioJogo.destruir();
});

function impedirPadrao(evento: Event): void {
  evento.preventDefault();
}

function impedirRolagem(evento: TouchEvent): void {
  if (evento.target instanceof Element && evento.target.closest('.rolagem-ui, .ui-painel')) return;
  evento.preventDefault();
}
