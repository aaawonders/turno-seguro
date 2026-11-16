import { eventos } from '../state/eventos';
import textos from '../data/editor.json';
import { areas, pontosDaArea, type Area, type ObjetoEditor } from '../systems/ModeloEditor';
import { propriedadesComoObjeto } from '../systems/MapaTiled';

export interface EstadoEditor {
  ferramenta: string;
  pontos: string[];
  selecionado?: ObjetoEditor;
  teste: boolean;
}
export interface RotuloEditor { nome: string; x: number; y: number }
export class EditorUI {
  private readonly painel = document.createElement('aside');
  private readonly rotulos = document.createElement('div');
  private readonly mensagem = document.createElement('p');
  private readonly listaPontos = document.createElement('div');
  private readonly raio = document.createElement('input');
  private readonly base = document.createElement('input');
  private readonly propriedades = document.createElement('textarea');
  private readonly selecao = document.createElement('p');
  private readonly botoes = new Map<string, HTMLButtonElement>();
  private testando = false;
  constructor(private readonly raiz: HTMLElement, area?: Area) {
    document.body.classList.add('modo-editor');
    this.painel.className = 'painel-editor'; this.rotulos.className = 'rotulos-editor';
    this.raiz.append(this.painel, this.rotulos);
    const titulo = document.createElement('h1'); titulo.textContent = textos.titulo; this.painel.append(titulo);
    const areasSelect = document.createElement('select');
    areasSelect.append(new Option(textos.campos.area, ''));
    for (const nome of areas) areasSelect.append(new Option(nome, nome));
    areasSelect.value = area ?? '';
    areasSelect.onchange = () => {
      if (!areasSelect.value) return;
      const url = new URL(location.href); url.searchParams.set('mapa', areasSelect.value); location.href = url.href;
    };
    this.painel.append(areasSelect);
    if (!area) return;
    for (const [chave, texto] of Object.entries(textos.ferramentas)) this.botao(chave, texto);
    for (const chave of ['desfazer', 'refazer', 'testar', 'exportar', 'reabrir', 'grade'] as const) {
      this.botao(chave, textos.botoes[chave]);
    }
    if (import.meta.env.DEV) this.botao('salvar', textos.botoes.salvar);
    const ajuda = document.createElement('p'); ajuda.textContent = textos.ajuda + ' ' + textos.oclusor;
    ajuda.className = 'ajuda-editor'; this.painel.append(ajuda);
    this.painel.append(this.listaPontos, this.selecao);
    this.raio.type = 'number'; this.raio.min = '1';
    this.base.type = 'number'; this.base.step = '1';
    this.campo(textos.campos.raio, this.raio); this.campo(textos.campos.base, this.base);
    this.campo(textos.campos.propriedades, this.propriedades);
    this.botao('aplicar', textos.botoes.aplicar, () => {
      try {
        const propriedades: unknown = JSON.parse(this.propriedades.value || '{}');
        if (!propriedades || typeof propriedades !== 'object' || Array.isArray(propriedades)
          || !Number.isFinite(this.raio.valueAsNumber) || this.raio.valueAsNumber <= 0
          || !Number.isFinite(this.base.valueAsNumber)) throw new Error();
        eventos.emit('editor:comando', { acao: 'propriedades', propriedades,
          raio: this.raio.valueAsNumber, baseY: this.base.valueAsNumber });
      } catch { this.mensagem.textContent = textos.campos.erroPropriedades; }
    });
    this.mensagem.setAttribute('role', 'status'); this.painel.append(this.mensagem);
    this.painel.addEventListener('focusin', this.foco);
    this.painel.addEventListener('focusout', this.desfoco);
    window.addEventListener('keydown', this.tecla);
    window.addEventListener('keyup', this.soltar);
    window.addEventListener('blur', this.limparEspaco);
    eventos.on('editor:estado', this.atualizar, this);
    eventos.on('editor:mensagem', this.mostrarMensagem, this);
    eventos.on('editor:rotulos', this.desenharRotulos, this);
    eventos.on('editor:arquivo', this.baixar, this);
    this.atualizar({ ferramenta: 'v', pontos: [], teste: false });
  }
  private botao(acao: string, nome: string, executar?: () => void): void {
    const botao = document.createElement('button'); botao.textContent = nome; botao.type = 'button';
    botao.onclick = executar ?? (() => eventos.emit('editor:comando', { acao }));
    this.botoes.set(acao, botao); this.painel.append(botao);
  }
  private campo(nome: string, campo: HTMLElement): void {
    const label = document.createElement('label'); label.textContent = nome; label.append(campo); this.painel.append(label);
  }
  private readonly foco = (e: FocusEvent): void => {
    if ((e.target as HTMLElement).matches('input,textarea,select')) eventos.emit('editor:foco', true);
  };
  private readonly desfoco = (): void => { eventos.emit('editor:foco', false); };
  private readonly limparEspaco = (): void => { eventos.emit('editor:espaco', false); };
  private readonly soltar = (e: KeyboardEvent): void => { if (e.code === 'Space') this.limparEspaco(); };
  private readonly tecla = (e: KeyboardEvent): void => {
    if ((e.target as HTMLElement).matches('input,textarea,select')) return;
    let acao = '';
    if (e.key === 'Escape') acao = 'esc';
    else if (!this.testando) {
      if (e.code === 'Space') { e.preventDefault(); eventos.emit('editor:espaco', true); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') acao = e.shiftKey ? 'refazer' : 'desfazer';
      else if (e.key === 'Enter') acao = 'fechar';
      else if (e.key === 'Delete' || e.key === 'Backspace') acao = 'apagar';
      else if (!e.ctrlKey && !e.metaKey && !e.altKey && 'coupv'.includes(e.key.toLowerCase()) && e.key.length === 1) acao = e.key.toLowerCase();
    }
    if (acao) { e.preventDefault(); eventos.emit('editor:comando', { acao }); }
  };
  private readonly atualizar = (estado: EstadoEditor): void => {
    this.testando = estado.teste;
    for (const [chave, botao] of this.botoes) {
      botao.classList.toggle('ativo', chave === estado.ferramenta);
      botao.disabled = estado.teste && chave !== 'testar';
    }
    const testar = this.botoes.get('testar');
    if (testar) testar.textContent = estado.teste ? textos.botoes.voltar : textos.botoes.testar;
    this.listaPontos.replaceChildren();
    const area = new URLSearchParams(location.search).get('mapa') as Area;
    for (const ponto of pontosDaArea(area)) {
      const botao = document.createElement('button'); botao.textContent = ponto.nome;
      botao.classList.toggle('marcado', estado.pontos.includes(ponto.nome));
      botao.disabled = estado.teste;
      botao.onclick = () => eventos.emit('editor:comando', { acao: 'ponto', nome: ponto.nome });
      this.listaPontos.append(botao);
    }
    const objeto = estado.selecionado;
    this.selecao.textContent = textos.campos.selecao + ': ' + (objeto?.name || textos.campos.nenhuma);
    const props = propriedadesComoObjeto(objeto?.properties);
    this.raio.value = String(props.raio ?? 24); this.base.value = String(props.baseY ?? 0);
    this.propriedades.value = JSON.stringify(props, null, 2);
  };
  private readonly mostrarMensagem = (texto: string): void => { this.mensagem.textContent = texto; };
  private readonly desenharRotulos = (dados: RotuloEditor[]): void => {
    const canvas = document.querySelector('canvas'); if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    while (this.rotulos.children.length > dados.length) this.rotulos.lastElementChild?.remove();
    for (const [indice, dado] of dados.entries()) {
      let label = this.rotulos.children[indice] as HTMLSpanElement | undefined;
      if (!label) { label = document.createElement('span'); this.rotulos.append(label); }
      if (label.textContent !== dado.nome) label.textContent = dado.nome;
      label.style.left = `${rect.left + dado.x * rect.width / 360}px`;
      label.style.top = `${rect.top + dado.y * rect.height / 640}px`;
    }
  };
  private readonly baixar = (conteudo: string): void => {
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'mapa.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  destruir(): void {
    window.removeEventListener('keydown', this.tecla); window.removeEventListener('keyup', this.soltar);
    window.removeEventListener('blur', this.limparEspaco);
    eventos.off('editor:estado', this.atualizar, this); eventos.off('editor:mensagem', this.mostrarMensagem, this);
    eventos.off('editor:rotulos', this.desenharRotulos, this); eventos.off('editor:arquivo', this.baixar, this);
    this.painel.remove(); this.rotulos.remove();
  }
}
