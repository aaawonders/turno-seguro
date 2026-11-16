import Phaser from 'phaser';
import mapaTeste from '../data/mapas/teste.json';
import teste from '../data/teste.json';
import { Jogador } from '../entities/Jogador';
import { Controles } from '../input/Controles';
import {
  eventos,
  NOME_EVENTO_DEPURACAO_ATUALIZAR,
  NOME_EVENTO_DIALOGO_ABRIR,
  NOME_EVENTO_DIALOGO_FECHAR,
} from '../state/eventos';
import { type GeometriaColisao, pontosDosPes } from '../systems/Colisao';
import { criarFundoIsometrico } from '../systems/FundoIsometrico';
import { lerMapaTiled, type DocumentoTiled, type MapaInterpretado } from '../systems/MapaTiled';
import { configurarCameraMapa } from '../systems/CameraMapa';
import { Profundidade } from '../systems/Profundidade';

const CHAVE_MAPA_JSON = 'mapa-selecionado';
const CHAVE_FUNDO_MAPA = 'fundo-selecionado';

export class TesteMovimento extends Phaser.Scene {
  private jogador!: Jogador;
  private npc!: Phaser.GameObjects.Image;
  private balao!: Phaser.GameObjects.Image;
  private controles!: Controles;
  private mapa!: MapaInterpretado;
  private geometria!: GeometriaColisao;
  private profundidade!: Profundidade;
  private chaveFundo = '';
  private pontoNpc = { x: 0, y: 0 };
  private caixas: Phaser.GameObjects.Graphics[] = [];
  private desenhoDebug?: Phaser.GameObjects.Graphics;
  private dialogoAberto = false;
  private arquivoMapaFalhou = false;
  private areaSolicitada = 'teste';

  constructor() {
    super('TesteMovimento');
  }

  preload(): void {
    const parametro = new URLSearchParams(window.location.search).get('mapa');
    if (!parametro || parametro === 'teste') return;
    if (!/^[a-z0-9-]+$/.test(parametro)) {
      console.warn(`[Mapa] Nome inválido "${parametro}"; usando o cenário de teste.`);
      return;
    }
    this.areaSolicitada = parametro;
    this.load.on('loaderror', (arquivo: { key: string; src: string }) => {
      if (arquivo.key === CHAVE_MAPA_JSON || arquivo.key === CHAVE_FUNDO_MAPA) {
        this.arquivoMapaFalhou = true;
      }
    });
    this.load.json(CHAVE_MAPA_JSON, `/assets/mapas/${parametro}/mapa.json`);
    this.load.image(CHAVE_FUNDO_MAPA, `/assets/mapas/${parametro}/fundo.png`);
  }

  create(): void {
    this.carregarDadosDoMapa();
    this.chaveFundo = this.areaSolicitada !== 'teste'
      && !this.arquivoMapaFalhou
      && this.cache.json.exists(CHAVE_MAPA_JSON)
      && this.textures.exists(CHAVE_FUNDO_MAPA)
      ? CHAVE_FUNDO_MAPA
      : criarFundoIsometrico(this.textures, this.mapa.largura, this.mapa.altura);

    this.add.image(0, 0, this.chaveFundo).setOrigin(0).setDepth(-100000);
    this.criarCaixas();
    this.criarJogadorENpc();
    this.profundidade = new Profundidade(this, this.chaveFundo, this.mapa.oclusores);
    this.controles = new Controles(this);
    configurarCameraMapa(this.cameras.main, this.mapa.largura, this.mapa.altura);
    this.cameras.main.startFollow(
      this.jogador,
      true,
      teste.camera.suavizacao,
      teste.camera.suavizacao,
    );

    if (new URLSearchParams(window.location.search).get('debug') === '1') {
      this.desenhoDebug = this.add.graphics().setDepth(100001);
      this.profundidade.desenharDepuracao(this.mapa.oclusores);
    }
    eventos.on(NOME_EVENTO_DIALOGO_FECHAR, this.fecharDialogo, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.limpar, this);
  }

  update(_tempo: number, delta: number): void {
    const fatorCamera = 1 - Math.pow(
      1 - teste.camera.suavizacao,
      Math.min(delta, teste.jogador.limiteDelta) / (1000 / 60),
    );
    this.cameras.main.setLerp(fatorCamera, fatorCamera);
    const direcao = this.controles.direcao();
    const distancia = Phaser.Math.Distance.Between(
      this.jogador.x,
      this.jogador.y + teste.jogador.deslocamentoBasePes,
      this.pontoNpc.x,
      this.pontoNpc.y,
    );
    const pertoDoNpc = distancia <= teste.npc.distanciaInteracao;
    this.balao.setVisible(pertoDoNpc);

    if (this.dialogoAberto) this.jogador.parar();
    else this.jogador.mover(direcao, delta, this.geometria);

    this.profundidade.ordenar([
      { objeto: this.jogador, baseY: this.jogador.y + teste.jogador.deslocamentoBasePes },
      { objeto: this.npc, baseY: this.pontoNpc.y },
      ...this.caixas.map((objeto) => ({ objeto, baseY: objeto.getData('baseY') as number })),
    ]);
    this.desenharDepuracao();

    eventos.emit(NOME_EVENTO_DEPURACAO_ATUALIZAR, {
      fps: this.game.loop.actualFps,
      direcao,
      pontos: [...this.mapa.pontos].map(([nome, ponto]) => ({ nome, x: ponto.x, y: ponto.y })),
      camera: { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY },
    });

    if (!this.controles.acaoPressionada()) return;
    if (this.dialogoAberto) {
      eventos.emit(NOME_EVENTO_DIALOGO_FECHAR);
      return;
    }
    if (!pertoDoNpc) return;
    this.dialogoAberto = true;
    this.jogador.parar();
    eventos.emit(NOME_EVENTO_DIALOGO_ABRIR, { personagem: teste.personagem, texto: teste.texto });
  }

  private carregarDadosDoMapa(): void {
    if (this.areaSolicitada !== 'teste') {
      const documento = this.cache.json.exists(CHAVE_MAPA_JSON)
        ? this.cache.json.get(CHAVE_MAPA_JSON) as DocumentoTiled
        : undefined;
      if (!this.arquivoMapaFalhou && documento) {
        const imagem = this.textures.get(CHAVE_FUNDO_MAPA).getSourceImage();
        const mapa = lerMapaTiled(documento, console.warn, { largura: imagem.width, altura: imagem.height });
        if (mapa.caminhavel.length >= 3) {
          this.mapa = mapa;
          return;
        }
      }
      console.warn(
        `[Mapa] Arquivos de "${this.areaSolicitada}" ausentes ou inválidos; carregando o cenário de teste.`,
      );
      this.areaSolicitada = 'teste';
    }
    this.mapa = lerMapaTiled(mapaTeste as DocumentoTiled);
  }

  private criarCaixas(): void {
    this.caixas = this.mapa.obstaculos
      .filter((obstaculo) => obstaculo.propriedades?.tipo === 'caixa')
      .map((obstaculo, indice) => {
        const caixa = Profundidade.desenharCaixa(
          this,
          obstaculo.pontos,
          Number(obstaculo.propriedades?.altura ?? 48),
          obstaculo.nome ?? `caixa-${indice + 1}`,
        );
        caixa.setData('baseY', Math.max(...obstaculo.pontos.map((ponto) => ponto.y)));
        return caixa;
      });
  }

  private criarJogadorENpc(): void {
    const chegada = this.mapa.pontos.get('chegada') ?? { x: 256, y: 369 };
    const pontoNpc = this.mapa.pontos.get('npc-teste') ?? { x: 410, y: 372 };
    this.pontoNpc = { x: pontoNpc.x, y: pontoNpc.y };
    this.jogador = new Jogador(
      this,
      chegada.x,
      chegada.y - teste.jogador.deslocamentoBasePes,
      'jogador',
      teste.jogador,
    );
    this.npc = this.add.image(
      this.pontoNpc.x,
      this.pontoNpc.y - teste.jogador.deslocamentoBasePes,
      'npc-teste',
    ).setDisplaySize(teste.npc.tamanhoQuadro * teste.npc.escala, teste.npc.tamanhoQuadro * teste.npc.escala);
    this.npc.setDepth(this.pontoNpc.y);
    this.balao = this.add.image(
      this.pontoNpc.x,
      this.pontoNpc.y + teste.npc.marcador.deslocamentoY,
      'balao-teste',
    ).setScale(teste.npc.marcador.escala).setDepth(100000).setVisible(false);
    this.geometria = {
      caminhavel: this.mapa.caminhavel,
      obstaculos: this.mapa.obstaculos,
      elipsePes: this.mapa.elipsePes,
    };
  }

  private desenharDepuracao(): void {
    if (!this.desenhoDebug) return;
    const grafico = this.desenhoDebug;
    grafico.clear();
    const poligono = (pontos: { x: number; y: number }[], cor: number): void => {
      if (pontos.length < 3) return;
      grafico.lineStyle(2, cor, 1).beginPath().moveTo(pontos[0].x, pontos[0].y);
      pontos.slice(1).forEach((ponto) => grafico.lineTo(ponto.x, ponto.y));
      grafico.closePath().strokePath();
    };
    poligono(this.mapa.caminhavel, 0x35d05f);
    this.mapa.obstaculos.forEach(({ pontos }) => poligono(pontos, 0xc22121));
    const amostras = pontosDosPes(
      { x: this.jogador.x, y: this.jogador.y + teste.jogador.deslocamentoBasePes },
      this.mapa.elipsePes,
    );
    grafico.fillStyle(0xffbb61, 1);
    amostras.forEach(({ x, y }) => grafico.fillCircle(x, y, 3));
    this.mapa.pontos.forEach(({ x, y }) => {
      grafico.fillStyle(0x1b78bf, 1).fillCircle(x, y, 4);
    });
  }

  private fecharDialogo(): void {
    this.dialogoAberto = false;
  }

  private limpar(): void {
    eventos.off(NOME_EVENTO_DIALOGO_FECHAR, this.fecharDialogo, this);
    this.profundidade?.destruir();
  }
}
