import teste from '../data/teste.json';
import {
  eventos,
  NOME_EVENTO_DEPURACAO_ATUALIZAR,
  type DadosDepuracao,
} from '../state/eventos';

export class DepuracaoUI {
  private readonly elemento: HTMLElement;
  private readonly raiz: HTMLElement;
  private readonly marcadores = new Map<string, HTMLSpanElement>();

  constructor(elemento: HTMLElement, raiz: HTMLElement, ativa: boolean) {
    this.elemento = elemento;
    this.raiz = raiz;
    document.body.classList.toggle('depuracao-ativa', ativa);
    if (ativa) {
      eventos.on(NOME_EVENTO_DEPURACAO_ATUALIZAR, this.atualizar, this);
    }
  }

  destruir(): void {
    eventos.off(NOME_EVENTO_DEPURACAO_ATUALIZAR, this.atualizar, this);
    this.marcadores.forEach((marcador) => marcador.remove());
    this.marcadores.clear();
  }

  private readonly atualizar = ({ fps, direcao, pontos = [], camera }: DadosDepuracao): void => {
    this.elemento.textContent = teste.interface.depuracao
      .replace('{fps}', String(Math.round(fps) || 0))
      .replace('{x}', direcao.x.toFixed(2))
      .replace('{y}', direcao.y.toFixed(2));
    const nomes = new Set(pontos.map(p => p.nome));
    this.marcadores.forEach((marcador, nome) => {
      if (!nomes.has(nome)) { marcador.remove(); this.marcadores.delete(nome); }
    });
    const canvas = document.querySelector<HTMLCanvasElement>('#mundo canvas');
    if (!canvas || !camera) return;
    const limitesCanvas = canvas.getBoundingClientRect();
    const limitesRaiz = this.raiz.getBoundingClientRect();
    pontos.forEach((ponto) => {
      let marcador = this.marcadores.get(ponto.nome);
      if (!marcador) {
        marcador = document.createElement('span');
        marcador.className = 'rotulo-ponto-debug';
        marcador.textContent = ponto.nome;
        this.raiz.append(marcador);
        this.marcadores.set(ponto.nome, marcador);
      }
      marcador.style.left = `${limitesCanvas.left - limitesRaiz.left + (ponto.x - camera.x) * limitesCanvas.width / 360}px`;
      marcador.style.top = `${limitesCanvas.top - limitesRaiz.top + (ponto.y - camera.y) * limitesCanvas.height / 640}px`;
      const visivel = ponto.x >= camera.x && ponto.x <= camera.x + 360
        && ponto.y >= camera.y && ponto.y <= camera.y + 640;
      marcador.hidden = !visivel;
    });
  };
}
