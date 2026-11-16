import Phaser from 'phaser';
import { aproximarVetor } from '../input/vetores';
import { resolverMovimento, type GeometriaColisao } from '../systems/Colisao';

export interface DirecaoJogador {
  x: number;
  y: number;
}

export interface ConfiguracaoJogador {
  velocidade: number;
  fpsAnimacao: number;
  aceleracao: number;
  desaceleracao: number;
  toleranciaDirecao: number;
  limiteDelta: number;
  velocidadeMinimaAnimacao: number;
  tamanhoQuadro: number;
  escala: number;
  deslocamentoBasePes: number;
}

export class Jogador extends Phaser.GameObjects.Sprite {
  private linhaAtual = 0;
  private espelhado = false;
  private readonly velocidade: number;
  private readonly configuracao: ConfiguracaoJogador;
  private velocidadeX = 0;
  private velocidadeY = 0;
  private texturaAtual: string;

  constructor(
    cena: Phaser.Scene,
    x: number,
    y: number,
    textura: string,
    configuracao: ConfiguracaoJogador,
  ) {
    super(cena, x, y, textura, 1);
    this.configuracao = configuracao;
    this.velocidade = configuracao.velocidade;
    this.texturaAtual = textura;
    cena.add.existing(this);
    this.setOrigin(0.5, 0.5);
    this.setDisplaySize(configuracao.tamanhoQuadro * configuracao.escala, configuracao.tamanhoQuadro * configuracao.escala);

    this.criarAnimacoes(configuracao.fpsAnimacao);
  }

  mover(direcao: DirecaoJogador, delta: number, geometria: GeometriaColisao): void {
    const intensidade = Math.hypot(direcao.x, direcao.y);

    const escala = intensidade > 1 ? 1 / intensidade : 1;
    const alvo = {
      x: direcao.x * escala * this.velocidade,
      y: direcao.y * escala * this.velocidade,
    };
    const taxa = intensidade === 0
      ? this.configuracao.desaceleracao : this.configuracao.aceleracao;
    const velocidade = aproximarVetor(
      { x: this.velocidadeX, y: this.velocidadeY }, alvo,
      taxa * Math.min(delta, this.configuracao.limiteDelta) / 1000,
    );
    this.velocidadeX = velocidade.x;
    this.velocidadeY = velocidade.y;
    const segundos = Math.max(0, Math.min(delta, this.configuracao.limiteDelta)) / 1000;
    const atual = { x: this.x, y: this.y + this.configuracao.deslocamentoBasePes };
    const destino = {
      x: atual.x + velocidade.x * segundos,
      y: atual.y + velocidade.y * segundos,
    };
    const resolvido = resolverMovimento(atual, destino, geometria);
    this.setPosition(resolvido.x, resolvido.y - this.configuracao.deslocamentoBasePes);
    const deslocamentoX = resolvido.x - atual.x;
    const deslocamentoY = resolvido.y - atual.y;
    const velocidadeVisivel = segundos > 0
      ? Math.hypot(deslocamentoX, deslocamentoY) / segundos : 0;
    if (velocidadeVisivel < this.configuracao.velocidadeMinimaAnimacao) {
      this.anims.stop();
      this.setFrame(this.linhaAtual * 3 + 1);
      this.setDepth(this.y + this.configuracao.deslocamentoBasePes);
      return;
    }

    // A resolução de colisão pode alternar os eixos a cada quadro junto às bordas.
    // A velocidade suavizada mantém a orientação estável durante o deslizamento.
    const x = Math.abs(velocidade.x);
    const y = Math.abs(velocidade.y);
    const margem = this.configuracao.toleranciaDirecao;
    // Mantém o eixo atual perto da diagonal para evitar troca contínua de pose.
    const horizontal = this.linhaAtual === 2
      ? x >= y * (1 - margem) : x > y * (1 + margem);
    const novaLinha = horizontal ? 2 : velocidade.y < 0 ? 1 : 0;
    const novoEspelhamento = novaLinha === 2 && velocidade.x < 0;
    const animacao = `${['andar-baixo', 'andar-cima', 'andar-direita'][novaLinha]}:${this.texturaAtual}`;

    this.linhaAtual = novaLinha;
    this.espelhado = novoEspelhamento;
    this.setFlipX(this.espelhado);
    if (this.anims.currentAnim?.key !== animacao || !this.anims.isPlaying) {
      const progresso = this.anims.isPlaying ? this.anims.getProgress() : 0;
      this.anims.play(animacao, true);
      this.anims.setProgress(progresso);
    }
    this.anims.timeScale = velocidadeVisivel / this.velocidade;
    this.setDepth(this.y + this.configuracao.deslocamentoBasePes);
  }

  parar(): void {
    this.velocidadeX = 0;
    this.velocidadeY = 0;
    this.anims.stop();
    this.setFrame(this.linhaAtual * 3 + 1);
  }

  trocarTextura(textura: string): void {
    if (this.texture.key === textura) return;
    this.texturaAtual = textura;
    this.setTexture(textura, this.linhaAtual * 3 + 1);
    this.criarAnimacoes(this.configuracao.fpsAnimacao);
    this.anims.stop();
    this.setFrame(this.linhaAtual * 3 + 1);
  }

  private criarAnimacoes(fpsAnimacao: number): void {
    const nomes = ['andar-baixo', 'andar-cima', 'andar-direita'];
    nomes.forEach((nome, linha) => {
      const nomeTextura = `${nome}:${this.texturaAtual}`;
      if (this.anims.exists(nomeTextura)) return;
      const quadros = [0, 1, 2, 1].map((coluna) => ({
        key: this.texturaAtual,
        frame: linha * 3 + coluna,
      }));
      this.anims.create({
        key: nomeTextura,
        frames: quadros,
        frameRate: fpsAnimacao,
        repeat: -1,
      });
    });
  }
}
