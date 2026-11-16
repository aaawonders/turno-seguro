import Phaser from 'phaser';
import * as moduloNipple from 'nipplejs';
import teste from '../data/teste.json';
import interfaceJson from '../data/interface.json';
import { aplicarZonaMorta } from './vetores';
import { eventos } from '../state/eventos';

interface Vetor { x: number; y: number }
interface PosicaoNipple { x: number; y: number }
interface DadosSaidaJoystick {
  vector?: Vetor;
  position?: PosicaoNipple;
  frontPosition?: Vetor;
}
interface GerenciadorJoystick {
  on(evento: 'start' | 'move' | 'end', callback: (_evento: unknown, dados?: DadosSaidaJoystick) => void): void;
  destroy(): void;
}
interface ModuloNipple {
  default: {
    create(opcoes: {
      zone: HTMLElement;
      color: string;
      size: number;
      threshold: number;
      mode: 'dynamic';
      dataOnly: boolean;
      restJoystick: boolean;
    }): GerenciadorJoystick;
  };
}
type EtapaTutorialControles = 'normal' | 'andar' | 'objetivo' | 'livre' | 'interagir';

const CAMINHO_BASE_JOYSTICK = '/assets/ui/controles/joystick-base.png';
const CAMINHO_ALAVANCA_JOYSTICK = '/assets/ui/controles/joystick-alavanca.png';
const CAMINHO_BOTAO_ACAO = '/assets/ui/controles/botao-acao.png';
const TAMANHO_BASE = 96;
const ALCANCE_ALAVANCA = 30;
const DURACAO_RETORNO_MS = 80;

export class Controles {
  private readonly teclas: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly raiz: HTMLElement;
  private readonly zonaJoystick: HTMLDivElement;
  private readonly baseRepouso: HTMLDivElement;
  private readonly baseFlutuante: HTMLDivElement;
  private readonly alavancaFlutuante: HTMLDivElement;
  private readonly alavancaRepouso: HTMLDivElement;
  private readonly botaoAcao: HTMLButtonElement;
  private readonly legendaTeclado: HTMLDivElement;
  private readonly gerenciadorJoystick?: GerenciadorJoystick;
  private direcaoToque: Vetor = { x: 0, y: 0 };
  private toqueAcaoPendente = false;
  private etapaTutorial: EtapaTutorialControles = 'normal';
  private modalAberto = false;
  private interacaoDisponivel = false;
  private joystickAtivo = false;
  private temporizadorRetorno?: number;

  constructor(cena: Phaser.Scene) {
    const teclado = cena.input.keyboard;
    if (!teclado) throw new Error('O teclado do jogo não está disponível.');
    this.teclas = teclado.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE,E,ENTER') as Record<string, Phaser.Input.Keyboard.Key>;

    const raiz = document.getElementById('controles-toque');
    if (!raiz) throw new Error('A área de controles não existe no documento.');
    this.raiz = raiz;
    raiz.replaceChildren();

    this.zonaJoystick = document.createElement('div');
    this.zonaJoystick.className = 'zona-joystick';
    this.zonaJoystick.setAttribute('aria-label', 'Zona para movimentar o personagem');
    raiz.append(this.zonaJoystick);

    this.baseRepouso = document.createElement('div');
    this.baseRepouso.className = 'joystick-repouso';
    this.baseRepouso.setAttribute('aria-hidden', 'true');
    this.alavancaRepouso = document.createElement('div');
    this.alavancaRepouso.className = 'alavanca-joystick alavanca-repouso';
    this.baseRepouso.append(this.alavancaRepouso);
    raiz.append(this.baseRepouso);

    this.baseFlutuante = document.createElement('div');
    this.baseFlutuante.className = 'joystick-flutuante';
    this.baseFlutuante.hidden = true;
    this.baseFlutuante.setAttribute('aria-hidden', 'true');
    this.alavancaFlutuante = document.createElement('div');
    this.alavancaFlutuante.className = 'alavanca-joystick alavanca-flutuante';
    this.baseFlutuante.append(this.alavancaFlutuante);
    raiz.append(this.baseFlutuante);

    this.botaoAcao = document.createElement('button');
    this.botaoAcao.type = 'button';
    this.botaoAcao.className = 'botao-acao';
    this.botaoAcao.setAttribute('aria-label', interfaceJson.controles.interagirAlt);
    this.botaoAcao.setAttribute('aria-pressed', 'false');
    this.botaoAcao.addEventListener('pointerdown', this.marcarAcao);
    this.botaoAcao.addEventListener('pointerup', this.soltarAcao);
    this.botaoAcao.addEventListener('pointercancel', this.soltarAcao);
    this.botaoAcao.addEventListener('lostpointercapture', this.soltarAcao);
    raiz.append(this.botaoAcao);

    this.legendaTeclado = document.createElement('div');
    this.legendaTeclado.className = 'legenda-teclado';
    this.legendaTeclado.textContent = interfaceJson.controles.legendaTeclado;
    this.legendaTeclado.hidden = false;
    raiz.append(this.legendaTeclado);

    const toque = this.temToque();
    document.body.classList.toggle('controles-de-toque-ativos', toque);
    document.body.classList.toggle('controles-de-teclado', !toque);
    if (toque) {
      const nipple = (moduloNipple as unknown as ModuloNipple).default;
      this.gerenciadorJoystick = nipple.create({
        zone: this.zonaJoystick,
        color: 'transparent',
        size: 60 * this.escalaTela(),
        threshold: teste.controles.zonaMortaJoystick,
        mode: 'dynamic',
        dataOnly: true,
        restJoystick: true,
      });
      this.gerenciadorJoystick.on('start', (_evento, dados) => this.iniciarJoystick(dados));
      this.gerenciadorJoystick.on('move', (_evento, dados) => this.moverJoystick(dados));
      this.gerenciadorJoystick.on('end', () => this.encerrarJoystick());

      this.carregarImagemOpcional(CAMINHO_BASE_JOYSTICK, this.baseRepouso);
      this.carregarImagemOpcional(CAMINHO_BASE_JOYSTICK, this.baseFlutuante);
      this.carregarImagemOpcional(CAMINHO_ALAVANCA_JOYSTICK, this.alavancaRepouso);
      this.carregarImagemOpcional(CAMINHO_ALAVANCA_JOYSTICK, this.alavancaFlutuante);
      this.carregarImagemOpcional(CAMINHO_BOTAO_ACAO, this.botaoAcao);
    }

    window.addEventListener('blur', this.limparEntrada);
    document.addEventListener('visibilitychange', this.aoMudarVisibilidade);
    eventos.on('ui:modal', this.definirModal, this);
    cena.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destruir, this);
  }

  direcao(): Vetor {
    if (!this.permiteMovimento()) return { x: 0, y: 0 };
    const horizontalTeclado = Number(this.teclas.RIGHT.isDown || this.teclas.D.isDown)
      - Number(this.teclas.LEFT.isDown || this.teclas.A.isDown);
    const verticalTeclado = Number(this.teclas.DOWN.isDown || this.teclas.S.isDown)
      - Number(this.teclas.UP.isDown || this.teclas.W.isDown);
    if (horizontalTeclado !== 0 || verticalTeclado !== 0) return this.normalizar(horizontalTeclado, verticalTeclado);
    return this.direcaoToque;
  }

  acaoPressionada(): boolean {
    const teclado = [this.teclas.SPACE, this.teclas.E, this.teclas.ENTER]
      .map((tecla) => Phaser.Input.Keyboard.JustDown(tecla)).some(Boolean);
    const acionada = teclado || this.toqueAcaoPendente;
    this.toqueAcaoPendente = false;
    return this.permiteAcao() && acionada;
  }

  depuracaoDirecao(): Vetor { return this.direcao(); }

  definirEtapaTutorial(etapa: EtapaTutorialControles): void {
    this.etapaTutorial = etapa;
    this.limparEntrada();
    const permiteMovimento = !this.modalAberto && (etapa === 'normal' || etapa === 'livre' || etapa === 'andar');
    const permiteAcao = !this.modalAberto && (etapa === 'normal' || etapa === 'livre' || etapa === 'interagir');
    this.zonaJoystick.style.pointerEvents = permiteMovimento ? 'auto' : 'none';
    this.botaoAcao.style.pointerEvents = permiteAcao ? 'auto' : 'none';
  }

  definirInteracaoDisponivel(disponivel: boolean): void {
    if (this.interacaoDisponivel === disponivel) return;
    this.interacaoDisponivel = disponivel;
    this.botaoAcao.classList.toggle('acao-disponivel', disponivel);
  }

  private readonly iniciarJoystick = (dados?: DadosSaidaJoystick): void => {
    if (this.modalAberto || !this.permiteMovimento()) return;
    if (this.temporizadorRetorno !== undefined) window.clearTimeout(this.temporizadorRetorno);
    this.temporizadorRetorno = undefined;
    this.joystickAtivo = true;
    const posicao = dados?.position;
    if (posicao) this.posicionarBaseFlutuante(posicao);
    this.baseRepouso.hidden = true;
    this.baseFlutuante.hidden = false;
    this.baseFlutuante.classList.remove('joystick-retornando');
    this.alavancaFlutuante.classList.remove('alavanca-retornando');
    this.alavancaFlutuante.style.transform = 'translate(-50%, -50%)';
    this.emitirPosicaoTutorial(this.posicaoBaseFlutuante());
  };

  private readonly moverJoystick = (dados?: DadosSaidaJoystick): void => {
    if (!dados || this.modalAberto || !this.permiteMovimento()) return;
    this.direcaoToque = aplicarZonaMorta(
      dados.vector?.x ?? 0,
      -(dados.vector?.y ?? 0),
      teste.controles.zonaMortaJoystick,
    );
    const deslocamentoX = (dados.vector?.x ?? 0) * ALCANCE_ALAVANCA;
    const deslocamentoY = -(dados.vector?.y ?? 0) * ALCANCE_ALAVANCA;
    this.alavancaFlutuante.style.transform = `translate(calc(-50% + ${deslocamentoX}px), calc(-50% + ${deslocamentoY}px))`;
    this.emitirPosicaoTutorial(this.posicaoBaseFlutuante());
  };

  private readonly encerrarJoystick = (): void => {
    this.direcaoToque = { x: 0, y: 0 };
    if (!this.joystickAtivo) return;
    this.joystickAtivo = false;
    this.baseFlutuante.classList.add('joystick-retornando');
    this.alavancaFlutuante.classList.add('alavanca-retornando');
    this.alavancaFlutuante.style.transform = 'translate(-50%, -50%)';
    this.baseFlutuante.style.left = `${24 + this.areaSegura('safe-left')}px`;
    this.baseFlutuante.style.top = `${640 - TAMANHO_BASE - 48 - this.areaSegura('safe-bottom')}px`;
    this.emitirPosicaoTutorial({ x: 72 + this.areaSegura('safe-left'), y: 544 - this.areaSegura('safe-bottom') });
    this.temporizadorRetorno = window.setTimeout(() => {
      this.baseFlutuante.hidden = this.modalAberto;
      this.baseFlutuante.classList.remove('joystick-retornando');
      this.baseFlutuante.style.left = '';
      this.baseFlutuante.style.top = '';
      this.alavancaFlutuante.classList.remove('alavanca-retornando');
      this.baseRepouso.hidden = this.modalAberto;
      this.temporizadorRetorno = undefined;
    }, DURACAO_RETORNO_MS);
  };

  private posicionarBaseFlutuante(posicao: PosicaoNipple): void {
    const escala = this.escalaTela();
    const caixa = this.raiz.getBoundingClientRect();
    const x = (posicao.x - caixa.left - window.scrollX) / escala;
    const y = (posicao.y - caixa.top - window.scrollY) / escala;
    this.baseFlutuante.style.left = `${x - TAMANHO_BASE / 2}px`;
    this.baseFlutuante.style.top = `${y - TAMANHO_BASE / 2}px`;
  }

  private posicaoBaseFlutuante(): { x: number; y: number } {
    const esquerda = Number.parseFloat(this.baseFlutuante.style.left) || 0;
    const topo = Number.parseFloat(this.baseFlutuante.style.top) || 0;
    return {
      x: esquerda + TAMANHO_BASE / 2,
      y: topo + TAMANHO_BASE / 2,
    };
  }

  private emitirPosicaoTutorial(posicao: { x: number; y: number }): void {
    if (this.etapaTutorial === 'andar') eventos.emit('ui:tutorial-joystick-posicao', posicao);
  }

  private carregarImagemOpcional(caminho: string, elemento: HTMLElement): void {
    const imagem = new Image();
    imagem.onload = () => { elemento.style.backgroundImage = `url("${caminho}")`; };
    imagem.onerror = () => console.warn(`[Missão Turno Seguro] Asset ausente: ${caminho}. Usando o controle em CSS.`);
    imagem.src = caminho;
  }

  private readonly marcarAcao = (evento: PointerEvent): void => {
    if (!this.permiteAcao()) return;
    evento.preventDefault();
    this.toqueAcaoPendente = true;
    this.botaoAcao.classList.add('pressionado');
    this.botaoAcao.setAttribute('aria-pressed', 'true');
    try { this.botaoAcao.setPointerCapture(evento.pointerId); } catch { /* Alguns navegadores encerram o ponteiro no toque. */ }
  };

  private readonly soltarAcao = (): void => {
    this.botaoAcao.classList.remove('pressionado');
    this.botaoAcao.setAttribute('aria-pressed', 'false');
  };

  private temToque(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  private escalaTela(): number {
    return Math.max(0.1, Number.parseFloat(getComputedStyle(this.raiz).getPropertyValue('--px')) || 1);
  }

  private areaSegura(nome: 'safe-left' | 'safe-bottom'): number {
    return Number.parseFloat(getComputedStyle(this.raiz).getPropertyValue(`--${nome}`)) || 0;
  }

  private permiteMovimento(): boolean {
    return !this.modalAberto && (this.etapaTutorial === 'normal' || this.etapaTutorial === 'livre' || this.etapaTutorial === 'andar');
  }

  private permiteAcao(): boolean {
    return !this.modalAberto && (this.etapaTutorial === 'normal' || this.etapaTutorial === 'livre' || this.etapaTutorial === 'interagir');
  }

  private normalizar(x: number, y: number): Vetor {
    const intensidade = Math.hypot(x, y);
    if (intensidade === 0) return { x: 0, y: 0 };
    const escala = intensidade > 1 ? 1 / intensidade : 1;
    return { x: x * escala, y: y * escala };
  }

  private readonly destruir = (): void => {
    eventos.off('ui:modal', this.definirModal, this);
    window.removeEventListener('blur', this.limparEntrada);
    document.removeEventListener('visibilitychange', this.aoMudarVisibilidade);
    if (this.temporizadorRetorno !== undefined) window.clearTimeout(this.temporizadorRetorno);
    this.gerenciadorJoystick?.destroy();
    this.botaoAcao.removeEventListener('pointerdown', this.marcarAcao);
    this.botaoAcao.removeEventListener('pointerup', this.soltarAcao);
    this.botaoAcao.removeEventListener('pointercancel', this.soltarAcao);
    this.botaoAcao.removeEventListener('lostpointercapture', this.soltarAcao);
    this.raiz.replaceChildren();
    document.body.classList.remove('controles-de-toque-ativos', 'controles-de-teclado');
  };

  private readonly limparEntrada = (): void => {
    this.direcaoToque = { x: 0, y: 0 };
    this.toqueAcaoPendente = false;
    this.soltarAcao();
    if (this.joystickAtivo) this.encerrarJoystick();
    Object.values(this.teclas).forEach((tecla) => tecla.reset());
  };

  private readonly definirModal = (aberto: boolean): void => {
    this.modalAberto = aberto;
    this.limparEntrada();
    this.zonaJoystick.hidden = aberto;
    this.baseRepouso.hidden = aberto;
    this.baseFlutuante.hidden = true;
    this.botaoAcao.hidden = aberto;
    this.legendaTeclado.hidden = aberto;
    this.definirEtapaTutorial(this.etapaTutorial);
  };

  private readonly aoMudarVisibilidade = (): void => {
    if (document.hidden) this.limparEntrada();
  };
}
