import teste from '../data/teste.json';
import {
  eventos,
  NOME_EVENTO_DIALOGO_ABRIR,
  NOME_EVENTO_DIALOGO_FECHAR,
  type DadosDialogo,
} from '../state/eventos';

export class DialogoTeste {
  private readonly elemento: HTMLElement;
  private readonly nome: HTMLElement;
  private readonly instrucoes: HTMLElement;
  private readonly texto: HTMLElement;
  private readonly fechar: HTMLButtonElement;

  constructor(raiz: HTMLElement) {
    this.instrucoes = document.createElement('p');
    this.instrucoes.className = 'instrucoes-teste';
    this.instrucoes.textContent = teste.interface.instrucoes;

    this.elemento = document.createElement('section');
    this.elemento.className = 'caixa-dialogo';
    this.elemento.hidden = true;
    this.elemento.setAttribute('role', 'dialog');
    this.elemento.setAttribute('aria-modal', 'true');
    this.elemento.setAttribute('aria-labelledby', 'nome-personagem');

    this.nome = document.createElement('h2');
    this.nome.id = 'nome-personagem';
    this.texto = document.createElement('p');
    this.fechar = document.createElement('button');
    this.fechar.type = 'button';
    this.fechar.className = 'botao-continuar';
    this.fechar.textContent = teste.interface.botaoDialogo;

    this.elemento.append(this.nome, this.texto, this.fechar);
    raiz.append(this.instrucoes, this.elemento);
    this.elemento.addEventListener('pointerup', this.aoTocarNaCaixa);
    this.fechar.addEventListener('pointerdown', this.impedirPropagacao);
    this.fechar.addEventListener('click', this.fecharDialogo);
    eventos.on(NOME_EVENTO_DIALOGO_ABRIR, this.abrirDialogo, this);
    eventos.on(NOME_EVENTO_DIALOGO_FECHAR, this.ocultarDialogo, this);
  }

  destruir(): void {
    eventos.off(NOME_EVENTO_DIALOGO_ABRIR, this.abrirDialogo, this);
    eventos.off(NOME_EVENTO_DIALOGO_FECHAR, this.ocultarDialogo, this);
    this.elemento.removeEventListener('pointerup', this.aoTocarNaCaixa);
    this.fechar.removeEventListener('pointerdown', this.impedirPropagacao);
    this.fechar.removeEventListener('click', this.fecharDialogo);
    this.instrucoes.remove();
    this.elemento.remove();
  }

  private readonly abrirDialogo = (dados: DadosDialogo): void => {
    this.nome.textContent = dados.personagem;
    this.texto.textContent = dados.texto;
    this.elemento.hidden = false;
  };

  private readonly fecharDialogo = (): void => {
    if (this.elemento.hidden) return;
    this.elemento.hidden = true;
    eventos.emit(NOME_EVENTO_DIALOGO_FECHAR);
  };

  private readonly ocultarDialogo = (): void => {
    this.elemento.hidden = true;
  };

  private readonly aoTocarNaCaixa = (evento: Event): void => {
    if (evento.target instanceof Element && evento.target.closest('button')) return;
    this.fecharDialogo();
  };

  private readonly impedirPropagacao = (evento: PointerEvent): void => {
    evento.stopPropagation();
  };
}
