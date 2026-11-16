import Phaser from 'phaser';
import teste from '../data/teste.json';
import fluxo from '../data/fluxo-mapas.json';
import roteiroJson from '../data/capitulos.json';
import objetosJson from '../data/objetos.json';
import decisoesJson from '../data/decisoes.json';
import regrasJson from '../data/regras-jogo.json';
import { eventos, NOME_EVENTO_DIALOGO_ABRIR, NOME_EVENTO_DIALOGO_FECHAR, NOME_EVENTO_DEPURACAO_ATUALIZAR, NOME_EVENTO_MENSAGEM_ABERTA, NOME_EVENTO_OBJETIVO } from '../state/eventos';
import { estadoJogo } from '../state/JogoEstado';
import { audioJogo, configuracaoAudioJogo } from '../state/AudioJogo';
import { Jogador } from '../entities/Jogador';
import { Controles } from '../input/Controles';
import { lerMapaTiled, type DocumentoTiled, type MapaInterpretado, type ObjetoTiled, type PontoMapa } from '../systems/MapaTiled';
import { PontosMapa } from '../systems/PontosMapa';
import { posicaoValida, pontosDosPes, type GeometriaColisao, type Ponto } from '../systems/Colisao';
import { configurarCameraMapa } from '../systems/CameraMapa';
import { Profundidade, type ObjetoComBase } from '../systems/Profundidade';
import { areas, pontosDaArea, type Area } from '../systems/ModeloEditor';

type Passo = Record<string, unknown> & { tipo: string };
type MapaRoteiro = Record<string, Passo[]>;
type CapituloRoteiro = { mapas: Record<string, MapaRoteiro> };
type RoteiroCompleto = { capitulos: Record<string, CapituloRoteiro> };
type DadosCena = { area?: string; capitulo?: number; continuar?: boolean };
type PontoConfigFallback = { nome: string; tipo: string; propriedades?: Record<string, unknown> };

const roteiro = roteiroJson as RoteiroCompleto;
const decisoes = decisoesJson as Record<string, { reacoes?: Record<string, string>; reacoesExpressoes?: Record<string, string> }>;
const regras = regrasJson;
const tamanhosMapa: Record<string, { largura: number; altura: number }> = {
  quarto: { largura: 453, altura: 460 }, portaria: { largura: 464, altura: 538 },
  recepcao: { largura: 672, altura: 529 }, vestiario: { largura: 571, altura: 783 },
  'corredor-a': { largura: 503, altura: 721 }, 'corredor-b': { largura: 695, altura: 1003 },
  posto: { largura: 837, altura: 900 },
};

const npcPorArea: Partial<Record<Area, string[]>> = {
  vestiario: ['marcos'], 'corredor-a': ['diego'], 'corredor-b': ['renata', 'caio'], posto: ['renata', 'diego'],
};

const dadosRiscos: Record<string, { arquivo: string; escala: number }> = {
  'risco-oleo': { arquivo: '/assets/objetos/riscos/oleo-pingando.png', escala: objetosJson.riscos['oleo-pingando'].escala },
  'risco-extintor': { arquivo: '/assets/objetos/riscos/caixas-extintor.png', escala: objetosJson.riscos['caixas-extintor'].escala },
  'risco-operador': { arquivo: '/assets/sprites/figurantes/operador-sem-protetor.png', escala: objetosJson.riscos['operador-sem-protetor'].escala },
  'risco-pedestre': { arquivo: '/assets/sprites/figurantes/pedestre-celular.png', escala: objetosJson.riscos['pedestre-celular'].escala },
  'risco-cabo': { arquivo: '/assets/objetos/riscos/cabo.png', escala: objetosJson.riscos.cabo.escala },
  'risco-painel': { arquivo: '/assets/objetos/riscos/painel-aberto.png', escala: objetosJson.riscos['painel-aberto'].escala },
  'risco-saida': { arquivo: '/assets/objetos/riscos/pallets-saida.png', escala: objetosJson.riscos['pallets-saida'].escala },
};

const destinosCapitulo: Record<number, Area> = { 1: 'quarto', 2: 'portaria', 3: 'vestiario', 4: 'corredor-a', 5: 'posto', 6: 'posto', 7: 'posto' };

function propriedadesTiled(propriedades: Record<string, unknown>): Array<{ name: string; type: string; value: unknown }> {
  return Object.entries(propriedades).map(([name, value]) => ({
    name,
    type: typeof value === 'boolean' ? 'bool' : typeof value === 'number' ? 'int' : 'string',
    value,
  }));
}

export class Mapa extends Phaser.Scene {
  private area: Area = 'quarto';
  private capitulo = 1;
  private mapa!: MapaInterpretado;
  private pontos!: PontosMapa;
  private geometria!: GeometriaColisao;
  private jogador!: Jogador;
  private controles!: Controles;
  private profundidade!: Profundidade;
  private camadaMundo!: Phaser.GameObjects.Layer;
  private balao!: Phaser.GameObjects.Image;
  private debug?: Phaser.GameObjects.Graphics;
  private seta?: Phaser.GameObjects.Graphics;
  private marcadores?: Phaser.GameObjects.Graphics;
  private readonly npcs = new Map<string, Phaser.GameObjects.Sprite>();
  private readonly objetosVisuais = new Map<string, { setVisible(visivel: boolean): unknown }>();
  private readonly objetosComBase: ObjetoComBase[] = [];
  private readonly falhas = new Set<string>();
  private readonly conesSelecionados: string[] = [];
  private fila: Passo[] = [];
  private dialogo = false;
  private aguardando = false;
  private executando = false;
  private transicao = false;
  private mundoPronto = false;
  private terminal = false;
  private inspecaoAtiva = false;
  private conesAtivos = false;
  private restaurandoObjetivo = false;
  private saidaBloqueadaEmAlcance = false;
  private etapaTutorial?: 'andar' | 'objetivo' | 'livre' | 'interagir';
  private distanciaTutorialAndada = 0;
  private ultimaPosicaoTutorial?: Ponto;
  private objetivo?: string;
  private maquinaLigada = false;
  private readonly rotulosFallback: Array<{ nome: string; x: number; y: number }> = [];
  private readonly imagensFundoFalhas = new Set<string>();
  private ultimoPasso = 0;
  private proximoPasso = false;

  constructor() { super('Mapa'); }

  init(dados: DadosCena): void {
    const parametros = new URLSearchParams(window.location.search);
    const capituloDireto = Number(parametros.get('cap'));
    const parametroMapa = parametros.get('mapa');
    const areaSolicitada = dados.area ?? ((areas as string[]).includes(parametroMapa ?? '') ? parametroMapa as Area : undefined);
    if (this.registry.get('modoTesteCapitulo') && capituloDireto >= 1 && capituloDireto <= 7) {
      const personagem = parametros.get('personagem') === 'lucas' ? 'lucas' : 'julia';
      estadoJogo.novo(personagem);
      estadoJogo.iniciarCapitulo(capituloDireto, areaSolicitada ?? destinosCapitulo[capituloDireto]);
      this.registry.set('modoTesteCapitulo', false);
    } else if (dados.capitulo && dados.area && !dados.continuar) {
      estadoJogo.iniciarCapitulo(dados.capitulo, dados.area);
    }
    this.capitulo = dados.capitulo ?? (areaSolicitada && !dados.continuar ? this.capituloDaArea(areaSolicitada as Area) : estadoJogo.dados.capitulo);
    const areaInicial = areaSolicitada ?? dados.area ?? estadoJogo.dados.area;
    this.area = areas.includes(areaInicial as Area) ? areaInicial as Area : destinosCapitulo[this.capitulo] ?? 'quarto';
    if (dados.continuar) {
      estadoJogo.iniciarCapitulo(this.capitulo, this.area);
    }
    this.restaurandoObjetivo = Boolean(dados.continuar && estadoJogo.dados.objetivo);
    this.fila = [];
    this.dialogo = false;
    this.aguardando = false;
    this.executando = false;
    this.transicao = false;
    this.mundoPronto = false;
    this.terminal = false;
    this.inspecaoAtiva = false;
    this.conesAtivos = false;
    this.saidaBloqueadaEmAlcance = false;
    this.etapaTutorial = undefined;
    this.distanciaTutorialAndada = 0;
    this.ultimaPosicaoTutorial = undefined;
    this.objetivo = dados.continuar ? estadoJogo.dados.objetivo?.ponto : undefined;
    this.maquinaLigada = estadoJogo.flag('maquina-ligada');
    this.conesSelecionados.splice(0);
    this.npcs.clear();
    this.objetosVisuais.clear();
    this.objetosComBase.splice(0);
    this.falhas.clear();
    this.rotulosFallback.splice(0);
  }

  preload(): void {
    const chaveFundo = `fundo-${this.area}`;
    const chaveMapa = `mapa-${this.area}`;
    this.load.on('loaderror', (arquivo: { key: string; src: string }) => {
      this.falhas.add(arquivo.key);
      this.imagensFundoFalhas.add(arquivo.key);
      console.warn(`[Missão Turno Seguro] Asset ausente: ${arquivo.src}. Um placeholder será usado.`);
    });
    if (!this.textures.exists(chaveFundo)) this.load.image(chaveFundo, `/assets/mapas/${this.area}/fundo.png`);
    if (!this.cache.json.exists(chaveMapa)) this.load.json(chaveMapa, `/assets/mapas/${this.area}/mapa.json`);

    (npcPorArea[this.area] ?? []).forEach((nome) => {
      const chave = `npc-${nome}`;
      if (!this.textures.exists(chave)) this.load.spritesheet(chave, `/assets/sprites/npcs/${nome}/chibi.png`, { frameWidth: 64, frameHeight: 64 });
    });
    if (this.area === 'corredor-b') {
      if (!this.textures.exists('objeto-poca')) this.load.image('objeto-poca', '/assets/objetos/cenario/poca-oleo.png');
      if (!this.textures.exists('objeto-cone')) this.load.image('objeto-cone', '/assets/objetos/cenario/cone.png');
    }
    if (this.area === 'posto') {
      Object.entries(dadosRiscos).forEach(([nome, dado]) => {
        const chave = `objeto-${nome}`;
        if (this.textures.exists(chave)) return;
        if (nome === 'risco-oleo') this.load.spritesheet(chave, dado.arquivo, { frameWidth: 32, frameHeight: 32 });
        else this.load.image(chave, dado.arquivo);
      });
    }
  }

  create(): void {
    const chave = `fundo-${this.area}`;
    const documento = this.cache.json.get(`mapa-${this.area}`) as DocumentoTiled | undefined;
    const tamanho = tamanhosMapa[this.area] ?? { largura: 512, altura: 768 };
    if (!this.textures.exists(chave)) this.criarFundoPlaceholder(chave, tamanho.largura, tamanho.altura);
    const imagem = this.textures.get(chave).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const largura = imagem.width || tamanho.largura;
    const altura = imagem.height || tamanho.altura;
    if (!documento || this.falhas.has(`mapa-${this.area}`)) {
      console.warn(`[Mapa] mapa.json ausente para ${this.area}; usando área livre e pontos de fallback.`);
      this.mapa = lerMapaTiled(this.criarDocumentoFallback(largura, altura), console.warn, { largura, altura }, this.area);
    } else {
      this.mapa = lerMapaTiled(structuredClone(documento), console.warn, { largura, altura }, this.area);
      if (this.mapa.caminhavel.length < 3) {
        console.warn(`[Mapa] Área caminhável ausente em ${this.area}; usando retângulo de fallback.`);
        const fallback = lerMapaTiled(this.criarDocumentoFallback(largura, altura), console.warn, { largura, altura }, this.area);
        this.mapa.caminhavel = fallback.caminhavel;
      }
      this.adicionarPontosAusentes(largura, altura);
    }
    this.pontos = new PontosMapa(this.mapa);
    this.geometria = { caminhavel: this.mapa.caminhavel, obstaculos: this.mapa.obstaculos, elipsePes: this.mapa.elipsePes };
    this.aplicarBloqueiosDoRoteiro();
    const pendentes = this.mapa.oclusores.filter((oclusor) =>
      oclusor.imagem.startsWith('oclusores/')
      && !oclusor.imagem.includes('..')
      && !oclusor.imagem.includes('\\')
      && !this.textures.exists(oclusor.textura),
    );
    if (pendentes.length) {
      pendentes.forEach((oclusor) => {
        this.load.image(oclusor.textura, `/assets/mapas/${this.area}/${oclusor.imagem}`);
      });
      this.load.once('complete', () => this.iniciarMundo(chave, largura, altura));
      this.load.start();
      return;
    }
    this.iniciarMundo(chave, largura, altura);
  }

  private iniciarMundo(chave: string, largura: number, altura: number): void {
    this.camadaMundo = this.add.layer();
    this.camadaMundo.add(this.add.image(0, 0, chave).setOrigin(0).setDepth(-100000));
    this.criarNpcPlaceholderSeNecessario();
    this.criarObjetosMapa();
    const chegada = this.chegadaValida();
    const texturaJogador = `${estadoJogo.dados.personagem}${this.capitulo === 1 && !estadoJogo.flag('uniforme') ? '-pijama' : ''}`;
    this.jogador = new Jogador(this, chegada.x, chegada.y - teste.jogador.deslocamentoBasePes, texturaJogador, teste.jogador);
    this.camadaMundo.add(this.jogador);
    this.objetosComBase.push({ objeto: this.jogador, baseY: () => this.jogador.y + teste.jogador.deslocamentoBasePes });
    this.profundidade = new Profundidade(this, chave, this.mapa.oclusores, this.area, this.camadaMundo);
    this.balao = this.add.image(0, 0, 'balao-teste').setScale(teste.npc.marcador.escala).setDepth(100000).setVisible(false);
    this.camadaMundo.add(this.balao);
    this.controles = new Controles(this);
    configurarCameraMapa(this.cameras.main, largura, altura);
    this.cameras.main.startFollow(this.jogador, true, teste.camera.suavizacao, teste.camera.suavizacao);
    this.cameras.main.fadeIn(fluxo.transicaoMs);
    this.criarSeta();
    this.criarRotulosFallback();
    if (new URLSearchParams(window.location.search).get('debug') === '1') {
      this.debug = this.add.graphics().setDepth(100001);
      this.camadaMundo.add(this.debug);
      this.profundidade.desenharDepuracao(this.mapa.oclusores);
    }
    this.input.on('pointerdown', this.aoTocarMapa, this);
    eventos.emit('ui:audio-jogo');
    const objetivoSalvo = estadoJogo.dados.objetivo;
    if (this.restaurandoObjetivo && objetivoSalvo) eventos.emit(NOME_EVENTO_OBJETIVO, { ...objetivoSalvo, animar: false });
    else eventos.emit(NOME_EVENTO_OBJETIVO, { texto: '', animar: false });
    eventos.on(NOME_EVENTO_DIALOGO_FECHAR, this.avancarRoteiro, this);
    eventos.on('roteiro:acao-concluida', this.avancarRoteiro, this);
    eventos.on('roteiro:decisao-resposta', this.registrarDecisao, this);
    eventos.on('roteiro:decisao-tentativa', this.registrarTentativa, this);
    eventos.on('roteiro:inspecao-finalizar', this.finalizarInspecao, this);
    eventos.on('roteiro:cones-confirmar', this.confirmarCones, this);
    eventos.on(NOME_EVENTO_MENSAGEM_ABERTA, this.aguardarMensagemAberta, this);
    eventos.on('resultado:novo', this.jogarNovamente, this);
    eventos.on('resultado:menu', this.voltarMenu, this);
    eventos.on('tutorial:avancar', this.avancarTutorial, this);
    eventos.on('tutorial:pular', this.pularTutorial, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.mundoPronto = false;
      eventos.off(NOME_EVENTO_DIALOGO_FECHAR, this.avancarRoteiro, this);
      eventos.off('roteiro:acao-concluida', this.avancarRoteiro, this);
      eventos.off('roteiro:decisao-resposta', this.registrarDecisao, this);
      eventos.off('roteiro:decisao-tentativa', this.registrarTentativa, this);
      eventos.off('roteiro:inspecao-finalizar', this.finalizarInspecao, this);
      eventos.off('roteiro:cones-confirmar', this.confirmarCones, this);
      eventos.off(NOME_EVENTO_MENSAGEM_ABERTA, this.aguardarMensagemAberta, this);
      eventos.off('resultado:novo', this.jogarNovamente, this);
      eventos.off('resultado:menu', this.voltarMenu, this);
      eventos.off('tutorial:avancar', this.avancarTutorial, this);
      eventos.off('tutorial:pular', this.pularTutorial, this);
      this.input.off('pointerdown', this.aoTocarMapa, this);
      this.profundidade.destruir();
      this.camadaMundo.destroy();
      this.objetosComBase.splice(0);
      eventos.emit(NOME_EVENTO_OBJETIVO, { texto: '', animar: false });
      eventos.emit('ui:esconder');
      eventos.emit(NOME_EVENTO_DEPURACAO_ATUALIZAR, { fps: 0, direcao: { x: 0, y: 0 }, pontos: [] });
    });
    audioJogo.trocarTrilha(this.capitulo);
    this.executarGatilho('aoEntrar');
    this.mundoPronto = true;
  }

  update(tempo: number, delta: number): void {
    if (!this.mundoPronto || !this.jogador || this.transicao || this.terminal) return;
    const acao = this.controles.acaoPressionada();
    if (this.dialogo) {
      this.balao.setVisible(false);
      if (acao) eventos.emit('ui:avancar');
    } else if (!this.aguardando && !this.inspecaoAtiva && !this.conesAtivos) {
      const direcao = this.controles.direcao();
      this.jogador.mover(direcao, delta, this.geometria);
      this.atualizarProgressoTutorial();
      if (Math.hypot(direcao.x, direcao.y) > 0.15 && tempo - this.ultimoPasso >= configuracaoAudioJogo.passoMs) {
        audioJogo.tocar(this.proximoPasso ? 'passo-2' : 'passo-1');
        this.proximoPasso = !this.proximoPasso;
        this.ultimoPasso = tempo;
      }
      const pes = { x: this.jogador.x, y: this.jogador.y + teste.jogador.deslocamentoBasePes };
      const interacao = this.pontos.interacao(pes, (nome) =>
        Boolean(roteiro.capitulos[String(this.capitulo)]?.mapas[this.area]?.[`aoInteragir:${nome}`]));
      this.controles.definirInteracaoDisponivel(Boolean(interacao));
      this.balao.setVisible(!!interacao);
      if (interacao) {
        this.balao
          .setPosition(interacao[1].x, interacao[1].y + teste.npc.marcador.deslocamentoY)
          .setDepth(interacao[1].y + 1);
      }
      const pensamento = this.pontos.pensamento(pes);
      if (pensamento) this.executarGatilho(`aoPassar:${pensamento[0]}`);
      else if (this.etapaTutorial === 'livre' && interacao?.[0] === 'guarda-roupa') {
        this.etapaTutorial = 'interagir';
        this.controles.definirEtapaTutorial('interagir');
        eventos.emit('ui:tutorial-etapa', {
          etapa: 'interagir',
          personagem: this.posicaoNoCanvas(this.jogador.x, this.jogador.y - 20),
        });
      } else if (acao && interacao) {
        if (this.etapaTutorial === 'interagir' && interacao[0] === 'guarda-roupa') this.finalizarTutorial();
        audioJogo.tocar('interagir');
        if (interacao[0] === 'porta-cozinha' || interacao[0] === 'porta-vestiario') audioJogo.tocar('porta');
        this.executarGatilho(`aoInteragir:${interacao[0]}`);
      }
      const saida = this.pontos.saida(pes);
      if (saida) this.sair(saida[0]);
      else this.verificarSaidaBloqueada(pes);
    } else {
      this.balao.setVisible(false);
      if (acao) eventos.emit('ui:avancar');
    }
    this.atualizarSeta(tempo);
    this.profundidade.ordenar(this.objetosComBase);
    this.desenharDebug();
  }

  private capituloDaArea(area: Area): number {
    const entradas: Array<[Area, number]> = [['quarto', 1], ['portaria', 2], ['recepcao', 2], ['vestiario', 3], ['corredor-a', 4], ['corredor-b', 4], ['posto', 5]];
    return entradas.find(([nome]) => nome === area)?.[1] ?? 1;
  }

  private criarDocumentoFallback(largura: number, altura: number): DocumentoTiled {
    const margem = 40;
    const config = pontosDaArea(this.area) as PontoConfigFallback[];
    const alturaUtil = Math.max(1, altura - margem * 2);
    const objects = config.map((ponto, indice): ObjetoTiled => {
      const y = altura - margem - indice * (config.length < 2 ? 0 : alturaUtil / (config.length - 1));
      const x = largura / 2;
      this.rotulosFallback.push({ nome: ponto.nome, x, y });
      return { id: indice + 2, name: ponto.nome, x, y, point: true, properties: propriedadesTiled({ tipo: ponto.tipo, raio: 24, ...(ponto.propriedades ?? {}) }) };
    });
    return {
      width: largura, height: altura, tilewidth: 1, tileheight: 1,
      properties: { raioPesX: 10, raioPesY: 5 },
      layers: [
        { id: 1, name: 'caminhavel', type: 'objectgroup', objects: [{ id: 1, x: margem, y: margem, width: largura - margem * 2, height: altura - margem * 2, polygon: [{ x: 0, y: 0 }, { x: largura - margem * 2, y: 0 }, { x: largura - margem * 2, y: altura - margem * 2 }, { x: 0, y: altura - margem * 2 }] }] },
        { id: 2, name: 'colisao', type: 'objectgroup', objects: [] },
        { id: 3, name: 'oclusores', type: 'objectgroup', objects: [] },
        { id: 4, name: 'pontos', type: 'objectgroup', objects },
      ],
    };
  }

  private adicionarPontosAusentes(largura: number, altura: number): void {
    const config = pontosDaArea(this.area) as PontoConfigFallback[];
    config.forEach((ponto, indice) => {
      if (this.mapa.pontos.has(ponto.nome)) return;
      console.warn(`[Mapa] Ponto "${ponto.nome}" ausente em ${this.area}; usando posição de fallback.`);
      const margem = 40;
      const y = altura - margem - indice * (config.length < 2 ? 0 : (altura - margem * 2) / (config.length - 1));
      const propriedades = { tipo: ponto.tipo, raio: 24, ...(ponto.propriedades ?? {}) };
      this.mapa.pontos.set(ponto.nome, { x: largura / 2, y, propriedades });
      this.rotulosFallback.push({ nome: ponto.nome, x: largura / 2, y });
    });
  }

  private criarFundoPlaceholder(chave: string, largura: number, altura: number): void {
    console.warn(`[Mapa] Fundo ausente para ${this.area}; desenhando cenário de placeholder ${largura}x${altura}.`);
    const textura = this.textures.createCanvas(chave, largura, altura);
    if (!textura) return;
    const contexto = textura.context;
    contexto.imageSmoothingEnabled = false;
    contexto.fillStyle = '#0d1a12';
    contexto.fillRect(0, 0, largura, altura);
    contexto.fillStyle = '#c9c9c9';
    contexto.strokeStyle = '#9a9f9c';
    for (let y = 64; y < altura - 32; y += 48) {
      for (let x = 32; x < largura - 32; x += 64) {
        contexto.beginPath();
        contexto.moveTo(x, y - 24);
        contexto.lineTo(x + 32, y);
        contexto.lineTo(x, y + 24);
        contexto.lineTo(x - 32, y);
        contexto.closePath();
        contexto.fill();
        contexto.stroke();
      }
    }
    textura.refresh();
  }

  private criarRotulosFallback(): void {
    this.rotulosFallback.forEach(({ nome, x, y }) => {
      const rotulo = this.add.text(x, y - 18, nome, {
        fontFamily: '"Pixelify Sans Variable"', fontSize: '10px', color: '#ffffff',
        backgroundColor: '#093f1a', padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 1).setDepth(100000);
      this.camadaMundo.add(rotulo);
    });
  }

  private criarNpcPlaceholderSeNecessario(): void {
    (npcPorArea[this.area] ?? []).forEach((nome) => {
      const chave = `npc-${nome}`;
      if (this.textures.exists(chave)) return;
      const textura = this.textures.createCanvas(chave, 64, 64);
      if (!textura) return;
      const contexto = textura.context;
      contexto.imageSmoothingEnabled = false;
      contexto.fillStyle = '#093F1A'; contexto.fillRect(15, 14, 34, 45);
      contexto.fillStyle = nome === 'renata' ? '#c22121' : nome === 'diego' ? '#35854e' : '#1b78bf';
      contexto.fillRect(19, 20, 26, 36);
      contexto.fillStyle = '#ffbb61'; contexto.fillRect(20, 5, 24, 20);
      contexto.fillStyle = '#202723'; contexto.fillRect(25, 12, 4, 3); contexto.fillRect(35, 12, 4, 3);
      textura.add(0, 0, 0, 0, 64, 64);
      textura.refresh();
      console.warn(`[Missão Turno Seguro] Asset ausente: /assets/sprites/npcs/${nome}/chibi.png. Um placeholder será usado.`);
    });
    (npcPorArea[this.area] ?? []).forEach((nome) => {
      const ponto = this.mapa.pontos.get(nome);
      if (!ponto) { console.warn(`[Mapa] Ponto de NPC ausente: ${nome}.`); return; }
      const npc = this.add.sprite(ponto.x, ponto.y, `npc-${nome}`, 0)
        .setOrigin(0.5, 0.92).setScale(teste.npc.escala).setDepth(ponto.y);
      this.camadaMundo.add(npc);
      this.objetosComBase.push({ objeto: npc, baseY: () => npc.y });
      npc.setVisible(this.npcDeveEstarVisivel(nome));
      this.npcs.set(nome, npc);
    });
  }

  private npcDeveEstarVisivel(nome: string): boolean {
    if (this.area === 'vestiario' && nome === 'marcos') return estadoJogo.flag('mochila-guardada');
    if (this.area === 'corredor-b' && nome === 'caio') return estadoJogo.flag('caio-apareceu') && !estadoJogo.flag('caio-saiu');
    if (this.area === 'posto' && nome === 'diego') return this.capitulo >= 6;
    return true;
  }

  private criarObjetosMapa(): void {
    if (this.area === 'corredor-b') {
      this.criarObjetoPonto('poca', 'objeto-poca', objetosJson.cenario['poca-oleo'].escala);
    }
    if (this.area !== 'posto') return;
    const visiveis = this.capitulo <= 6 && !this.maquinaLigada;
    Object.entries(dadosRiscos).forEach(([nome, dado]) => {
      const ponto = this.mapa.pontos.get(nome);
      if (!ponto) return;
      const chave = `objeto-${nome}`;
      if (!this.textures.exists(chave)) this.criarObjetoPlaceholder(chave, nome);
      const objeto = nome === 'risco-oleo'
        ? this.add.sprite(ponto.x, ponto.y, chave, 0).setOrigin(0.5, 1).setScale(dado.escala).setDepth(ponto.y)
        : this.add.image(ponto.x, ponto.y, chave).setOrigin(0.5, 1).setScale(dado.escala).setDepth(ponto.y);
      this.camadaMundo.add(objeto);
      this.objetosComBase.push({ objeto, baseY: ponto.y });
      objeto.setVisible(visiveis);
      this.objetosVisuais.set(nome, objeto);
    });
  }

  private criarObjetoPonto(nome: string, chave: string, escala: number): void {
    const ponto = this.mapa.pontos.get(nome);
    if (!ponto) return;
    if (!this.textures.exists(chave)) {
      const largura = nome === 'poca' ? 64 : 32;
      const altura = nome === 'poca' ? 32 : 32;
      const textura = this.textures.createCanvas(chave, largura, altura);
      if (textura) {
        textura.context.imageSmoothingEnabled = false;
        textura.context.fillStyle = nome === 'poca' ? '#27312f' : '#ffbb61';
        textura.context.fillRect(0, 0, largura, altura);
        textura.refresh();
      }
      console.warn(`[Missão Turno Seguro] Asset ausente: ${nome}. Um placeholder será usado.`);
    }
    const objeto = this.add.image(ponto.x, ponto.y, chave).setOrigin(0.5, 1).setScale(escala).setDepth(ponto.y);
    this.camadaMundo.add(objeto);
    this.objetosComBase.push({ objeto, baseY: ponto.y });
    this.objetosVisuais.set(nome, objeto);
  }

  private criarObjetoPlaceholder(chave: string, nome: string): void {
    const textura = this.textures.createCanvas(chave, 64, 64);
    if (!textura) return;
    const contexto = textura.context;
    contexto.imageSmoothingEnabled = false;
    contexto.fillStyle = '#c22121'; contexto.fillRect(8, 8, 48, 48);
    contexto.strokeStyle = '#202723'; contexto.lineWidth = 3; contexto.strokeRect(8, 8, 48, 48);
    contexto.fillStyle = '#ffffff'; contexto.font = '600 10px "Pixelify Sans Variable"'; contexto.fillText('RISCO', 13, 37);
    textura.refresh();
    console.warn(`[Missão Turno Seguro] Asset ausente: ${dadosRiscos[nome].arquivo}. Um placeholder será usado.`);
  }

  private aplicarBloqueiosDoRoteiro(): void {
    const bloquear = (nome: string, estado: boolean): void => {
      const ponto = this.mapa.pontos.get(nome);
      if (ponto) ponto.propriedades.bloqueado = estado;
      if (ponto && !estado) this.pontos.liberar(nome);
    };
    if (this.area === 'quarto') {
      bloquear('escrivaninha', !estadoJogo.flag('uniforme'));
      bloquear('porta', !estadoJogo.flag('mensagem-renata'));
    } else if (this.area === 'portaria') {
      bloquear('catraca', !estadoJogo.flag('porteiro-liberou'));
      bloquear('saida', !estadoJogo.flag('portaria-passou'));
    } else if (this.area === 'recepcao') {
      bloquear('saida', !estadoJogo.flag('catraca-facial'));
    } else if (this.area === 'vestiario') {
      bloquear('armario-epi', !estadoJogo.flag('mochila-guardada'));
      bloquear('estante-caixas', !estadoJogo.dados.respostas.D2);
      bloquear('catraca-fabrica', !estadoJogo.dados.respostas.D3);
    } else if (this.area === 'corredor-a') {
      bloquear('saida', !estadoJogo.flag('calendario-aberto') && !estadoJogo.flag('lembrete-calendario'));
    } else if (this.area === 'corredor-b') {
      bloquear('caio', !estadoJogo.flag('d4-feita'));
      bloquear('prancheta', !estadoJogo.flag('d5-a-d9-feitas'));
      bloquear('saida', !estadoJogo.flag('d10-d11-feitas'));
    }
  }

  private chegadaValida(): Ponto {
    const chegada = this.mapa.pontos.get('chegada');
    if (chegada && posicaoValida(chegada, this.geometria)) return chegada;
    console.warn(`[Mapa] Chegada ausente ou sem espaço para os pés em ${this.area}; buscando posição livre próxima.`);
    const referencia = chegada ?? { x: this.mapa.largura / 2, y: this.mapa.altura / 2 };
    let melhor: Ponto | undefined;
    let distancia = Infinity;
    for (let y = 0; y < this.mapa.altura; y += 4) {
      for (let x = 0; x < this.mapa.largura; x += 4) {
        const d = Math.hypot(x - referencia.x, y - referencia.y);
        if (d < distancia && posicaoValida({ x, y }, this.geometria)) { melhor = { x, y }; distancia = d; }
      }
    }
    return melhor ?? referencia;
  }

  private executarGatilho(nome: string): void {
    if (this.executando || this.aguardando || this.dialogo || this.transicao) return;
    const lista = roteiro.capitulos[String(this.capitulo)]?.mapas[this.area]?.[nome];
    if (!lista?.length) {
      if (nome === 'aoEntrar') this.restaurandoObjetivo = false;
      return;
    }
    this.fila = [...lista];
    this.executando = true;
    this.avancarRoteiro();
  }

  private readonly avancarRoteiro = (): void => {
    if (this.dialogo) this.dialogo = false;
    if (this.aguardando) this.aguardando = false;
    if (this.terminal || this.transicao) return;
    while (this.fila.length) {
      const passo = this.fila.shift();
      if (!passo) continue;
      if (this.executarPasso(passo)) return;
    }
    this.executando = false;
    this.restaurandoObjetivo = false;
  };

  private executarPasso(passo: Passo): boolean {
    const tipo = passo.tipo;
    if (tipo === 'fala' || tipo === 'pensamento') {
      this.dialogo = true;
      this.jogador.parar();
      const nome = estadoJogo.dados.personagem === 'lucas' ? 'Lucas' : 'Júlia';
      const personagem = String(passo.personagem ?? nome).replaceAll('{nome}', nome);
      const texto = String(passo.texto ?? '').replaceAll('{nome}', nome);
      eventos.emit(NOME_EVENTO_DIALOGO_ABRIR, {
        personagem,
        texto,
        expressao: String(passo.expressao ?? 'neutra'),
        pensando: Boolean(passo.pensando) || tipo === 'pensamento',
      });
      return true;
    }
    if (tipo === 'mensagem') {
      this.aguardando = Boolean(passo.exigirAbertura);
      eventos.emit('ui:mensagem', {
        remetente: String(passo.remetente ?? ''),
        texto: this.substituirNome(String(passo.texto ?? '')),
        respostas: passo.respostas as string[] | undefined,
        exigirAbertura: Boolean(passo.exigirAbertura),
      });
      return true;
    }
    if (tipo === 'decisao') {
      this.aguardando = true;
      eventos.emit('ui:decisao', { id: String(passo.id ?? '') });
      return true;
    }
    if (tipo === 'reacaoDecisao') {
      const id = String(passo.id ?? '');
      const resposta = estadoJogo.dados.respostas[id];
      const decisao = decisoes[id];
      const opcoes = decisao?.reacoes;
      if (resposta && opcoes) {
        const chave = resposta.opcao.split(',')[0];
        const chaveReacao = opcoes[chave] ? chave : 'outro';
        const texto = opcoes[chave] ?? opcoes.outro;
        if (texto) {
          const nome = String(passo.personagem ?? '');
          const nomeJogador = estadoJogo.dados.personagem === 'lucas' ? 'Lucas' : 'Júlia';
          const expressao = decisao.reacoesExpressoes?.[chaveReacao] ?? 'neutra';
          this.fila.unshift({ tipo: 'fala', personagem: nome, expressao, texto: texto.replaceAll('{nome}', nomeJogador) });
        }
      }
      return false;
    }
    if (tipo === 'acao') return this.executarAcao(passo);
    if (tipo === 'flag') {
      estadoJogo.definirFlag(String(passo.nome ?? ''), (passo.valor as boolean | string | number | undefined) ?? true);
      return false;
    }
    if (tipo === 'liberar' || tipo === 'bloquear') {
      this.pontos.executar({ tipo, ponto: String(passo.ponto ?? '') });
      return false;
    }
    if (tipo === 'se') {
      const condicao = passo.flag
        ? estadoJogo.flag(String(passo.flag))
        : passo.resposta ? Boolean(estadoJogo.dados.respostas[String(passo.resposta)])
          : passo.capitulo ? this.capitulo === Number(passo.capitulo) : false;
      const escolhidos = (condicao ? passo.passos : passo.senao) as Passo[] | undefined;
      if (escolhidos?.length) this.fila.unshift(...escolhidos);
      return false;
    }
    if (tipo === 'trocarSprite') {
      this.jogador.trocarTextura(`${estadoJogo.dados.personagem}${passo.sprite === 'pijama' ? '-pijama' : ''}`);
      return false;
    }
    if (tipo === 'mostrarNpc' || tipo === 'esconderNpc') {
      this.npcs.get(String(passo.nome ?? ''))?.setVisible(tipo === 'mostrarNpc');
      if (tipo === 'mostrarNpc') estadoJogo.definirFlag(`npc:${this.area}:${String(passo.nome ?? '')}`, true);
      return false;
    }
    if (tipo === 'moverNpc') return this.moverNpc(String(passo.nome ?? ''), String(passo.ponto ?? ''), String(passo.modo ?? 'entrar'));
    if (tipo === 'mostrarObjeto' || tipo === 'esconderObjeto') {
      this.objetosVisuais.get(String(passo.nome ?? ''))?.setVisible(tipo === 'mostrarObjeto');
      return false;
    }
    if (tipo === 'objetivo') {
      if (this.restaurandoObjetivo) return false;
      const ponto = typeof passo.ponto === 'string' && passo.ponto ? passo.ponto : undefined;
      this.objetivo = ponto;
      if (ponto && !this.mapa.pontos.has(ponto)) console.warn(`[Mapa] Ponto de objetivo ausente: ${ponto}.`);
      const texto = typeof passo.texto === 'string' ? passo.texto.trim() : '';
      if (texto) {
        const mudou = estadoJogo.definirObjetivo(texto, ponto);
        const dicaInicial = mudou && !estadoJogo.flag('dica-objetivo-vista');
        if (dicaInicial) estadoJogo.definirFlag('dica-objetivo-vista');
        eventos.emit(NOME_EVENTO_OBJETIVO, { texto, ...(ponto ? { ponto } : {}), animar: mudou, dicaInicial });
      }
      return false;
    }
    if (tipo === 'irPara') {
      this.transicionar(Number(passo.capitulo ?? this.capitulo), String(passo.area ?? 'posto') as Area);
      return true;
    }
    return false;
  }

  private executarAcao(passo: Passo): boolean {
    const acao = String(passo.acao ?? '');
    if (acao === 'som') { audioJogo.tocar(String(passo.som ?? '')); return false; }
    if (acao === 'musica') { audioJogo.trocarTrilha(Number(passo.capitulo ?? this.capitulo)); return false; }
    if (acao === 'dica') { eventos.emit('ui:dica', String(passo.texto ?? '')); return false; }
    if (acao === 'tutorial') return this.iniciarTutorial();
    if (acao === 'fade') {
      this.aguardando = true;
      const camera = this.cameras.main;
      const evento = passo.direcao === 'escurecer'
        ? Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE : Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE;
      camera.once(evento, () => this.avancarRoteiro());
      if (passo.direcao === 'escurecer') camera.fadeOut(fluxo.transicaoMs, 0, 0, 0);
      else camera.fadeIn(fluxo.transicaoMs, 0, 0, 0);
      return true;
    }
    if (acao === 'calendario' || acao === 'inspecao' || acao === 'relatoTablet') {
      this.aguardando = true;
      if (acao === 'inspecao') this.iniciarInspecao();
      eventos.emit(acao === 'calendario' ? 'ui:calendario' : acao === 'inspecao' ? 'ui:inspecao' : 'ui:relato');
      return true;
    }
    if (acao === 'cones') {
      this.aguardando = true;
      this.conesAtivos = true;
      this.conesSelecionados.splice(0);
      this.desenharMarcadores();
      eventos.emit('ui:cones');
      return true;
    }
    if (acao === 'ligarMaquina') {
      this.ligarMaquina();
      return false;
    }
    if (acao === 'resultado') {
      this.terminal = true;
      estadoJogo.definirFlag('jogo-concluido');
      eventos.emit('ui:resultado');
      return true;
    }
    return false;
  }

  private iniciarTutorial(): boolean {
    const forcar = new URLSearchParams(window.location.search).get('tutorial') === '1';
    if (this.area !== 'quarto' || this.capitulo !== 1 || (estadoJogo.dados.tutorialVisto && !forcar)) return false;
    this.etapaTutorial = 'andar';
    this.distanciaTutorialAndada = 0;
    this.ultimaPosicaoTutorial = { x: this.jogador.x, y: this.jogador.y };
    this.controles.definirEtapaTutorial('andar');
    eventos.emit('ui:tutorial-etapa', { etapa: 'andar' });
    return true;
  }

  private atualizarProgressoTutorial(): void {
    if (this.etapaTutorial !== 'andar' || !this.ultimaPosicaoTutorial) return;
    const atual = { x: this.jogador.x, y: this.jogador.y };
    this.distanciaTutorialAndada += Phaser.Math.Distance.Between(
      this.ultimaPosicaoTutorial.x,
      this.ultimaPosicaoTutorial.y,
      atual.x,
      atual.y,
    );
    this.ultimaPosicaoTutorial = atual;
    if (this.distanciaTutorialAndada < 40) return;
    this.etapaTutorial = 'objetivo';
    this.controles.definirEtapaTutorial('objetivo');
    const alvo = this.mapa.pontos.get('guarda-roupa');
    const posicaoMundo = alvo ? this.posicaoSeta(alvo, 0) : undefined;
    const seta = posicaoMundo ? this.posicaoNoCanvas(posicaoMundo.x, posicaoMundo.y) : undefined;
    eventos.emit('ui:tutorial-etapa', { etapa: 'objetivo', ...(seta ? { seta } : {}) });
  }

  private readonly avancarTutorial = (): void => {
    if (this.etapaTutorial !== 'objetivo') return;
    this.etapaTutorial = 'livre';
    this.controles.definirEtapaTutorial('livre');
    eventos.emit('ui:tutorial-etapa', { etapa: 'livre' });
  };

  private readonly pularTutorial = (): void => { this.finalizarTutorial(); };

  private finalizarTutorial(): void {
    if (!this.etapaTutorial) return;
    this.etapaTutorial = undefined;
    this.ultimaPosicaoTutorial = undefined;
    this.controles.definirEtapaTutorial('normal');
    estadoJogo.marcarTutorialVisto();
    eventos.emit('ui:tutorial-concluir');
    eventos.emit('roteiro:acao-concluida');
  }

  private posicaoNoCanvas(x: number, y: number): Ponto {
    const camera = this.cameras.main;
    const vista = camera.worldView;
    return {
      x: camera.x + (x - vista.x) * camera.width / Math.max(vista.width, 0.001),
      y: camera.y + (y - vista.y) * camera.height / Math.max(vista.height, 0.001),
    };
  }

  private posicaoSeta(alvo: PontoMapa, tempo: number): { x: number; y: number } {
    const camera = this.cameras.main;
    const margem = 20 / Math.max(camera.zoom, 0.1);
    const dentro = alvo.x >= camera.worldView.x + margem && alvo.x <= camera.worldView.right - margem
      && alvo.y >= camera.worldView.y + margem && alvo.y <= camera.worldView.bottom - margem;
    const x = dentro ? alvo.x : Phaser.Math.Clamp(alvo.x, camera.worldView.x + margem, camera.worldView.right - margem);
    const yBase = dentro ? alvo.y - regras.seta.deslocamentoY
      : Phaser.Math.Clamp(alvo.y, camera.worldView.y + margem, camera.worldView.bottom - margem);
    return { x, y: yBase + Math.sin(tempo / 240) * regras.seta.flutuacaoPixels };
  }

  private registrarDecisao(dados: { id: string; opcao: string; acertou: boolean; tentativas: string[] }): void {
    estadoJogo.responder(dados.id, { opcao: dados.opcao, acertou: dados.acertou, tentativas: dados.tentativas });
  }

  private registrarTentativa(dados: { id: string; opcoes: string[] }): void {
    dados.opcoes.forEach((opcao) => estadoJogo.registrarTentativa(dados.id, opcao));
  }

  private iniciarInspecao(): void {
    this.inspecaoAtiva = true;
    this.jogador.parar();
    this.balao.setVisible(false);
    const larguraTela = this.cameras.main.width;
    const alturaTela = this.cameras.main.height;
    const zoom = Math.min(larguraTela / this.mapa.largura, alturaTela / this.mapa.altura);
    this.cameras.main.stopFollow();
    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(this.mapa.largura / 2, this.mapa.altura / 2);
    this.desenharMarcadores();
  }

  private readonly finalizarInspecao = (): void => {
    if (!this.inspecaoAtiva) return;
    this.inspecaoAtiva = false;
    this.marcadores?.clear();
    this.cameras.main.setZoom(1);
    this.cameras.main.startFollow(this.jogador, true, teste.camera.suavizacao, teste.camera.suavizacao);
    this.aguardando = false;
    this.executarProximoPasso();
  };

  private readonly aguardarMensagemAberta = (): void => {
    this.aguardando = true;
    this.jogador.parar();
    this.balao.setVisible(false);
  };

  private executarProximoPasso(): void {
    this.avancarRoteiro();
  }

  private readonly confirmarCones = (): void => {
    if (!this.conesAtivos || this.conesSelecionados.length !== regras.decisoes.quantidadeCones) return;
    const pontosCorretos = this.conesSelecionados.every((nome) => this.mapa.pontos.get(nome)?.propriedades.certo === true);
    estadoJogo.responder('D4', { opcao: this.conesSelecionados.join(','), acertou: pontosCorretos, tentativas: [...this.conesSelecionados] });
    estadoJogo.definirFlag('d4-feita');
    this.conesAtivos = false;
    this.aguardando = false;
    this.marcadores?.clear();
    this.desenharFitaCones();
    eventos.emit('ui:esconder');
    this.avancarRoteiro();
  };

  private readonly aoTocarMapa = (ponteiro: Phaser.Input.Pointer): void => {
    if (!this.inspecaoAtiva && !this.conesAtivos) return;
    const posicao = this.cameras.main.getWorldPoint(ponteiro.x, ponteiro.y);
    if (this.inspecaoAtiva) {
      const item = [...this.mapa.pontos].filter(([nome, ponto]) =>
        (nome.startsWith('risco-') || nome.startsWith('falso-')) && this.distanciaToque(posicao, ponto) <= this.raioToque(ponto))
        .sort((a, b) => Phaser.Math.Distance.Between(posicao.x, posicao.y, a[1].x, a[1].y)
          - Phaser.Math.Distance.Between(posicao.x, posicao.y, b[1].x, b[1].y))[0];
      if (!item) return;
      const id = item[0];
      const marcado = estadoJogo.dados.inspecao.includes(id);
      estadoJogo.alternarInspecao(id);
      audioJogo.tocar(marcado ? 'desmarcar' : 'marcar');
      this.desenharMarcadores();
      eventos.emit('ui:inspecao-atualizar');
      return;
    }
    const cone = [...this.mapa.pontos].filter(([nome, ponto]) => nome.startsWith('cone-')
      && this.distanciaToque(posicao, ponto) <= this.raioToque(ponto))
      .sort((a, b) => Phaser.Math.Distance.Between(posicao.x, posicao.y, a[1].x, a[1].y)
        - Phaser.Math.Distance.Between(posicao.x, posicao.y, b[1].x, b[1].y))[0];
    if (!cone) return;
    const indice = this.conesSelecionados.indexOf(cone[0]);
    if (indice >= 0) this.conesSelecionados.splice(indice, 1);
    else if (this.conesSelecionados.length < regras.decisoes.quantidadeCones) this.conesSelecionados.push(cone[0]);
    this.desenharMarcadores();
    eventos.emit('ui:cones-atualizar', { selecionados: [...this.conesSelecionados] });
  };

  private raioToque(ponto: PontoMapa): number {
    return Math.max(this.pontos.raio(ponto), regras.inspecao.raioToqueMinimo / Math.max(this.cameras.main.zoom, 0.05));
  }

  private distanciaToque(posicao: Ponto, ponto: PontoMapa): number {
    return Phaser.Math.Distance.Between(posicao.x, posicao.y, ponto.x, ponto.y);
  }

  private desenharMarcadores(): void {
    if (!this.marcadores) this.marcadores = this.add.graphics().setDepth(100010);
    this.camadaMundo.add(this.marcadores);
    const g = this.marcadores.clear();
    if (this.inspecaoAtiva) {
      [...this.mapa.pontos].filter(([nome]) => nome.startsWith('risco-') || nome.startsWith('falso-')).forEach(([nome, ponto]) => {
        const selecionado = estadoJogo.dados.inspecao.includes(nome);
        g.lineStyle(selecionado ? 3 : 2, selecionado ? 0xffbb61 : 0xffffff, 1);
        g.strokeCircle(ponto.x, ponto.y - 18, this.raioToque(ponto) * 0.65);
      });
    } else if (this.conesAtivos) {
      [...this.mapa.pontos].filter(([nome]) => nome.startsWith('cone-')).forEach(([nome, ponto]) => {
        const selecionado = this.conesSelecionados.includes(nome);
        g.fillStyle(selecionado ? 0xffbb61 : 0x093f1a, 0.88).lineStyle(2, 0xffffff, 1);
        g.fillCircle(ponto.x, ponto.y - 8, 12);
        g.strokeCircle(ponto.x, ponto.y - 8, 12);
      });
    }
  }

  private desenharFitaCones(): void {
    const poça = this.mapa.pontos.get('poca');
    if (!poça) return;
    const g = this.add.graphics().setDepth(Math.max(...this.conesSelecionados.map((nome) => this.mapa.pontos.get(nome)?.y ?? poça.y)) + 1);
    this.camadaMundo.add(g);
    this.conesSelecionados.forEach((nome) => {
      const ponto = this.mapa.pontos.get(nome);
      if (!ponto) return;
      g.lineStyle(5, 0xf1dc8d, 0.95).lineBetween(ponto.x, ponto.y - 10, poça.x, poça.y - 12);
      g.lineStyle(2, 0x202723, 0.85).lineBetween(ponto.x, ponto.y - 10, poça.x, poça.y - 12);
    });
  }

  private moverNpc(nome: string, nomePonto: string, modo = 'entrar'): boolean {
    const npc = this.npcs.get(nome);
    const destino = this.mapa.pontos.get(nomePonto);
    if (!npc || !destino) {
      console.warn(`[Mapa] Não foi possível mover o NPC ${nome} até ${nomePonto}.`);
      return false;
    }
    const flagMovimento = modo === 'sair' ? `npc-moveu:${this.area}:${nome}:sair` : `npc-moveu:${this.area}:${nome}`;
    if (!estadoJogo.flag(flagMovimento)) {
      const origemX = modo === 'sair' ? npc.x : nome === 'caio' ? this.mapa.largura + 72 : Math.max(0, destino.x - 100);
      const origemY = modo === 'sair' ? npc.y : destino.y;
      npc.setPosition(origemX, origemY).setVisible(true).setDepth(origemY);
      this.aguardando = true;
      this.tweens.add({
        targets: npc, x: destino.x, y: destino.y, duration: 900, ease: 'Sine.easeOut',
        onUpdate: () => npc.setDepth(npc.y),
        onComplete: () => { estadoJogo.definirFlag(flagMovimento); this.avancarRoteiro(); },
      });
      return true;
    }
    npc.setPosition(destino.x, destino.y).setVisible(true);
    return false;
  }

  private ligarMaquina(): void {
    if (this.maquinaLigada) return;
    this.maquinaLigada = true;
    estadoJogo.definirFlag('maquina-ligada');
    this.objetosVisuais.forEach((objeto) => objeto.setVisible(false));
    const maquina = this.mapa.pontos.get('maquina');
    if (maquina) {
      const brilho = this.add.graphics().setDepth(maquina.y + 2);
      this.camadaMundo.add(brilho);
      brilho.fillStyle(0x39cf70, 0.3).fillCircle(maquina.x, maquina.y - 42, 17);
      brilho.fillStyle(0x78ff9f, 1).lineStyle(2, 0x123820, 1).fillCircle(maquina.x, maquina.y - 42, 8).strokeCircle(maquina.x, maquina.y - 42, 8);
    }
  }

  private criarSeta(): void {
    this.seta = this.add.graphics().setDepth(100020).setVisible(false);
    this.camadaMundo.add(this.seta);
    this.seta.fillStyle(0x202723, 1).lineStyle(1, 0xffbb61, 1).beginPath();
    this.seta.moveTo(0, -9).lineTo(8, 7).lineTo(0, 3).lineTo(-8, 7).closePath().fillPath().strokePath();
  }

  private atualizarSeta(tempo: number): void {
    if (!this.seta || !this.objetivo || this.dialogo || this.aguardando || this.inspecaoAtiva || this.conesAtivos || this.terminal) {
      this.seta?.setVisible(false);
      return;
    }
    const alvo = this.mapa.pontos.get(this.objetivo);
    if (!alvo) { this.seta.setVisible(false); return; }
    const camera = this.cameras.main;
    const margem = 20 / Math.max(camera.zoom, 0.1);
    const dentro = alvo.x >= camera.worldView.x + margem && alvo.x <= camera.worldView.right - margem
      && alvo.y >= camera.worldView.y + margem && alvo.y <= camera.worldView.bottom - margem;
    const centro = { x: camera.worldView.centerX, y: camera.worldView.centerY };
    const x = dentro ? alvo.x : Phaser.Math.Clamp(alvo.x, camera.worldView.x + margem, camera.worldView.right - margem);
    const yBase = dentro ? alvo.y - regras.seta.deslocamentoY : Phaser.Math.Clamp(alvo.y, camera.worldView.y + margem, camera.worldView.bottom - margem);
    const y = yBase + Math.sin(tempo / 240) * regras.seta.flutuacaoPixels;
    const angulo = dentro ? 0 : Math.atan2(alvo.y - centro.y, alvo.x - centro.x) + Math.PI / 2;
    this.seta.setPosition(x, y).setRotation(angulo).setVisible(true);
  }

  private verificarSaidaBloqueada(posicao: Ponto): void {
    const bloqueada = this.pontos.saidaBloqueada(posicao);
    if (!bloqueada) { this.saidaBloqueadaEmAlcance = false; return; }
    if (!this.saidaBloqueadaEmAlcance) {
      this.saidaBloqueadaEmAlcance = true;
      this.executarGatilho('aoTentarSair');
      if (!roteiro.capitulos[String(this.capitulo)]?.mapas[this.area]?.aoTentarSair) {
        eventos.emit('ui:dica', 'saida-bloqueada');
      }
    }
  }

  private sair(nome: string): void {
    if (this.transicao || this.executando || this.aguardando || this.dialogo) return;
    eventos.emit('mapa:saida', { area: this.area, ponto: nome });
    this.executarGatilho('aoSair');
    if (!this.executando) {
      const proximo = (fluxo.proximos as Record<string, Area>)[this.area];
      if (proximo) this.transicionar(Math.min(7, this.capitulo + 1), proximo);
    }
  }

  private transicionar(capitulo: number, area: Area): void {
    if (this.transicao) return;
    this.transicao = true;
    this.jogador.parar();
    estadoJogo.iniciarCapitulo(capitulo, area);
    const porta = (this.area === 'quarto' && area === 'portaria')
      || (this.area === 'recepcao' && area === 'vestiario');
    if (porta) audioJogo.tocar('porta');
    if (this.area === 'vestiario' && area === 'corredor-a') audioJogo.tocar('catraca');
    audioJogo.trocarTrilha(capitulo);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (porta) audioJogo.tocar('porta-fechar');
      this.scene.restart({ area, capitulo });
    });
    this.cameras.main.fadeOut(fluxo.transicaoMs, 0, 0, 0);
  }

  private jogarNovamente = (): void => {
    const personagem = estadoJogo.dados.personagem;
    estadoJogo.novo(personagem);
    estadoJogo.iniciarCapitulo(1, 'quarto');
    this.scene.start('Mapa', { capitulo: 1, area: 'quarto' });
  };

  private voltarMenu = (): void => { this.scene.start('Menu'); };

  private substituirNome(texto: string): string {
    return texto.replaceAll('{nome}', estadoJogo.dados.personagem === 'lucas' ? 'Lucas' : 'Júlia');
  }

  private desenharDebug(): void {
    if (this.debug) {
      const g = this.debug.clear();
      const poligono = (pontos: Ponto[], cor: number): void => {
        if (!pontos.length) return;
        g.lineStyle(1, cor).fillStyle(cor, 0.14).beginPath().moveTo(pontos[0].x, pontos[0].y);
        pontos.slice(1).forEach((ponto) => g.lineTo(ponto.x, ponto.y));
        g.closePath().fillPath().strokePath();
      };
      poligono(this.mapa.caminhavel, 0x35d05f);
      this.mapa.obstaculos.forEach((obstaculo) => poligono(obstaculo.pontos, 0xc22121));
      this.mapa.pontos.forEach((ponto) => {
        const cor = ponto.propriedades.bloqueado ? 0xc22121 : 0x1b78bf;
        g.lineStyle(1, cor).strokeCircle(ponto.x, ponto.y, this.pontos.raio(ponto));
      });
      pontosDosPes({ x: this.jogador.x, y: this.jogador.y + teste.jogador.deslocamentoBasePes }, this.mapa.elipsePes)
        .forEach((ponto) => g.fillStyle(0xffbb61).fillCircle(ponto.x, ponto.y, 2));
    }
    eventos.emit(NOME_EVENTO_DEPURACAO_ATUALIZAR, {
      fps: this.game.loop.actualFps,
      direcao: this.controles.direcao(),
      pontos: [...this.mapa.pontos].map(([nome, ponto]) => ({ nome, x: ponto.x, y: ponto.y })),
      camera: { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY },
    });
  }
}
