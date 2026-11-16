import lista from '../data/mapas/pontos.json';
import textos from '../data/editor.json';
import { lerMapaTiled, propriedadesComoObjeto, type DocumentoTiled, type ObjetoTiled } from './MapaTiled';
import { pontoDentroDoPoligono } from './Colisao';

export const areas = Object.keys(lista) as Array<keyof typeof lista>;
export type Area = keyof typeof lista;
export type CamadaEditor = 'caminhavel' | 'colisao' | 'oclusores' | 'pontos';
export type ObjetoEditor = ObjetoTiled & { id: number };
export type DocumentoEditor = DocumentoTiled & { editorAtualizadoEm?: number };
export const pontosDaArea = (area: Area) => lista[area];

export function documentoVazio(): DocumentoEditor {
  return { type: 'map', version: '1.10', tiledversion: '1.11.0', orientation: 'orthogonal',
    renderorder: 'right-down', width: 16, height: 24, tilewidth: 32, tileheight: 32,
    infinite: false, layers: ['caminhavel', 'colisao', 'oclusores', 'pontos'].map((name, i) => ({
      id: i + 1, name, type: 'objectgroup', draworder: 'topdown', objects: [],
    })),
  } as DocumentoEditor;
}

export class ModeloEditor {
  documento: DocumentoEditor;
  private anteriores: string[] = [];
  private seguintes: string[] = [];
  constructor(readonly area: Area, documento = documentoVazio()) {
    this.documento = structuredClone(documento);
    for (const nome of ['caminhavel', 'colisao', 'oclusores', 'pontos'] as CamadaEditor[]) {
      if (!this.documento.layers?.some(c => c.name === nome && c.type === 'objectgroup')) {
        this.documento.layers ??= [];
        this.documento.layers.push({ name: nome, type: 'objectgroup', objects: [] });
      }
    }
    let id = Math.max(0, ...(this.documento.layers ?? []).flatMap(c => (c.objects ?? []).map(o => o.id ?? 0))) + 1;
    const usados = new Set<number>();
    for (const [indice, camada] of (this.documento.layers ?? []).entries()) {
      camada.id = indice + 1;
      for (const objeto of camada.objects ?? []) {
        if (!objeto.id || usados.has(objeto.id)) objeto.id = id++;
        usados.add(objeto.id);
      }
    }
  }
  objetos(camada: CamadaEditor): ObjetoEditor[] {
    const dados = this.documento.layers!.find(c => c.name === camada && c.type === 'objectgroup')!;
    dados.objects ??= [];
    return dados.objects as ObjetoEditor[];
  }
  definirTamanho(largura: number, altura: number): void {
    // Um tile por pixel preserva exatamente fundos de dimensões não múltiplas de 32.
    this.documento.width = largura; this.documento.height = altura;
    this.documento.tilewidth = 1; this.documento.tileheight = 1;
  }
  fotografia(): string { return JSON.stringify(this.documento); }
  confirmar(antes: string): boolean {
    if (antes === this.fotografia()) return false;
    this.anteriores.push(antes);
    if (this.anteriores.length > 100) this.anteriores.shift();
    this.seguintes = [];
    this.documento.editorAtualizadoEm = Date.now();
    return true;
  }
  alterar(acao: () => void): void { const antes = this.fotografia(); acao(); this.confirmar(antes); }
  desfazer(): void {
    const anterior = this.anteriores.pop();
    if (!anterior) return;
    this.seguintes.push(this.fotografia()); this.documento = JSON.parse(anterior);
  }
  refazer(): void {
    const seguinte = this.seguintes.pop();
    if (!seguinte) return;
    this.anteriores.push(this.fotografia()); this.documento = JSON.parse(seguinte);
  }
  adicionar(camada: CamadaEditor, objeto: ObjetoTiled): ObjetoEditor {
    const id = Math.max(0, ...(this.documento.layers ?? []).flatMap(c => (c.objects ?? []).map(o => o.id ?? 0))) + 1;
    const novo = { name: '', rotation: 0, visible: true, width: 0, height: 0, ...objeto, id };
    if (camada === 'caminhavel') this.objetos(camada).splice(0);
    this.objetos(camada).push(novo);
    return novo;
  }
  validar(): string[] {
    const avisos: string[] = [];
    const mapa = lerMapaTiled(this.documento, () => {});
    if (mapa.caminhavel.length < 3) avisos.push(textos.semCaminhavel);
    const faltantes = pontosDaArea(this.area).filter(p => !mapa.pontos.has(p.nome));
    if (faltantes.length) avisos.push(textos.faltamPontos + faltantes.map(p => p.nome).join(', '));
    for (const [nome, ponto] of mapa.pontos) {
      const tipo = pontosDaArea(this.area).find(p => p.nome === nome)?.tipo
        ?? propriedadesComoObjeto(this.objetos('pontos').find(p => p.name === nome)?.properties).tipo;
      const tipos = Array.isArray(tipo) ? tipo : [tipo];
      if (!tipos.includes('objeto') && !tipos.includes('toque')
        && !pontoDentroDoPoligono(ponto, mapa.caminhavel)) avisos.push(textos.fora + nome);
    }
    return avisos;
  }
  exportar(): string {
    const documento = structuredClone(this.documento) as DocumentoEditor & Record<string, unknown>;
    documento.nextobjectid = Math.max(0, ...(documento.layers ?? []).flatMap(c => (c.objects ?? []).map(o => o.id ?? 0))) + 1;
    documento.nextlayerid = (documento.layers?.length ?? 0) + 1;
    documento.editorAtualizadoEm = Date.now();
    return JSON.stringify(documento, null, 2);
  }
}
