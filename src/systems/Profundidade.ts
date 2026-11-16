import Phaser from 'phaser';
import type { OclusorMapa } from './MapaTiled';
import type { Ponto } from './Colisao';

export interface ObjetoComBase {
  objeto: Phaser.GameObjects.GameObject & { setDepth(depth: number): unknown };
  baseY: number | (() => number);
}

export class Profundidade {
  private readonly cena: Phaser.Scene;
  private readonly camada?: Phaser.GameObjects.Layer;
  private readonly oclusores: ObjetoComBase[] = [];
  private readonly imagens: Phaser.GameObjects.Image[] = [];
  private graficoDepuracao?: Phaser.GameObjects.Graphics;

  constructor(
    cena: Phaser.Scene,
    _texturaFundo: string,
    dados: OclusorMapa[],
    area = 'mapa',
    camada?: Phaser.GameObjects.Layer,
  ) {
    this.cena = cena;
    this.camada = camada;
    dados.forEach((dado) => {
      const chave = dado.textura || `oclusor-${area}-${dado.nome}`;
      if (!cena.textures.exists(chave)) this.criarPlaceholder(dado, chave);
      const oclusor = cena.add.image(dado.x, dado.y, chave)
        .setOrigin(0, 0)
        .setDepth(dado.baseY);
      this.camada?.add(oclusor);
      this.imagens.push(oclusor);
      this.oclusores.push({ objeto: oclusor, baseY: dado.baseY });
    });
  }

  ordenar(objetos: ObjetoComBase[]): void {
    [...this.oclusores, ...objetos].forEach(({ objeto, baseY }) => {
      objeto.setDepth(typeof baseY === 'function' ? baseY() : baseY);
    });
    if (this.camada) this.camada.depthSort();
    else this.cena.children.depthSort();
  }

  desenharDepuracao(dados: OclusorMapa[]): void {
    this.graficoDepuracao = this.cena.add.graphics().setDepth(100000);
    this.camada?.add(this.graficoDepuracao);
    dados.forEach(({ x, y, w, h, baseY }) => {
      this.graficoDepuracao?.lineStyle(1, 0xffbb61, 1);
      this.graficoDepuracao?.strokeRect(x, y, w, h);
      this.graficoDepuracao?.lineBetween(x, baseY, x + w, baseY);
    });
  }

  static desenharCaixa(
    cena: Phaser.Scene,
    base: Ponto[],
    altura: number,
    nome: string,
  ): Phaser.GameObjects.Graphics {
    const centro = base.reduce((ponto, atual) => ({
      x: ponto.x + atual.x / base.length,
      y: ponto.y + atual.y / base.length,
    }), { x: 0, y: 0 });
    const xs = base.map((ponto) => ponto.x);
    const ys = base.map((ponto) => ponto.y);
    const largura = Math.max(...xs) - Math.min(...xs);
    const profundidade = Math.max(...ys) - Math.min(...ys);
    const cima = [
      { x: centro.x, y: centro.y - profundidade / 2 - altura },
      { x: centro.x + largura / 2, y: centro.y - altura },
      { x: centro.x, y: centro.y + profundidade / 2 - altura },
      { x: centro.x - largura / 2, y: centro.y - altura },
    ];
    const direita = { x: centro.x + largura / 2, y: centro.y };
    const frente = { x: centro.x, y: centro.y + profundidade / 2 };
    const esquerda = { x: centro.x - largura / 2, y: centro.y };
    const grafico = cena.add.graphics().setName(nome);
    const desenharFace = (pontos: Ponto[], cor: number): void => {
      grafico.fillStyle(cor, 1).lineStyle(1, 0x202723, 1);
      grafico.beginPath();
      grafico.moveTo(pontos[0].x, pontos[0].y);
      pontos.slice(1).forEach((ponto) => grafico.lineTo(ponto.x, ponto.y));
      grafico.closePath();
      grafico.fillPath();
      grafico.strokePath();
    };
    desenharFace([esquerda, frente, cima[2], cima[3]], 0x777f7a);
    desenharFace([frente, direita, cima[1], cima[2]], 0x5d6560);
    desenharFace(cima, 0xb7bcb8);
    grafico.setDepth(Math.max(...ys));
    return grafico;
  }

  destruir(): void {
    this.imagens.forEach((imagem) => imagem.destroy());
    this.graficoDepuracao?.destroy();
    this.imagens.length = 0;
    this.oclusores.length = 0;
  }

  private criarPlaceholder(dado: OclusorMapa, chave: string): void {
    const largura = Math.max(1, Math.round(dado.w));
    const altura = Math.max(1, Math.round(dado.h));
    const textura = this.cena.textures.createCanvas(chave, largura, altura);
    if (textura) {
      const contexto = textura.context;
      contexto.imageSmoothingEnabled = false;
      contexto.fillStyle = '#35854e';
      contexto.fillRect(0, 0, largura, altura);
      contexto.strokeStyle = '#ffbb61';
      contexto.lineWidth = 2;
      contexto.strokeRect(1, 1, largura - 2, altura - 2);
      textura.refresh();
    }
    console.warn(`[Missão Turno Seguro] Asset ausente: /assets/mapas/${dado.imagem}. Um placeholder ${largura}x${altura} será usado.`);
  }
}
