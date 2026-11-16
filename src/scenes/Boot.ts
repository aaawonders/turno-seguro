import Phaser from 'phaser';
import teste from '../data/teste.json';
import { audioJogo } from '../state/AudioJogo';

const CAMINHO_JULIA = '/assets/sprites/jogaveis/julia/caminhada.png';
const CAMINHO_JULIA_PIJAMA = '/assets/sprites/jogaveis/julia/caminhada-pijama.png';
const CAMINHO_LUCAS = '/assets/sprites/jogaveis/lucas/caminhada.png';
const CAMINHO_LUCAS_PIJAMA = '/assets/sprites/jogaveis/lucas/caminhada-pijama.png';
const CAMINHO_NPC = '/assets/sprites/npcs/renata/chibi.png';
const CAMINHO_BALAO = '/assets/ui/controles/balao-interacao.png';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    audioJogo.precarregarEfeitos();
    const solicitado = new URLSearchParams(window.location.search).get('personagem');
    const personagem = solicitado === 'lucas' ? 'lucas' : 'julia';
    this.registry.set('personagem', personagem);

    const caminhoJogador = personagem === 'lucas' ? CAMINHO_LUCAS : CAMINHO_JULIA;
    const caminhoPijama = personagem === 'lucas' ? CAMINHO_LUCAS_PIJAMA : CAMINHO_JULIA_PIJAMA;
    this.load.on('loaderror', (arquivo: { key: string; src: string }) => {
      console.warn(
        `[Missão Turno Seguro] Asset ausente: ${arquivo.src}. Um placeholder será usado.`,
      );
    });
    this.load.image('jogador-origem', caminhoJogador);
    this.load.image('jogador-pijama-origem', caminhoPijama);
    for (const id of ['julia', 'lucas']) {
      this.load.image(`${id}-origem`, `/assets/sprites/jogaveis/${id}/caminhada.png`);
      this.load.image(`${id}-pijama-origem`, `/assets/sprites/jogaveis/${id}/caminhada-pijama.png`);
    }
    this.load.image('npc-teste-origem', CAMINHO_NPC);
    this.load.image('balao-teste-origem', CAMINHO_BALAO);
  }

  create(): void {
    for (const id of ['julia', 'lucas']) {
      for (const sufixo of ['', '-pijama']) {
        const chave = `${id}${sufixo}`;
        if (this.textures.exists(`${chave}-origem`)) this.normalizarFolhaDoJogador(`${chave}-origem`, chave);
        else this.criarFolhaDoJogadorPlaceholder(chave);
      }
    }
    if (this.textures.exists('jogador-origem')) this.normalizarFolhaDoJogador('jogador-origem', 'jogador');
    else this.criarFolhaDoJogadorPlaceholder('jogador');
    if (this.textures.exists('jogador-pijama-origem')) this.normalizarFolhaDoJogador('jogador-pijama-origem', 'jogador-pijama');
    else this.criarFolhaDoJogadorPlaceholder('jogador-pijama');

    if (this.textures.exists('npc-teste-origem')) {
      this.normalizarImagem('npc-teste-origem', 'npc-teste', 64, 64);
    } else {
      this.criarNpcPlaceholder();
    }

    if (this.textures.exists('balao-teste-origem')) {
      this.normalizarImagem('balao-teste-origem', 'balao-teste', 16, 16);
    } else {
      this.criarBalaoPlaceholder();
    }

    const parametros = new URLSearchParams(location.search);
    const capituloUrl = Number(parametros.get('cap'));
    const areasCapitulos = ['', 'quarto', 'portaria', 'vestiario', 'corredor-a', 'posto', 'posto', 'posto'];
    if (Number.isInteger(capituloUrl) && capituloUrl >= 1 && capituloUrl <= 7) {
      this.registry.set('capituloInicial', capituloUrl);
      this.registry.set('areaInicial', areasCapitulos[capituloUrl]);
      this.registry.set('modoTesteCapitulo', true);
      this.scene.start('Mapa', { capitulo: capituloUrl, area: areasCapitulos[capituloUrl] });
      return;
    }
    if (parametros.has('mapa')) {
      this.scene.start(parametros.get('mapa') === 'teste' ? 'TesteMovimento' : 'Mapa', { area: parametros.get('mapa') });
      return;
    }
    this.scene.start(parametros.get('editor') === '1' ? 'Editor' : 'Menu');
  }

  private normalizarFolhaDoJogador(chaveOrigem: string, chaveFinal: string): void {
    const origem = this.textures.get(chaveOrigem).getSourceImage();
    const larguraOrigem = origem.width;
    const alturaOrigem = origem.height;
    const larguraQuadro = larguraOrigem / 3;
    const alturaQuadro = alturaOrigem / 3;
    if (larguraQuadro <= 0 || alturaQuadro <= 0
      || !Number.isInteger(larguraQuadro) || !Number.isInteger(alturaQuadro)) {
      console.warn('[Missão Turno Seguro] Folha do jogador inválida; usando placeholder.');
      this.criarFolhaDoJogadorPlaceholder(chaveFinal);
      return;
    }
    const textura = this.textures.createCanvas(chaveFinal, 192, 192);
    if (!textura) return;

    const contexto = textura.context;
    const quadro = this.textures.createCanvas('jogador-quadro-temporario', 64, 64);
    if (!quadro) return;
    contexto.imageSmoothingEnabled = false;
    quadro.context.imageSmoothingEnabled = false;
    for (let linha = 0; linha < 3; linha += 1) {
      for (let coluna = 0; coluna < 3; coluna += 1) {
        quadro.context.clearRect(0, 0, 64, 64);
        quadro.context.drawImage(
          origem as CanvasImageSource,
          coluna * larguraQuadro,
          linha * alturaQuadro,
          larguraQuadro,
          alturaQuadro,
          0,
          0,
          64,
          64,
        );
        // A arte tem margens diferentes entre poses; ancora os pés no mesmo ponto.
        const pixels = quadro.context.getImageData(0, 0, 64, 64).data;
        let esquerda = 64;
        let direita = -1;
        let base = -1;
        for (let y = 0; y < 64; y += 1) {
          for (let x = 0; x < 64; x += 1) {
            if (pixels[(y * 64 + x) * 4 + 3] === 0) continue;
            esquerda = Math.min(esquerda, x);
            direita = Math.max(direita, x);
            base = Math.max(base, y);
          }
        }
        const ancora = teste.jogador.alinhamentoSprite;
        const ajusteX = direita < 0 ? 0 : Math.round(ancora.centroX - (esquerda + direita + 1) / 2);
        const ajusteY = base < 0 ? 0 : ancora.baseY - (base + 1);
        contexto.save();
        contexto.beginPath();
        contexto.rect(coluna * 64, linha * 64, 64, 64);
        contexto.clip();
        contexto.drawImage(
          quadro.getSourceImage() as HTMLCanvasElement,
          coluna * 64 + ajusteX,
          linha * 64 + ajusteY,
        );
        contexto.restore();
      }
    }
    this.textures.remove('jogador-quadro-temporario');
    textura.refresh();
    this.adicionarQuadros(textura);
    console.info(
      `[Missão Turno Seguro] Folha do jogador normalizada de ${larguraOrigem}x${alturaOrigem} para 192x192.`,
    );
  }

  private criarFolhaDoJogadorPlaceholder(chave: string): void {
    const textura = this.textures.createCanvas(chave, 192, 192);
    if (!textura) return;

    const contexto = textura.context;
    contexto.imageSmoothingEnabled = false;
    for (let linha = 0; linha < 3; linha += 1) {
      for (let coluna = 0; coluna < 3; coluna += 1) {
        const x = coluna * 64;
        const y = linha * 64;
        contexto.fillStyle = '#093F1A';
        contexto.fillRect(x + 18, y + 17, 28, 39);
        contexto.fillStyle = '#35854e';
        contexto.fillRect(x + 21, y + 20, 22, 33);
        contexto.fillStyle = '#FFBB61';
        contexto.fillRect(x + 24, y + 8, 16, 16);

        contexto.fillStyle = '#FFFFFF';
        if (linha === 0) contexto.fillRect(x + 30, y + 48, 4, 8);
        if (linha === 1) contexto.fillRect(x + 30, y + 8, 4, 8);
        if (linha === 2) contexto.fillRect(x + 46, y + 30, 8, 4);
      }
    }
    textura.refresh();
    this.adicionarQuadros(textura);
  }

  private adicionarQuadros(textura: Phaser.Textures.CanvasTexture): void {
    for (let linha = 0; linha < 3; linha += 1) {
      for (let coluna = 0; coluna < 3; coluna += 1) {
        const indice = linha * 3 + coluna;
        textura.add(indice, 0, coluna * 64, linha * 64, 64, 64);
      }
    }
  }

  private normalizarImagem(
    chaveOrigem: string,
    chaveFinal: string,
    largura: number,
    altura: number,
  ): void {
    const origem = this.textures.get(chaveOrigem).getSourceImage();
    const textura = this.textures.createCanvas(chaveFinal, largura, altura);
    if (!textura) return;
    textura.context.imageSmoothingEnabled = false;
    textura.context.drawImage(
      origem as CanvasImageSource,
      0,
      0,
      largura,
      altura,
      0,
      0,
      largura,
      altura,
    );
    textura.refresh();
  }

  private criarNpcPlaceholder(): void {
    const textura = this.textures.createCanvas('npc-teste', 64, 64);
    if (!textura) return;
    const contexto = textura.context;
    contexto.imageSmoothingEnabled = false;
    contexto.fillStyle = '#102a40';
    contexto.fillRect(17, 8, 30, 50);
    contexto.fillStyle = '#1b78bf';
    contexto.fillRect(20, 11, 24, 44);
    contexto.fillStyle = '#FFBB61';
    contexto.fillRect(22, 5, 20, 18);
    contexto.fillStyle = '#102a40';
    contexto.fillRect(25, 12, 4, 3);
    contexto.fillRect(35, 12, 4, 3);
    textura.refresh();
  }

  private criarBalaoPlaceholder(): void {
    const textura = this.textures.createCanvas('balao-teste', 16, 16);
    if (!textura) return;
    const contexto = textura.context;
    contexto.imageSmoothingEnabled = false;
    contexto.fillStyle = '#093F1A';
    contexto.fillRect(3, 1, 10, 12);
    contexto.fillRect(1, 4, 14, 7);
    contexto.fillRect(7, 12, 4, 3);
    contexto.fillStyle = '#FFFFFF';
    contexto.fillRect(4, 2, 8, 9);
    contexto.fillRect(5, 1, 6, 11);
    contexto.fillStyle = '#FFBB61';
    contexto.fillRect(7, 3, 2, 5);
    contexto.fillRect(7, 9, 2, 2);
    textura.refresh();
  }
}
