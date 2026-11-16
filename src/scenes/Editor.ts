import Phaser from 'phaser';
import textos from '../data/editor.json';
import teste from '../data/teste.json';
import { eventos } from '../state/eventos';
import { Jogador } from '../entities/Jogador';
import { Controles } from '../input/Controles';
import { pontoDentroDoPoligono, posicaoValida, type Ponto, type GeometriaColisao } from '../systems/Colisao';
import { lerMapaTiled, poligonoDoObjeto, propriedadesComoObjeto } from '../systems/MapaTiled';
import { ModeloEditor, areas, pontosDaArea, type Area, type CamadaEditor, type DocumentoEditor, type ObjetoEditor } from '../systems/ModeloEditor';
import { configurarCameraMapa } from '../systems/CameraMapa';
import { Profundidade } from '../systems/Profundidade';

interface Comando {
  acao: string; nome?: string; propriedades?: Record<string, unknown>; raio?: number; baseY?: number;
}
interface Selecao { camada: CamadaEditor; id: number; vertice?: number }
const camadas: CamadaEditor[] = ['caminhavel', 'colisao', 'oclusores', 'pontos'];

export class Editor extends Phaser.Scene {
  private area?: Area;
  private modelo!: ModeloEditor;
  private grafico!: Phaser.GameObjects.Graphics;
  private fundo!: Phaser.GameObjects.Image;
  private ferramenta = 'v';
  private vertices: Ponto[] = [];
  private selecao?: Selecao;
  private nomePonto = 'chegada';
  private inicio?: Ponto;
  private ultimo?: Ponto;
  private antes = '';
  private arrastandoRetangulo = false;
  private pan?: { x: number; y: number; scrollX: number; scrollY: number };
  private espaco = false;
  private grade = false;
  private basePendente?: number;
  private cursor: Ponto = { x: 0, y: 0 };
  private jogador?: Jogador;
  private controles!: Controles;
  private profundidade?: Profundidade;
  private geometria?: GeometriaColisao;
  private cameraAnterior?: { x: number; y: number; zoom: number };
  private documentoArquivo?: DocumentoEditor;
  private dataArquivo = 0;
  private largura = 512;
  private altura = 768;
  constructor() { super('Editor'); }
  preload(): void {
    const parametro = new URLSearchParams(location.search).get('mapa');
    this.area = areas.find(area => area === parametro);
    if (!this.area) return;
    this.load.on(Phaser.Loader.Events.FILE_LOAD, (arquivo: Phaser.Loader.File) => {
      if (arquivo.key === 'editor-mapa') {
        this.dataArquivo = Date.parse(arquivo.xhrLoader?.getResponseHeader('Last-Modified') ?? '') || 0;
      }
    });
    this.load.image('editor-fundo', `/assets/mapas/${this.area}/fundo.png`);
    this.load.json('editor-mapa', `/assets/mapas/${this.area}/mapa.json`);
  }
  create(): void {
    if (!this.area) return;
    this.documentoArquivo = this.cache.json.get('editor-mapa') as DocumentoEditor | undefined;
    this.modelo = new ModeloEditor(this.area, this.documentoArquivo);
    if (!this.documentoArquivo) this.mensagem(textos.semMapa);
    try {
      const rascunho = localStorage.getItem(this.chaveRascunho());
      if (rascunho) {
        const dados = JSON.parse(rascunho) as { salvoEm: number; documento: DocumentoEditor };
        if (dados.salvoEm > Math.max(this.documentoArquivo?.editorAtualizadoEm ?? 0, this.dataArquivo)) {
          this.modelo = new ModeloEditor(this.area, dados.documento); this.mensagem(textos.rascunho);
        }
      }
    } catch { this.mensagem(textos.rascunhoFalhou); }
    if (!this.textures.exists('editor-fundo')) {
      console.warn(textos.semFundo);
      const textura = this.textures.createCanvas('editor-fundo', 512, 768)!;
      textura.context.fillStyle = '#0d1a12'; textura.context.fillRect(0, 0, 512, 768); textura.refresh();
    }
    this.fundo = this.add.image(0, 0, 'editor-fundo').setOrigin(0).setDepth(-100000);
    const imagem = this.fundo.texture.getSourceImage();
    this.largura = imagem.width; this.altura = imagem.height;
    this.modelo.definirTamanho(this.largura, this.altura);
    this.grafico = this.add.graphics().setDepth(100000);
    this.cameras.main.roundPixels = true;
    this.cameras.main.setBackgroundColor('#0d1a12');
    this.cameras.main.centerOn(this.largura / 2, this.altura / 2);
    this.controles = new Controles(this);
    this.input.on('pointerdown', this.abaixar, this);
    this.input.on('pointermove', this.mover, this);
    this.input.on('pointerup', this.levantar, this);
    this.input.on('pointerupoutside', this.levantar, this);
    this.input.on('wheel', this.roda, this);
    eventos.on('editor:comando', this.comando, this);
    eventos.on('editor:espaco', this.definirEspaco, this);
    eventos.on('editor:foco', this.definirFoco, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventos.off('editor:comando', this.comando, this);
      eventos.off('editor:espaco', this.definirEspaco, this);
      eventos.off('editor:foco', this.definirFoco, this);
      this.profundidade?.destruir();
    });
    this.atualizarInterface();
  }
  private definirEspaco(valor: boolean): void { this.espaco = valor; }
  private definirFoco(valor: boolean): void { if (this.input.keyboard) this.input.keyboard.enabled = !valor; }
  private chaveRascunho(): string { return `turno-seguro:editor:${this.area}`; }
  private mensagem(texto: string): void { eventos.emit('editor:mensagem', texto); }
  private objetoSelecionado(): ObjetoEditor | undefined {
    return this.selecao && this.modelo.objetos(this.selecao.camada).find(o => o.id === this.selecao!.id);
  }
  private atualizarInterface(): void {
    eventos.emit('editor:estado', { ferramenta: this.ferramenta, teste: !!this.jogador,
      selecionado: this.objetoSelecionado(), pontos: this.modelo.objetos('pontos').map(p => p.name) });
  }
  private alterado(): void {
    try { localStorage.setItem(this.chaveRascunho(), JSON.stringify({ salvoEm: Date.now(), documento: this.modelo.documento })); }
    catch { this.mensagem(textos.rascunhoFalhou); }
    this.atualizarInterface();
  }
  private coordenada(pointer: Phaser.Input.Pointer): Ponto {
    const ponto = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return { x: Math.round(Phaser.Math.Clamp(ponto.x, 0, this.largura)), y: Math.round(Phaser.Math.Clamp(ponto.y, 0, this.altura)) };
  }
  private abaixar(pointer: Phaser.Input.Pointer): void {
    if (this.jogador) return;
    if (this.espaco || pointer.middleButtonDown()) {
      this.pan = { x: pointer.x, y: pointer.y, scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY }; return;
    }
    if (!pointer.leftButtonDown()) return;
    const ponto = this.coordenada(pointer);
    if (this.basePendente !== undefined) {
      const objeto = this.modelo.objetos('oclusores').find(o => o.id === this.basePendente)!;
      this.modelo.alterar(() => { objeto.properties = [{ name: 'baseY', type: 'int', value: ponto.y }]; });
      this.basePendente = undefined; this.alterado(); return;
    }
    if (this.ferramenta === 'c' || (this.ferramenta === 'o' && !pointer.event.shiftKey)) {
      if (this.vertices.length >= 3 && Phaser.Math.Distance.BetweenPoints(this.vertices[0], ponto) < 8 / this.cameras.main.zoom) this.fecharPoligono();
      else this.vertices.push(ponto);
      return;
    }
    this.antes = this.modelo.fotografia(); this.inicio = ponto; this.ultimo = ponto;
    if (this.ferramenta === 'u' || this.ferramenta === 'o') { this.arrastandoRetangulo = true; return; }
    if (this.ferramenta === 'p') {
      const proximo = this.encontrar(ponto);
      let objeto = proximo?.camada === 'pontos'
        ? this.modelo.objetos('pontos').find(o => o.id === proximo.id)
        : this.modelo.objetos('pontos').find(o => o.name === this.nomePonto);
      const movendoExistente = proximo?.camada === 'pontos';
      if (!objeto) {
        const definicao = pontosDaArea(this.area!).find(p => p.nome === this.nomePonto)!;
        objeto = this.modelo.adicionar('pontos', { name: this.nomePonto, ...ponto, point: true,
          properties: this.propriedadesTiled(definicao.propriedades) });
      } else if (!movendoExistente) { objeto.x = ponto.x; objeto.y = ponto.y; }
      this.nomePonto = objeto.name ?? this.nomePonto;
      this.selecao = { camada: 'pontos', id: objeto.id }; return;
    }
    this.selecao = this.encontrar(ponto); this.atualizarInterface();
  }
  private encontrar(ponto: Ponto): Selecao | undefined {
    const alcance = 8 / this.cameras.main.zoom;
    for (const camada of [...camadas].reverse()) {
      for (const objeto of [...this.modelo.objetos(camada)].reverse()) {
        if (camada === 'pontos' && Phaser.Math.Distance.BetweenPoints(objeto, ponto) <= Math.max(alcance, 10)) return { camada, id: objeto.id };
        const poligono = poligonoDoObjeto(objeto);
        if (objeto.polygon) {
          const vertice = poligono.findIndex(p => Phaser.Math.Distance.BetweenPoints(p, ponto) <= alcance);
          if (vertice >= 0) return { camada, id: objeto.id, vertice };
        }
        if (pontoDentroDoPoligono(ponto, poligono)) return { camada, id: objeto.id };
      }
    }
  }
  private mover(pointer: Phaser.Input.Pointer): void {
    this.cursor = this.coordenada(pointer);
    if (this.pan) {
      const camera = this.cameras.main;
      camera.setScroll(Math.round(this.pan.scrollX - (pointer.x - this.pan.x) / camera.zoom),
        Math.round(this.pan.scrollY - (pointer.y - this.pan.y) / camera.zoom)); return;
    }
    if (!this.inicio || !this.ultimo || this.arrastandoRetangulo || this.jogador) return;
    const objeto = this.objetoSelecionado(); if (!objeto) return;
    const dx = this.cursor.x - this.ultimo.x, dy = this.cursor.y - this.ultimo.y;
    if (this.selecao?.vertice !== undefined && objeto.polygon) {
      // Converte o deslocamento para o eixo local de objetos importados rotacionados.
      const angulo = -(objeto.rotation ?? 0) * Math.PI / 180;
      objeto.polygon[this.selecao.vertice].x += Math.round(dx * Math.cos(angulo) - dy * Math.sin(angulo));
      objeto.polygon[this.selecao.vertice].y += Math.round(dx * Math.sin(angulo) + dy * Math.cos(angulo));
    } else {
      const baseAnterior = Number(propriedadesComoObjeto(objeto.properties).baseY ?? objeto.y + (objeto.height ?? 0));
      objeto.x += dx; objeto.y += dy;
      if (this.selecao?.camada === 'oclusores') {
        const props = propriedadesComoObjeto(objeto.properties);
        objeto.properties = this.propriedadesTiled({ ...props, baseY: baseAnterior + dy });
      }
    }
    this.ultimo = this.cursor;
  }
  private levantar(pointer: Phaser.Input.Pointer): void {
    if (this.pan) { this.pan = undefined; return; }
    if (!this.inicio) return;
    if (this.arrastandoRetangulo) {
      const fim = this.coordenada(pointer), inicio = this.inicio;
      const width = Math.abs(fim.x - inicio.x), height = Math.abs(fim.y - inicio.y);
      if (width > 0 && height > 0) {
        const camada = this.ferramenta === 'u' ? 'oclusores' : 'colisao';
        const objeto = this.modelo.adicionar(camada, { name: `${camada}-${Date.now()}`,
          x: Math.min(fim.x, inicio.x), y: Math.min(fim.y, inicio.y), width, height });
        this.selecao = { camada, id: objeto.id };
        if (camada === 'oclusores') { this.basePendente = objeto.id; this.mensagem(textos.oclusor); }
      }
    }
    const mudou = this.modelo.confirmar(this.antes); this.inicio = undefined; this.ultimo = undefined;
    this.arrastandoRetangulo = false;
    if (mudou) this.alterado(); else this.atualizarInterface();
  }
  private roda(pointer: Phaser.Input.Pointer, _objetos: unknown[], _dx: number, dy: number): void {
    if (this.jogador || dy === 0) return;
    const camera = this.cameras.main, antes = camera.getWorldPoint(pointer.x, pointer.y);
    camera.setZoom(Phaser.Math.Clamp(camera.zoom + (dy < 0 ? 1 : -1), 1, 4));
    // Fórmula explícita evita usar a matriz de câmera do quadro anterior.
    camera.scrollX = Math.round(antes.x - camera.width / 2 - (pointer.x - camera.width / 2) / camera.zoom);
    camera.scrollY = Math.round(antes.y - camera.height / 2 - (pointer.y - camera.height / 2) / camera.zoom);
  }
  private fecharPoligono(): void {
    if (this.vertices.length < 3) return;
    const camada = this.ferramenta === 'c' ? 'caminhavel' : 'colisao';
    this.modelo.alterar(() => {
      const objeto = this.modelo.adicionar(camada, { name: camada, x: 0, y: 0, polygon: structuredClone(this.vertices) });
      this.selecao = { camada, id: objeto.id };
    });
    this.vertices = []; this.alterado();
  }
  private propriedadesTiled(props: Record<string, unknown>) {
    return Object.entries(props).map(([name, value]) => ({ name,
      type: typeof value === 'boolean' ? 'bool' : typeof value === 'number' ? (Number.isInteger(value) ? 'int' : 'float') : 'string',
      value: typeof value === 'object' ? JSON.stringify(value) : value,
    }));
  }
  private comando(dados: Comando): void {
    if (!this.area) return;
    const acao = dados.acao;
    // Uma ação na barra/atalho pode acontecer antes de soltar o mouse.
    // Desfaz o gesto incompleto para não deixar referências e snapshots obsoletos.
    if (this.inicio) {
      this.modelo.documento = JSON.parse(this.antes) as DocumentoEditor;
      this.inicio = undefined; this.ultimo = undefined; this.arrastandoRetangulo = false;
    }
    this.pan = undefined;
    if (acao === 'testar' || (acao === 'esc' && this.jogador)) { this.alternarTeste(); return; }
    if (this.jogador) return;
    if (['c', 'o', 'u', 'p', 'v', 'ponto'].includes(acao)) {
      this.ferramenta = acao === 'ponto' ? 'p' : acao; this.vertices = []; this.basePendente = undefined;
      if (dados.nome) this.nomePonto = dados.nome;
    } else if (acao === 'esc') { this.vertices = []; this.basePendente = undefined; this.selecao = undefined; }
    else if (acao === 'fechar') this.fecharPoligono();
    else if (acao === 'grade') this.grade = !this.grade;
    else if (acao === 'desfazer' || acao === 'refazer') {
      this.vertices = []; this.basePendente = undefined; this.selecao = undefined;
      this.modelo[acao](); this.alterado();
    } else if (acao === 'apagar' && this.selecao) {
      const selecao = this.selecao;
      this.modelo.alterar(() => {
        const objetos = this.modelo.objetos(selecao.camada); const i = objetos.findIndex(o => o.id === selecao.id);
        if (i >= 0) objetos.splice(i, 1);
      }); this.selecao = undefined; this.basePendente = undefined; this.alterado();
    } else if (acao === 'propriedades') {
      const objeto = this.objetoSelecionado(); if (!objeto) return;
      this.modelo.alterar(() => { objeto.properties = this.propriedadesTiled({ ...dados.propriedades,
        ...(this.selecao?.camada === 'pontos' ? { raio: dados.raio } : {}),
        ...(this.selecao?.camada === 'oclusores' ? { baseY: dados.baseY } : {}),
      }); }); this.alterado();
    } else if (acao === 'reabrir') {
      this.modelo = new ModeloEditor(this.area, this.documentoArquivo);
      this.modelo.definirTamanho(this.largura, this.altura); this.selecao = undefined;
      this.vertices = []; this.basePendente = undefined; localStorage.removeItem(this.chaveRascunho());
    } else if (acao === 'exportar' || acao === 'salvar') void this.salvar(acao);
    this.atualizarInterface();
  }
  private async salvar(acao: string): Promise<void> {
    const avisos = this.modelo.validar(); const conteudo = this.modelo.exportar();
    const fotografia = this.modelo.fotografia();
    if (acao === 'exportar') {
      eventos.emit('editor:arquivo', conteudo); this.mensagem([textos.exportado, ...avisos].join('\n')); return;
    }
    if (!import.meta.env.DEV) return;
    try {
      const resposta = await fetch(`/__editor/mapa?area=${this.area}`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: conteudo });
      if (!resposta.ok) throw new Error(await resposta.text());
      this.documentoArquivo = JSON.parse(conteudo) as DocumentoEditor;
      if (fotografia === this.modelo.fotografia()) localStorage.removeItem(this.chaveRascunho());
      this.mensagem([textos.salvo, ...avisos].join('\n'));
    } catch (erro) { this.mensagem(textos.erroSalvar + String(erro)); }
  }
  private alternarTeste(): void {
    const camera = this.cameras.main;
    if (this.jogador) {
      this.jogador.destroy(); this.jogador = undefined; this.profundidade?.destruir(); this.profundidade = undefined;
      camera.stopFollow(); camera.removeBounds();
      camera.setZoom(this.cameraAnterior!.zoom).setScroll(this.cameraAnterior!.x, this.cameraAnterior!.y);
      this.grafico.setVisible(true); this.atualizarInterface(); return;
    }
    const mapa = lerMapaTiled(this.modelo.documento, () => {});
    this.geometria = { caminhavel: mapa.caminhavel, obstaculos: mapa.obstaculos, elipsePes: mapa.elipsePes };
    const chegada = mapa.pontos.get('chegada');
    if (!chegada || !posicaoValida(chegada, this.geometria)) { this.mensagem(textos.semChegada); return; }
    this.cameraAnterior = { x: camera.scrollX, y: camera.scrollY, zoom: camera.zoom };
    this.jogador = new Jogador(this, chegada.x, chegada.y - teste.jogador.deslocamentoBasePes, 'jogador', teste.jogador);
    this.profundidade = new Profundidade(this, this.fundo.texture.key, mapa.oclusores);
    camera.setZoom(1);
    configurarCameraMapa(camera, this.largura, this.altura);
    camera.startFollow(this.jogador, true, teste.camera.suavizacao, teste.camera.suavizacao);
    this.grafico.setVisible(false); eventos.emit('editor:rotulos', []);
    this.mensagem(textos.teste); this.atualizarInterface();
  }
  update(_tempo: number, delta: number): void {
    if (!this.area) return;
    if (this.jogador && this.geometria) { this.jogador.mover(this.controles.direcao(), delta, this.geometria); return; }
    const g = this.grafico.clear(), zoom = this.cameras.main.zoom;
    if (this.grade) {
      g.lineStyle(1 / zoom, 0xffffff, 0.12);
      for (let x = 0; x <= this.largura; x += 16) g.lineBetween(x, 0, x, this.altura);
      for (let y = 0; y <= this.altura; y += 16) g.lineBetween(0, y, this.largura, y);
    }
    const desenhar = (pontos: Ponto[], cor: number, fechar = true): void => {
      if (!pontos.length) return;
      g.lineStyle(1 / zoom, cor, 1).fillStyle(cor, 0.18).beginPath().moveTo(pontos[0].x, pontos[0].y);
      pontos.slice(1).forEach(p => g.lineTo(p.x, p.y));
      if (fechar) { g.closePath(); g.fillPath(); } g.strokePath();
      pontos.forEach(p => g.fillStyle(cor, 1).fillCircle(p.x, p.y, 3 / zoom));
    };
    for (const camada of camadas) {
      const cor = camada === 'caminhavel' ? 0x35d05f : camada === 'colisao' ? 0xc22121 : camada === 'oclusores' ? 0xffbb61 : 0x1b78bf;
      for (const objeto of this.modelo.objetos(camada)) {
        const selecionado = this.selecao?.id === objeto.id;
        const props = propriedadesComoObjeto(objeto.properties);
        if (camada === 'pontos') {
          g.lineStyle((selecionado ? 2 : 1) / zoom, selecionado ? 0xffffff : cor);
          g.strokeCircle(objeto.x, objeto.y, Number(props.raio ?? 24));
          g.fillStyle(cor, 1).fillCircle(objeto.x, objeto.y, 4 / zoom);
        } else {
          desenhar(poligonoDoObjeto(objeto), selecionado ? 0xffffff : cor);
          if (camada === 'oclusores') g.lineStyle(2 / zoom, cor).lineBetween(objeto.x,
            Number(props.baseY ?? objeto.y + (objeto.height ?? 0)), objeto.x + (objeto.width ?? 0),
            Number(props.baseY ?? objeto.y + (objeto.height ?? 0)));
        }
      }
    }
    desenhar([...this.vertices, ...(this.vertices.length ? [this.cursor] : [])], 0xffffff, false);
    if (this.arrastandoRetangulo && this.inicio) {
      g.lineStyle(1 / zoom, 0xffffff).strokeRect(this.inicio.x, this.inicio.y, this.cursor.x - this.inicio.x, this.cursor.y - this.inicio.y);
    }
    if (this.basePendente !== undefined) g.lineStyle(1 / zoom, 0xffbb61).lineBetween(0, this.cursor.y, this.largura, this.cursor.y);
    const camera = this.cameras.main, topo = camera.getWorldPoint(0, 0);
    const rotulos = this.modelo.objetos('pontos').map(p => ({ nome: p.name ?? '', x: (p.x - topo.x) * zoom, y: (p.y - topo.y) * zoom }));
    rotulos.push({ nome: `${this.cursor.x}, ${this.cursor.y} px · ${zoom}×`, x: 6, y: 12 });
    eventos.emit('editor:rotulos', rotulos);
  }
}
