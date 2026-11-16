import decisoesJson from '../data/decisoes.json';
import inspecaoJson from '../data/inspecao.json';
import sipatJson from '../data/sipat.json';
import resultadoJson from '../data/resultado.json';
import interfaceJson from '../data/interface.json';
import regrasJson from '../data/regras-jogo.json';
import creditosMarkdown from '../../CREDITOS.md?raw';
import { eventos, NOME_EVENTO_DIALOGO_ABRIR, NOME_EVENTO_DIALOGO_FECHAR, NOME_EVENTO_MENSAGEM_ABERTA, NOME_EVENTO_OBJETIVO, type DadosDialogo, type DadosObjetivo } from '../state/eventos';
import { estadoJogo } from '../state/JogoEstado';
import { audioJogo, configuracaoAudioJogo } from '../state/AudioJogo';

type OpcaoDecisao = { id: string; texto: string; correta?: boolean; imagem?: string };
type Decisao = { tipo?: string; pergunta: string; opcoes: OpcaoDecisao[]; resultado: string; fala?: string; reacoes?: Record<string, string>; aConfirmar?: boolean };
type ItemInspecao = { id: string; nome: string; tipo: 'risco' | 'falso'; resultado: string };
type DiaSipat = { dia: number; semana: string; tema: string; horario: string; local: string; aConfirmar?: boolean };
type DadosMensagem = { remetente: string; texto: string; respostas?: string[]; exigirAbertura?: boolean };
type MensagemHistorico = { tipo: 'recebida' | 'enviada'; texto: string; hora: string };
type PontoTutorial = { x: number; y: number };
type EtapaTutorial = 'andar' | 'objetivo' | 'livre' | 'interagir';
type DadosEtapaTutorial = { etapa: EtapaTutorial; seta?: PontoTutorial; personagem?: PontoTutorial };

const decisoes = decisoesJson as unknown as Record<string, Decisao>;
const itensInspecao = inspecaoJson.itens as ItemInspecao[];
const diasSipat = sipatJson.dias as DiaSipat[];
const textosResultado = resultadoJson as Record<string, string>;
const textosInterface = interfaceJson;
const regrasJogo = regrasJson;

function embaralhar<T>(itens: T[]): T[] {
  for (let indice = itens.length - 1; indice > 0; indice -= 1) {
    const outro = Math.floor(Math.random() * (indice + 1));
    [itens[indice], itens[outro]] = [itens[outro], itens[indice]];
  }
  return itens;
}

export class JogoUI {
  private readonly raiz: HTMLElement;
  private decisaoAtual?: string;
  private opcoesEmbaralhadas?: OpcaoDecisao[];
  private selecionados = new Set<string>();
  private tentativasD1: string[] = [];
  private temporizadorTexto?: number;
  private temporizadorInspecao?: number;
  private temporizadorDicaObjetivo?: number;
  private temporizadorNotificacao?: number;
  private temporizadorMensagem?: number;
  private temporizadorTutorial?: number;
  private readonly temporizadoresEstrelas: number[] = [];
  private segundosInspecao = regrasJogo.inspecao.duracaoSegundos;
  private faixaObjetivo?: HTMLElement;
  private textoDaFaixa?: HTMLElement;
  private dicaDaFaixa?: HTMLElement;
  private textoObjetivoAtual = '';
  private inspecaoNaFaixa = false;
  private mensagemPendente?: DadosMensagem;
  private statusContatoAtual?: HTMLElement;
  private barraInferiorMensagem?: HTMLElement;
  private conversaFinalizada = false;
  private respostaEnviada = false;
  private ultimaPessoaMensagem?: MensagemHistorico['tipo'];
  private readonly historicoMensagens = new Map<string, MensagemHistorico[]>();
  private readonly avisosRetratos = new Set<string>();
  private telaAtual = '';
  private completandoTexto = false;
  private mapaAtivo = false;
  private paginasDialogo: string[] = [];
  private paginaDialogo = 0;
  private acaoDialogoAtual?: () => void;
  private tutorialElemento?: HTMLElement;
  private tutorialMascara?: SVGMaskElement;
  private tutorialDicaSeta?: HTMLElement;
  private tutorialEtapaAtual?: EtapaTutorial;
  private tutorialPosicaoJoystick?: PontoTutorial;
  private tutorialPosicaoSeta?: PontoTutorial;
  private tutorialPosicaoPersonagem?: PontoTutorial;

  constructor(raiz: HTMLElement) {
    this.raiz = raiz;
    eventos.on('ui:tela-menu', this.mostrarMenu, this);
    eventos.on('ui:tela-selecao', this.mostrarSelecao, this);
    eventos.on('ui:audio-jogo', this.ativarAudioMapa, this);
    eventos.on(NOME_EVENTO_OBJETIVO, this.atualizarObjetivo, this);
    eventos.on(NOME_EVENTO_DIALOGO_ABRIR, this.abrirDialogo, this);
    eventos.on(NOME_EVENTO_DIALOGO_FECHAR, this.ocultarDialogo, this);
    eventos.on('ui:decisao', this.abrirDecisao, this);
    eventos.on('ui:mensagem', this.abrirMensagem, this);
    eventos.on('ui:calendario', this.abrirCalendario, this);
    eventos.on('ui:inspecao', this.abrirInspecao, this);
    eventos.on('ui:inspecao-atualizar', this.atualizarInspecao, this);
    eventos.on('ui:relato', this.abrirRelato, this);
    eventos.on('ui:resultado', this.mostrarResultado, this);
    eventos.on('ui:dica', this.mostrarDica, this);
    eventos.on('ui:cones', this.abrirCones, this);
    eventos.on('ui:cones-atualizar', this.atualizarCones, this);
    eventos.on('ui:tutorial-etapa', this.mostrarEtapaTutorial, this);
    eventos.on('ui:tutorial-concluir', this.fecharTutorialVisual, this);
    eventos.on('ui:tutorial-joystick-posicao', this.atualizarFocoJoystickTutorial, this);
    eventos.on('ui:esconder', this.limpar, this);
    eventos.on('ui:avancar', this.acaoInterface, this);
    this.raiz.addEventListener('pointerdown', this.desbloquearAudio, { once: true, capture: true });
    window.addEventListener('keydown', this.desbloquearAudio, { once: true, capture: true });
  }

  destruir(): void {
    eventos.off('ui:tela-menu', this.mostrarMenu, this);
    eventos.off('ui:tela-selecao', this.mostrarSelecao, this);
    eventos.off('ui:audio-jogo', this.ativarAudioMapa, this);
    eventos.off(NOME_EVENTO_OBJETIVO, this.atualizarObjetivo, this);
    eventos.off(NOME_EVENTO_DIALOGO_ABRIR, this.abrirDialogo, this);
    eventos.off(NOME_EVENTO_DIALOGO_FECHAR, this.ocultarDialogo, this);
    eventos.off('ui:decisao', this.abrirDecisao, this);
    eventos.off('ui:mensagem', this.abrirMensagem, this);
    eventos.off('ui:calendario', this.abrirCalendario, this);
    eventos.off('ui:inspecao', this.abrirInspecao, this);
    eventos.off('ui:inspecao-atualizar', this.atualizarInspecao, this);
    eventos.off('ui:relato', this.abrirRelato, this);
    eventos.off('ui:resultado', this.mostrarResultado, this);
    eventos.off('ui:dica', this.mostrarDica, this);
    eventos.off('ui:cones', this.abrirCones, this);
    eventos.off('ui:cones-atualizar', this.atualizarCones, this);
    eventos.off('ui:tutorial-etapa', this.mostrarEtapaTutorial, this);
    eventos.off('ui:tutorial-concluir', this.fecharTutorialVisual, this);
    eventos.off('ui:tutorial-joystick-posicao', this.atualizarFocoJoystickTutorial, this);
    eventos.off('ui:esconder', this.limpar, this);
    eventos.off('ui:avancar', this.acaoInterface, this);
    this.raiz.removeEventListener('pointerdown', this.desbloquearAudio, true);
    window.removeEventListener('keydown', this.desbloquearAudio, true);
    this.pararTemporizadores();
    if (this.temporizadorDicaObjetivo !== undefined) window.clearTimeout(this.temporizadorDicaObjetivo);
    this.raiz.replaceChildren();
  }

  private readonly desbloquearAudio = (): void => audioJogo.desbloquear();

  private readonly ativarAudioMapa = (): void => { this.mapaAtivo = true; this.limpar(); };

  private readonly acaoInterface = (): void => {
    if (this.telaAtual === 'dialogo' || this.telaAtual === 'fala-local') {
      this.acaoDialogoAtual?.();
      return;
    }
    if (this.telaAtual === 'notificacao') {
      this.abrirConversaPendente();
      return;
    }
    if (this.telaAtual === 'mensagem') {
      if (this.conversaFinalizada) this.fecharMensagem();
      else this.raiz.querySelector<HTMLButtonElement>('.chip-resposta')?.focus();
      return;
    }
    const continuar = this.raiz.querySelector<HTMLButtonElement>('.botao-continuar-ui');
    if (continuar) continuar.click();
  };

  private readonly mostrarMenu = (): void => {
    this.pararTemporizadores();
    this.telaAtual = 'menu';
    this.mapaAtivo = false;
    audioJogo.trocarTrilha(0, true);
    const tela = this.elemento('section', 'tela-menu ui-tela');
    const fundo = this.imagem('/assets/ui/tela-inicial/fundo.png', '');
    fundo.className = 'fundo-menu';
    fundo.addEventListener('error', () => {
      fundo.hidden = true;
      tela.classList.add('fundo-menu-ausente');
    }, { once: true });
    const padrao = this.elemento('div', 'padrao-menu');
    const vinheta = this.elemento('div', 'vinheta-menu');
    const topo = this.elemento('div', 'menu-topo');
    const audio = this.botaoAudio();
    topo.append(audio);
    const marca = this.elemento('div', 'marca-menu');
    const emblema = this.imagem('/assets/ui/tela-inicial/emblema.png', textosInterface.menu.emblemaAlt);
    emblema.className = 'emblema-menu';
    emblema.hidden = true;
    emblema.addEventListener('error', () => { emblema.hidden = true; }, { once: true });
    const logo = this.imagem('/assets/ui/tela-inicial/logo-titulo.png', textosInterface.menu.logoAlt);
    logo.className = 'logo-menu';
    const textoLogo = this.elemento('h1', 'titulo-fallback');
    textoLogo.textContent = `${textosInterface.menu.titulo}\n${textosInterface.menu.tituloPrincipal}`;
    logo.addEventListener('error', () => { logo.hidden = true; emblema.hidden = false; textoLogo.hidden = false; this.avisoAsset('/assets/ui/tela-inicial/logo-titulo.png'); }, { once: true });
    textoLogo.hidden = true;
    const subtitulo = this.elemento('p', 'subtitulo-menu');
    subtitulo.textContent = textosInterface.menu.subtitulo;
    marca.append(emblema, logo, textoLogo, subtitulo);

    const botoes = this.elemento('div', 'botoes-menu');
    const novo = this.botao(textosInterface.menu.novoJogo, 'botao-pixel');
    const continuar = this.botao(textosInterface.menu.continuar, 'botao-pixel');
    continuar.disabled = !estadoJogo.dados.iniciado || estadoJogo.flag('jogo-concluido');
    novo.addEventListener('click', () => {
      if (estadoJogo.dados.iniciado && !window.confirm(textosInterface.menu.confirmarNovo)) return;
      eventos.emit('menu:novo');
    });
    continuar.addEventListener('click', () => {
      if (continuar.disabled) return;
      eventos.emit('menu:continuar');
    });
    botoes.append(novo, continuar);

    const rodape = this.elemento('footer', 'rodape-menu');
    const nidec = this.imagem('/assets/ui/tela-inicial/logo-nidec.svg', textosInterface.menu.marcaNidec);
    nidec.className = 'logo-nidec';
    const linkCreditos = this.botao(textosInterface.menu.creditos, 'link-creditos');
    linkCreditos.addEventListener('click', () => this.mostrarCreditos());
    nidec.addEventListener('error', () => {
      nidec.hidden = true;
      const placeholder = this.elemento('span', 'logo-nidec-placeholder');
      placeholder.setAttribute('role', 'img');
      placeholder.setAttribute('aria-label', textosInterface.menu.marcaNidec);
      rodape.insertBefore(placeholder, linkCreditos);
    }, { once: true });
    rodape.append(nidec, linkCreditos);
    tela.append(fundo, padrao, vinheta, topo, marca, botoes, rodape);
    this.mostrar(tela);
  };

  private readonly mostrarSelecao = (): void => {
    this.pararTemporizadores();
    this.historicoMensagens.clear();
    this.telaAtual = 'selecao';
    this.mapaAtivo = false;
    const tela = this.elemento('section', 'tela-selecao ui-tela');
    const fundo = this.imagem('/assets/ui/tela-inicial/fundo.png', '');
    fundo.className = 'fundo-selecao';
    fundo.addEventListener('error', () => {
      fundo.hidden = true;
      tela.classList.add('fundo-selecao-ausente');
    }, { once: true });
    const vinheta = this.elemento('div', 'vinheta-selecao');
    const titulo = this.elemento('h1', 'titulo-tela');
    titulo.textContent = textosInterface.selecao.titulo;
    const opcoes = this.elemento('div', 'opcoes-personagens');
    let escolhido: 'julia' | 'lucas' | undefined;
    const seletores: HTMLButtonElement[] = [];
    for (const id of ['julia', 'lucas'] as const) {
      const cartao = this.botao('', 'cartao-personagem');
      cartao.dataset.personagem = id;
      const nomePersonagem = textosInterface.selecao[id];
      cartao.setAttribute('aria-label', nomePersonagem);
      const imagem = this.imagem(`/assets/sprites/jogaveis/${id}/corpo.png`, nomePersonagem);
      imagem.className = 'corpo-personagem';
      const nome = this.elemento('span', 'nome-personagem');
      nome.textContent = nomePersonagem;
      cartao.append(imagem, nome);
      cartao.addEventListener('click', () => {
        escolhido = id;
        seletores.forEach((item) => {
          const selecionado = item === cartao;
          item.classList.toggle('selecionado', selecionado);
          const personagem = item.dataset.personagem;
          const corpo = item.querySelector<HTMLImageElement>('.corpo-personagem');
          if (personagem && corpo) corpo.src = `/assets/sprites/jogaveis/${personagem}/${selecionado ? 'selecionado' : 'corpo'}.png`;
        });
        comecar.hidden = false;
      });
      seletores.push(cartao);
      opcoes.append(cartao);
    }
    const comecar = this.botao(textosInterface.selecao.comecar, 'botao-pixel botao-comecar');
    comecar.hidden = true;
    comecar.addEventListener('click', () => {
      if (!escolhido) return;
      eventos.emit('selecao:confirmar', escolhido);
    });
    const voltar = this.botao(textosInterface.selecao.voltar, 'botao-secundario');
    voltar.addEventListener('click', () => eventos.emit('selecao:voltar'));
    tela.append(fundo, vinheta, titulo, opcoes, comecar, voltar);
    this.mostrar(tela);
  };

  private readonly abrirDialogo = (dados: DadosDialogo): void => {
    this.pararTemporizadores();
    this.telaAtual = 'dialogo';
    const caixa = this.elemento('section', 'ui-dialogo');
    caixa.setAttribute('role', 'dialog');
    caixa.setAttribute('aria-modal', 'true');
    const texto = this.criarConteudoDialogo(caixa, dados);
    this.acaoDialogoAtual = () => this.avancarDialogo(texto, dados.texto);
    caixa.addEventListener('pointerup', (evento) => {
      if (evento.target instanceof Element && evento.target.closest('button')) return;
      this.acaoDialogoAtual?.();
    });
    this.mostrar(caixa);
    this.iniciarDialogo(texto, dados.texto);
  };

  private readonly ocultarDialogo = (): void => {
    audioJogo.pararEfeito('despertador');
    if (this.telaAtual === 'dialogo' || this.telaAtual === 'fala-local') this.limpar();
  };

  private abrirDecisao = (dados: { id: string }): void => {
    const decisao = decisoes[dados.id];
    if (!decisao) {
      console.warn(`[Jogo] Decisão ausente: ${dados.id}`);
      eventos.emit('roteiro:acao-concluida');
      return;
    }
    if (estadoJogo.dados.respostas[dados.id]) {
      eventos.emit('roteiro:acao-concluida');
      return;
    }
    this.decisaoAtual = dados.id;
    this.selecionados.clear();
    this.tentativasD1 = dados.id === 'D1' ? [...estadoJogo.dados.tentativasD1] : [];
    this.opcoesEmbaralhadas = embaralhar([...decisao.opcoes]);
    this.renderizarDecisao(decisao);
  };

  private renderizarDecisao(decisao: Decisao): void {
    this.pararTemporizadores();
    this.telaAtual = 'decisao';
    const tela = this.elemento('section', 'painel-ui ui-painel');
    tela.setAttribute('role', 'dialog');
    tela.setAttribute('aria-modal', 'true');
    const cabecalho = this.elemento('header', 'cabecalho-painel');
    const titulo = this.elemento('h2', 'titulo-painel');
    titulo.textContent = decisao.pergunta;
    cabecalho.append(titulo);
    if (decisao.aConfirmar) cabecalho.append(this.rotulo(textosInterface.decisao.aConfirmar, 'aviso-confirmacao'));
    const lista = this.elemento('div', decisao.tipo === 'armario' ? 'lista-opcoes grade-epi' : decisao.tipo === 'itens' ? 'lista-opcoes grade-itens' : 'lista-opcoes');
    const opcoes = this.opcoesEmbaralhadas ?? decisao.opcoes;
    opcoes.forEach((opcao) => {
      const selecaoMultipla = decisao.tipo === 'armario';
      const visual = decisao.tipo === 'armario' || decisao.tipo === 'itens';
      const botao = this.botao('', visual ? 'opcao-visual' : 'opcao-fala', null);
      botao.classList.toggle('marcado', this.selecionados.has(opcao.id));
      if (opcao.imagem) {
        const caminho = decisao.tipo === 'armario'
          ? `/assets/ui/icones/${opcao.imagem}` : `/assets/ui/itens/${opcao.imagem}`;
        const imagem = this.imagem(caminho, opcao.texto);
        imagem.className = 'imagem-opcao';
        botao.append(imagem);
      }
      const texto = this.elemento('span', 'texto-opcao');
      texto.textContent = opcao.texto;
      botao.append(texto);
      botao.addEventListener('click', () => {
        if (visual) audioJogo.tocar('item');
        if (selecaoMultipla) {
          if (this.selecionados.has(opcao.id)) this.selecionados.delete(opcao.id);
          else if (this.selecionados.size < regrasJogo.decisoes.quantidadeEpi) this.selecionados.add(opcao.id);
          this.renderizarDecisao(decisao);
          return;
        }
        this.selecionados.clear();
        this.selecionados.add(opcao.id);
        this.confirmarDecisao(opcao);
      });
      lista.append(botao);
    });
    tela.append(cabecalho, lista);
    if (decisao.tipo === 'armario') {
      const confirmar = this.botao(textosInterface.decisao.confirmar, 'botao-pixel botao-confirmar', null);
      confirmar.disabled = this.selecionados.size !== regrasJogo.decisoes.quantidadeEpi;
      confirmar.addEventListener('click', () => {
        audioJogo.tocar('escolha');
        const selecionadas = decisao.opcoes.filter((opcao) => this.selecionados.has(opcao.id));
        const correta = selecionadas.length === regrasJogo.decisoes.quantidadeEpi && selecionadas.every((opcao) => opcao.correta);
        if (!correta) {
          const ids = selecionadas.map((opcao) => opcao.id);
          this.tentativasD1.push(...ids);
          eventos.emit('roteiro:decisao-tentativa', { id: this.decisaoAtual, opcoes: ids });
          this.mostrarFalaLocal('Marcos', 'seria', decisao.fala ?? '', () => {
            this.selecionados.clear();
            this.opcoesEmbaralhadas = embaralhar([...decisao.opcoes]);
            this.renderizarDecisao(decisao);
          });
          return;
        }
        const ids = selecionadas.map((opcao) => opcao.id);
        eventos.emit('roteiro:decisao-resposta', {
          id: this.decisaoAtual,
          opcao: ids.join(','),
          acertou: this.tentativasD1.length === 0,
          tentativas: this.tentativasD1,
        });
        this.limpar();
        eventos.emit('roteiro:acao-concluida');
      });
      tela.append(confirmar);
    }
    this.mostrar(tela);
  }

  private confirmarDecisao(opcao: OpcaoDecisao): void {
    const id = this.decisaoAtual;
    if (!id) return;
    eventos.emit('roteiro:decisao-resposta', {
      id,
      opcao: opcao.id,
      acertou: Boolean(opcao.correta),
      tentativas: [opcao.id],
    });
    audioJogo.tocar('escolha');
    this.limpar();
    eventos.emit('roteiro:acao-concluida');
  }

  private readonly abrirMensagem = (dados: DadosMensagem): void => {
    this.pararTemporizadores();
    this.acaoDialogoAtual = undefined;
    this.mensagemPendente = dados;
    this.telaAtual = 'notificacao';
    const banner = this.botao('', 'banner-notificacao', null);
    banner.setAttribute('aria-label', `${textosInterface.celular.appAgora}. ${dados.remetente}: ${dados.texto}`);
    const icone = this.elemento('span', 'icone-notificacao-papo');
    icone.setAttribute('aria-hidden', 'true');
    const conteudo = this.elemento('span', 'conteudo-notificacao');
    const aplicativo = this.elemento('span', 'aplicativo-notificacao');
    aplicativo.textContent = textosInterface.celular.appAgora;
    const remetente = this.elemento('strong', 'remetente-notificacao');
    remetente.textContent = dados.remetente;
    const resumo = this.elemento('span', 'resumo-notificacao');
    resumo.textContent = `${dados.texto.slice(0, 64).trimEnd()}…`;
    conteudo.append(aplicativo, remetente, resumo);
    banner.append(icone, conteudo);
    banner.addEventListener('click', this.abrirConversaPendente);
    this.mostrar(banner);
    audioJogo.tocar('notificacao');
    if (!dados.exigirAbertura) {
      this.temporizadorNotificacao = window.setTimeout(() => {
        if (this.telaAtual !== 'notificacao') return;
        this.mensagemPendente = undefined;
        this.limpar();
        eventos.emit('roteiro:acao-concluida');
      }, 4000);
    }
  };

  private readonly abrirConversaPendente = (): void => {
    const dados = this.mensagemPendente;
    if (!dados || this.telaAtual !== 'notificacao') return;
    this.pararTemporizadores();
    eventos.emit(NOME_EVENTO_MENSAGEM_ABERTA);
    this.renderizarConversa(dados);
  };

  private renderizarConversa(dados: DadosMensagem): void {
    this.telaAtual = 'mensagem';
    this.conversaFinalizada = false;
    this.respostaEnviada = false;
    this.ultimaPessoaMensagem = undefined;

    const tela = this.elemento('section', 'celular-ui');
    tela.setAttribute('role', 'dialog');
    tela.setAttribute('aria-modal', 'true');
    const sombra = this.elemento('div', 'sombra-modal');
    sombra.addEventListener('click', () => {
      if (this.conversaFinalizada) this.fecharMensagem();
    });
    const moldura = this.imagem('/assets/ui/celular/moldura.png', '');
    moldura.className = 'moldura-celular';
    const areaTela = this.elemento('div', 'tela-celular');

    const barraStatus = this.elemento('div', 'barra-status-celular');
    const horaStatus = this.elemento('span', 'hora-status-celular');
    horaStatus.textContent = this.horaMensagem();
    const iconesStatus = this.elemento('span', 'icones-status-celular');
    iconesStatus.append(
      this.iconeSvg('icone-sinal', '<path d="M2 18h3v4H2zm5-5h3v9H7zm5-5h3v14h-3zm5-5h3v19h-3z" fill="currentColor"/>'),
      this.iconeSvg('icone-wifi', '<path d="M2 8Q12 0 22 8M5 12q7-6 14 0m-10 4q3-3 6 0" fill="none" stroke="currentColor" stroke-width="2"/><rect x="11" y="19" width="2" height="2" fill="currentColor"/>'),
      this.iconeSvg('icone-bateria', '<rect x="2" y="6" width="18" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><rect x="20" y="10" width="2" height="4" fill="currentColor"/><rect x="4" y="8" width="12" height="8" fill="currentColor"/>'),
    );
    barraStatus.append(horaStatus, iconesStatus);

    const cabecalho = this.elemento('header', 'cabecalho-contato');
    cabecalho.append(this.iconeSvg('icone-voltar-contato', '<path d="M15 4 7 12l8 8M7 12h14" fill="none" stroke="currentColor" stroke-width="2"/>'));
    cabecalho.append(this.criarAvatarContato(dados.remetente));
    const identidade = this.elemento('span', 'identidade-contato');
    const nome = this.elemento('strong', 'nome-contato');
    nome.textContent = dados.remetente;
    const status = this.elemento('span', 'status-contato');
    status.textContent = textosInterface.celular.digitando;
    this.statusContatoAtual = status;
    identidade.append(nome, status);
    const acoesContato = this.elemento('span', 'acoes-contato');
    acoesContato.append(
      this.iconeSvg('icone-camera-contato', '<path d="M3 7h4l2-2h6l2 2h4v12H3z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="13" r="4" fill="none" stroke="currentColor" stroke-width="2"/>', textosInterface.celular.cameraAlt),
      this.iconeSvg('icone-telefone-contato', '<path d="M7 3h3l2 5-2 2q2 4 5 5l2-2 4 2v3q0 2-2 2C10 19 5 14 4 5q0-2 3-2z" fill="none" stroke="currentColor" stroke-width="2"/>', textosInterface.celular.telefoneAlt),
    );
    cabecalho.append(identidade, acoesContato);

    const conversa = this.elemento('div', 'conversa-celular rolagem-ui');
    conversa.setAttribute('aria-label', `${dados.remetente}`);
    const data = this.elemento('span', 'data-conversa');
    data.textContent = textosInterface.celular.hoje;
    conversa.append(data);
    const historico = this.historicoMensagens.get(dados.remetente) ?? [];
    historico.forEach((mensagem) => this.adicionarBalao(conversa, mensagem.texto, mensagem.tipo, mensagem.hora));

    const digitando = this.elemento('div', 'balao-digitando recebida');
    if (this.ultimaPessoaMensagem === 'recebida') digitando.classList.add('sem-rabinho');
    digitando.setAttribute('aria-label', textosInterface.celular.digitando);
    for (let indice = 0; indice < 3; indice += 1) digitando.append(this.elemento('span', 'ponto-digitando'));
    conversa.append(digitando);

    const respostas = this.elemento('div', 'respostas-papo rolagem-ui');
    respostas.hidden = true;
    const barraInferior = this.elemento('footer', 'barra-inferior-papo');
    this.barraInferiorMensagem = barraInferior;
    const campo = this.elemento('span', 'campo-mensagem-papo');
    campo.textContent = textosInterface.celular.campo;
    const enviar = this.botao('', 'botao-enviar-papo', null);
    enviar.setAttribute('aria-label', textosInterface.celular.enviarAlt);
    enviar.append(this.iconeSvg('icone-enviar-papo', '<path d="M2 3 22 12 2 21l4-8 8-1-8-1z" fill="currentColor"/>'));
    barraInferior.append(campo, enviar);

    areaTela.append(barraStatus, cabecalho, conversa, respostas, barraInferior);
    tela.append(sombra, moldura, areaTela);
    areaTela.addEventListener('click', () => {
      if (this.conversaFinalizada) this.fecharMensagem();
    });
    tela.addEventListener('click', (evento) => {
      if (evento.target === tela && this.conversaFinalizada) this.fecharMensagem();
    });
    this.mostrar(tela);

    this.temporizadorMensagem = window.setTimeout(() => {
      if (this.telaAtual !== 'mensagem' || !digitando.isConnected) return;
      digitando.remove();
      const hora = this.horaMensagem();
      this.adicionarBalao(conversa, dados.texto, 'recebida', hora);
      const mensagens = this.historicoMensagens.get(dados.remetente) ?? [];
      mensagens.push({ tipo: 'recebida', texto: dados.texto, hora });
      this.historicoMensagens.set(dados.remetente, mensagens);
      if (this.statusContatoAtual) this.statusContatoAtual.textContent = textosInterface.celular.online;
      audioJogo.tocar('notificacao');
      if (dados.respostas?.length) this.mostrarRespostas(dados.respostas, respostas, conversa, dados.remetente);
      else {
        this.conversaFinalizada = true;
        this.mostrarBotaoFechar(barraInferior);
      }
      this.rolarConversa(conversa);
      this.temporizadorMensagem = undefined;
    }, this.duracaoDigitando(dados.texto));
  }

  private mostrarRespostas(respostas: string[], area: HTMLElement, conversa: HTMLElement, remetente: string): void {
    area.replaceChildren();
    respostas.forEach((resposta) => {
      const botao = this.botao(resposta, 'chip-resposta');
      botao.addEventListener('click', () => this.selecionarResposta(resposta, area, conversa, remetente));
      area.append(botao);
    });
    area.hidden = false;
  }

  private selecionarResposta(resposta: string, area: HTMLElement, conversa: HTMLElement, remetente: string): void {
    if (this.respostaEnviada || this.telaAtual !== 'mensagem') return;
    this.respostaEnviada = true;
    area.hidden = true;
    const hora = this.horaMensagem();
    const balao = this.adicionarBalao(conversa, resposta, 'enviada', hora);
    const mensagens = this.historicoMensagens.get(remetente) ?? [];
    mensagens.push({ tipo: 'enviada', texto: resposta, hora });
    this.historicoMensagens.set(remetente, mensagens);
    eventos.emit('roteiro:resposta-rapida', resposta);
    this.rolarConversa(conversa);
    this.temporizadorMensagem = window.setTimeout(() => {
      if (this.telaAtual !== 'mensagem' || !balao.isConnected) return;
      balao.classList.add('mensagem-entregue');
      this.conversaFinalizada = true;
      if (this.statusContatoAtual) this.statusContatoAtual.textContent = textosInterface.celular.online;
      if (this.barraInferiorMensagem) this.mostrarBotaoFechar(this.barraInferiorMensagem);
      this.temporizadorMensagem = undefined;
    }, 600);
  }

  private mostrarBotaoFechar(barra: HTMLElement): void {
    barra.replaceChildren();
    const fechar = this.botao(textosInterface.celular.fechar, 'botao-fechar-papo');
    fechar.addEventListener('click', () => this.fecharMensagem());
    barra.append(fechar);
  }

  private fecharMensagem(): void {
    if (this.telaAtual !== 'mensagem' || !this.conversaFinalizada) return;
    this.mensagemPendente = undefined;
    this.limpar();
    eventos.emit('roteiro:acao-concluida');
  }

  private adicionarBalao(area: HTMLElement, texto: string, tipo: MensagemHistorico['tipo'], hora: string): HTMLElement {
    const balao = this.elemento('div', `balao-conversa ${tipo}`);
    if (this.ultimaPessoaMensagem === tipo) balao.classList.add('sem-rabinho');
    const corpo = this.elemento('span', 'texto-conversa');
    corpo.textContent = texto;
    const meta = this.elemento('span', 'meta-conversa');
    const horario = this.elemento('time', 'hora-conversa');
    horario.textContent = hora;
    meta.append(horario);
    if (tipo === 'enviada') {
      const tiques = this.elemento('span', 'tiques-conversa');
      tiques.textContent = '✓✓';
      tiques.setAttribute('aria-label', textosInterface.celular.online);
      meta.append(tiques);
    }
    balao.append(corpo, meta);
    area.append(balao);
    this.ultimaPessoaMensagem = tipo;
    return balao;
  }

  private criarAvatarContato(contato: string): HTMLElement {
    const avatar = this.elemento('span', 'avatar-contato');
    avatar.setAttribute('role', 'img');
    avatar.setAttribute('aria-label', textosInterface.celular.retrato.replace('{contato}', contato));
    if (contato.toLocaleLowerCase('pt-BR') === 'renata') {
      const imagem = this.imagem('/assets/sprites/npcs/renata/retratos.png', '');
      imagem.className = 'folha-avatar';
      imagem.setAttribute('aria-hidden', 'true');
      avatar.append(imagem);
      return avatar;
    }
    if (!this.avisosRetratos.has(contato)) {
      console.warn(`[Papo] Retrato ausente para ${contato}; usando avatar pixelado de contingência.`);
      this.avisosRetratos.add(contato);
    }
    avatar.classList.add('avatar-contingencia');
    avatar.innerHTML = '<svg viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true"><rect width="24" height="24" fill="#8ca99c"/><path d="M5 8V5h3V3h8v2h3v7h-2V8H7v5H5z" fill="#202723"/><rect x="7" y="7" width="10" height="10" fill="#d99b72"/><rect x="8" y="11" width="2" height="2" fill="#202723"/><rect x="14" y="11" width="2" height="2" fill="#202723"/><path d="M10 15h4v2h-4z" fill="#7b3a30"/><path d="M5 19h14v5H5z" fill="#35854e"/><path d="M9 19h6v2H9z" fill="#f2f2f2"/></svg>';
    return avatar;
  }

  private iconeSvg(classe: string, desenho: string, rotuloAcessivel?: string): HTMLElement {
    const icone = this.elemento('span', classe);
    if (rotuloAcessivel) icone.setAttribute('aria-label', rotuloAcessivel);
    else icone.setAttribute('aria-hidden', 'true');
    icone.innerHTML = `<svg viewBox="0 0 24 24" shape-rendering="crispEdges">${desenho}</svg>`;
    return icone;
  }

  private horaMensagem(): string {
    if (estadoJogo.dados.capitulo === 1) return textosInterface.celular.horaCapitulo1;
    const agora = new Date();
    return `${agora.getHours().toString().padStart(2, '0')}:${agora.getMinutes().toString().padStart(2, '0')}`;
  }

  private duracaoDigitando(texto: string): number {
    return Math.min(1500, 800 + texto.length * 5);
  }

  private rolarConversa(conversa: HTMLElement): void {
    conversa.scrollTop = conversa.scrollHeight;
  }

  private readonly abrirCalendario = (): void => {
    this.pararTemporizadores();
    this.telaAtual = 'calendario';
    audioJogo.trocarMusica('t5-sipat');
    this.renderizarCalendario();
  };

  private renderizarCalendario(diaAtivo?: DiaSipat): void {
    const tela = this.elemento('section', 'painel-ui painel-calendario');
    tela.setAttribute('role', 'dialog');
    tela.setAttribute('aria-modal', 'true');
    const titulo = this.elemento('h2', 'titulo-painel');
    titulo.textContent = textosInterface.calendario.titulo;
    const grade = this.elemento('div', 'grade-calendario');
    const hoje = this.dataHoje();
    diasSipat.forEach((dia) => {
      const cartao = this.botao('', 'cartao-calendario', null);
      const dataDia = new Date(hoje.getFullYear(), sipatJson.mes - 1, dia.dia);
      const comparacao = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      cartao.classList.toggle('passado', dataDia < comparacao);
      cartao.classList.toggle('hoje', dataDia.getTime() === comparacao.getTime());
      cartao.classList.toggle('virado', estadoJogo.dados.diasAbertos.includes(dia.dia));
      const frente = this.elemento('span', 'frente-cartao');
      frente.textContent = `${dia.semana}\n${dia.dia}/${sipatJson.mes}`;
      const verso = this.elemento('span', 'verso-cartao');
      verso.textContent = `${dia.tema}\n${dia.horario}\n${dia.local}`;
      cartao.append(frente, verso);
      cartao.addEventListener('click', () => {
        const novoCartao = !estadoJogo.dados.diasAbertos.includes(dia.dia);
        if (novoCartao) {
          estadoJogo.dados.diasAbertos.push(dia.dia);
          estadoJogo.salvar();
          audioJogo.tocar('cartao');
        }
        eventos.emit('roteiro:calendario-dia', dia.dia);
        this.renderizarCalendario(dia);
      });
      grade.append(cartao);
    });
    tela.append(titulo, grade);
    if (diaAtivo) {
      const detalhe = this.elemento('div', 'pensamento-calendario');
      const texto = this.elemento('p', 'texto-pensamento');
      texto.textContent = this.pensamentoDoDia(diaAtivo, hoje);
      detalhe.append(texto);
      if (diaAtivo.aConfirmar) detalhe.append(this.rotulo(textosInterface.calendario.aConfirmar, 'aviso-confirmacao'));
      tela.append(detalhe);
    }
    const fechar = this.botao(textosInterface.calendario.voltar, 'botao-pixel botao-confirmar');
    const todosAbertos = diasSipat.every((dia) => estadoJogo.dados.diasAbertos.includes(dia.dia));
    fechar.disabled = !todosAbertos;
    if (!todosAbertos) {
      const aviso = this.elemento('p', 'texto-secundario');
      aviso.textContent = textosInterface.jogo.abrirCartoes.replace('{abertos}', String(estadoJogo.dados.diasAbertos.length));
      tela.append(aviso);
    }
    fechar.addEventListener('click', () => {
      audioJogo.trocarMusica('t3-ontem');
      this.limpar();
      eventos.emit('roteiro:acao-concluida');
    });
    tela.append(fechar);
    this.mostrar(tela);
  }

  private readonly abrirInspecao = (): void => {
    this.pararTemporizadores();
    this.telaAtual = 'inspecao';
    this.inspecaoNaFaixa = true;
    this.segundosInspecao = regrasJogo.inspecao.duracaoSegundos;
    this.atualizarTextoFaixa(this.textoInspecaoObjetivo());
    eventos.emit('inspecao:iniciar');
    this.renderizarInspecao();
    this.temporizadorInspecao = window.setInterval(() => {
      this.segundosInspecao = Math.max(0, this.segundosInspecao - 1);
      if (this.segundosInspecao > 0 && this.segundosInspecao <= regrasJogo.inspecao.tocarTiqueSegundos) audioJogo.tocar('tique');
      const contador = this.raiz.querySelector<HTMLElement>('.contador-inspecao');
      if (contador) contador.textContent = this.formatarTempo(this.segundosInspecao);
      this.atualizarTextoFaixa(this.textoInspecaoObjetivo());
      if (this.segundosInspecao === 0) {
        audioJogo.tocarTempoEsgotado();
        this.finalizarInspecao();
      }
    }, 1000);
  };

  private renderizarInspecao(): void {
    const tela = this.elemento('section', 'barra-inspecao');
    const instrucoes = this.elemento('p', 'texto-inspecao');
    instrucoes.textContent = textosInterface.inspecao.instrucao;
    const cronometro = this.elemento('strong', 'contador-inspecao');
    cronometro.textContent = this.formatarTempo(this.segundosInspecao);
    const finalizar = this.botao(textosInterface.inspecao.finalizar, 'botao-pixel');
    finalizar.addEventListener('click', () => this.finalizarInspecao());
    tela.append(instrucoes, cronometro, finalizar);
    this.mostrar(tela);
  }

  private readonly atualizarInspecao = (): void => {
    if (this.telaAtual !== 'inspecao') return;
    const contador = this.raiz.querySelector<HTMLElement>('.contador-inspecao');
    if (contador) contador.setAttribute('aria-label', textosInterface.inspecao.itensMarcados.replace('{quantidade}', String(estadoJogo.dados.inspecao.length)));
  };

  private finalizarInspecao(): void {
    if (this.telaAtual !== 'inspecao') return;
    if (this.temporizadorInspecao !== undefined) window.clearInterval(this.temporizadorInspecao);
    this.temporizadorInspecao = undefined;
    this.inspecaoNaFaixa = false;
    this.atualizarTextoFaixa(this.textoObjetivoAtual);
    this.limpar();
    eventos.emit('roteiro:inspecao-finalizar');
  }

  private readonly abrirRelato = (): void => {
    this.pararTemporizadores();
    this.acaoDialogoAtual = undefined;
    this.telaAtual = 'relato';
    const tela = this.elemento('section', 'painel-ui painel-relato');
    tela.setAttribute('role', 'dialog');
    tela.setAttribute('aria-modal', 'true');
    const sombra = this.elemento('div', 'sombra-modal');
    const moldura = this.imagem('/assets/ui/tablet/moldura.png', textosInterface.relato.tabletAlt);
    moldura.className = 'moldura-tablet';
    const areaTela = this.elemento('div', 'tela-tablet');
    const titulo = this.elemento('h2', 'titulo-painel');
    titulo.textContent = textosInterface.relato.titulo;
    const lista = this.elemento('ul', 'lista-relato rolagem-ui');
    const marcados = itensInspecao.filter((item) => estadoJogo.dados.inspecao.includes(item.id));
    if (!marcados.length) {
      const vazio = this.elemento('li', 'item-relato');
      vazio.textContent = textosInterface.relato.nenhum;
      lista.append(vazio);
    } else {
      marcados.forEach((item) => {
        const linha = this.elemento('li', 'item-relato');
        linha.textContent = item.nome;
        lista.append(linha);
      });
    }
    const continuar = this.botao(textosInterface.relato.continuar, 'botao-pixel botao-confirmar');
    continuar.addEventListener('click', () => {
      this.limpar();
      eventos.emit('roteiro:acao-concluida');
    });
    areaTela.append(titulo, lista, continuar);
    tela.append(sombra, moldura, areaTela);
    this.mostrar(tela);
  };

  private readonly abrirCones = (): void => {
    this.telaAtual = 'cones';
    const tela = this.elemento('section', 'barra-cones');
    const texto = this.elemento('p', 'texto-inspecao');
    texto.textContent = decisoes.D4.pergunta;
    const contador = this.elemento('strong', 'contador-cones');
    contador.textContent = textosInterface.cones.contador.replace('{selecionados}', '0').replace('{total}', String(regrasJogo.decisoes.quantidadeCones));
    const concluir = this.botao(textosInterface.cones.confirmar, 'botao-pixel');
    concluir.disabled = true;
    concluir.addEventListener('click', () => eventos.emit('roteiro:cones-confirmar'));
    tela.append(texto, contador, concluir);
    this.mostrar(tela);
  };

  private readonly atualizarCones = (dados: { selecionados: string[] }): void => {
    const contador = this.raiz.querySelector<HTMLElement>('.contador-cones');
    const concluir = this.raiz.querySelector<HTMLButtonElement>('.barra-cones button');
    if (contador) contador.textContent = textosInterface.cones.contador.replace('{selecionados}', String(dados.selecionados.length)).replace('{total}', String(regrasJogo.decisoes.quantidadeCones));
    if (concluir) concluir.disabled = dados.selecionados.length !== regrasJogo.decisoes.quantidadeCones;
  };

  private readonly mostrarResultado = (): void => {
    this.pararTemporizadores();
    this.telaAtual = 'resultado';
    estadoJogo.definirFlag('jogo-concluido');
    audioJogo.tocarResultado();
    const tela = this.elemento('section', 'tela-resultado ui-tela');
    tela.setAttribute('role', 'dialog');
    const titulo = this.elemento('h1', 'titulo-resultado');
    titulo.textContent = textosResultado.titulo;
    const pontos = this.elemento('strong', 'pontos-resultado');
    pontos.textContent = textosInterface.resultado.pontos.replace('{pontos}', String(estadoJogo.score())).replace('{maximo}', String(regrasJogo.pontuacao.maximo));
    const estrelas = this.elemento('div', 'estrelas-resultado');
    const totalEstrelas = estadoJogo.estrelas();
    for (let i = 0; i < 3; i += 1) {
      const imagem = this.imagem(`/assets/ui/tela-final/estrela-${i < totalEstrelas ? 'cheia' : 'vazia'}.png`, i < totalEstrelas ? textosInterface.resultado.estrelaCheia : textosInterface.resultado.estrelaVazia);
      imagem.className = 'estrela';
      if (i < totalEstrelas) {
        imagem.classList.add('estrela-aguardando');
        const temporizador = window.setTimeout(() => {
          if (this.telaAtual !== 'resultado' || !imagem.isConnected) return;
          imagem.classList.remove('estrela-aguardando');
          imagem.classList.add('estrela-acesa');
          audioJogo.tocar('estrela');
        }, i * configuracaoAudioJogo.intervaloEntreEstrelasMs);
        this.temporizadoresEstrelas.push(temporizador);
      }
      estrelas.append(imagem);
    }
    const listaErros = this.elemento('div', 'lista-erros rolagem-ui');
    const erros = this.coletarErros();
    if (!erros.length) {
      const semErros = this.elemento('p', 'cartao-erro');
      semErros.textContent = textosResultado.semErros;
      listaErros.append(semErros);
    } else {
      erros.forEach((texto) => {
        const cartao = this.elemento('p', 'cartao-erro');
        cartao.textContent = texto;
        listaErros.append(cartao);
      });
    }
    const consciencia = this.elemento('p', 'mensagem-conscientizacao');
    consciencia.textContent = textosResultado.mensagem;
    const convite = this.elemento('p', 'convite-sipat');
    convite.textContent = textosResultado.convite;
    const botoes = this.elemento('div', 'acoes-resultado');
    const novamente = this.botao(textosResultado.jogarNovamente, 'botao-pixel');
    novamente.addEventListener('click', () => eventos.emit('resultado:novo'));
    const menu = this.botao(textosResultado.menu, 'botao-secundario');
    menu.addEventListener('click', () => eventos.emit('resultado:menu'));
    botoes.append(novamente, menu);
    tela.append(titulo, pontos, estrelas, this.rotulo(textosInterface.resultado.tituloErros, 'titulo-erros'), listaErros, consciencia, convite, botoes);
    this.mostrar(tela);
  };

  private readonly mostrarDica = (texto: string): void => {
    const dica = this.elemento('p', 'dica-jogo');
    dica.textContent = texto === 'saida-bloqueada' ? textosInterface.jogo.saibaAntesDeSair : texto;
    this.mostrar(dica);
    window.setTimeout(() => { if (dica.isConnected) dica.remove(); }, 5000);
  };

  private mostrarFalaLocal(personagem: string, expressao: string, textoBruto: string, continuar: () => void): void {
    this.pararTemporizadores();
    this.telaAtual = 'fala-local';
    const caixa = this.elemento('section', 'ui-dialogo');
    const dados: DadosDialogo = { personagem, texto: textoBruto, expressao };
    const texto = this.criarConteudoDialogo(caixa, dados);
    this.acaoDialogoAtual = () => {
      this.avancarDialogo(texto, textoBruto, continuar);
    };
    caixa.addEventListener('pointerup', (evento) => {
      if (evento.target instanceof Element && evento.target.closest('button')) return;
      this.acaoDialogoAtual?.();
    });
    this.mostrar(caixa);
    this.iniciarDialogo(texto, textoBruto);
  }

  private criarConteudoDialogo(caixa: HTMLElement, dados: DadosDialogo): HTMLElement {
    const pensamentoAtivo = Boolean(dados.pensando || /\(pensando\)\s*$/iu.test(dados.personagem));
    const caixaRetrato = this.elemento('div', 'caixa-retrato-dialogo');
    const retrato = this.elemento('div', 'retrato-dialogo');
    this.aplicarRetrato(retrato, dados);
    const nome = this.elemento('h2', 'nome-dialogo');
    nome.textContent = dados.personagem.replace(' (pensando)', '');
    caixaRetrato.append(retrato, nome);
    const conteudo = this.elemento('div', 'conteudo-dialogo');
    if (pensamentoAtivo) {
      const pensando = this.elemento('span', 'marcador-pensando');
      pensando.textContent = textosInterface.dialogo.pensando.trim();
      conteudo.append(pensando);
    }
    const texto = this.elemento('span', `texto-dialogo${pensamentoAtivo ? ' pensamento' : ''}`);
    texto.dataset.conteudo = dados.texto;
    const indicador = this.elemento('span', 'indicador-avanco');
    indicador.setAttribute('aria-hidden', 'true');
    indicador.hidden = true;
    conteudo.append(texto, indicador);
    caixa.append(conteudo, caixaRetrato);
    return texto;
  }

  private aplicarRetrato(retrato: HTMLElement, dados: DadosDialogo): void {
    let personagem = dados.personagem.toLocaleLowerCase('pt-BR').replace(' (pensando)', '');
    const expressao = (dados.expressao ?? 'neutra').toLocaleLowerCase('pt-BR');
    if (personagem.includes('{nome}') || personagem === 'julia' || personagem === 'lucas') personagem = estadoJogo.dados.personagem;
    const nomes: Record<string, string> = { 'sr. antônio': 'antonio', 'sr antonio': 'antonio', 'antônio': 'antonio', 'marcos': 'marcos', 'renata': 'renata', 'caio': 'caio', 'diego': 'diego' };
    const npc = nomes[personagem];
    const estaDePijama = !estadoJogo.flag('uniforme') && estadoJogo.dados.capitulo === 1;
    let caminho: string;
    let caminhoAlternativo: string | undefined;
    let colunas: number;
    let linhas: number;
    let indices: Record<string, number>;
    if (npc) {
      caminho = `/assets/sprites/npcs/${npc}/retratos.png`;
      colunas = npc === 'renata' || npc === 'caio' ? 5 : 4;
      linhas = 1;
      indices = { neutra: 0, falando: 1, feliz: 2, seria: 3, séria: 3, preocupada: 4, envergonhado: 3, preocupado: 4, alerta: 3, surpresa: 3 };
    } else {
      const tipo = estadoJogo.dados.personagem;
      caminho = `/assets/sprites/jogaveis/${tipo}/${estaDePijama ? 'retratos-pijama.png' : 'retratos.png'}`;
      if (estaDePijama) caminhoAlternativo = `/assets/sprites/jogaveis/${tipo}/retratos.png`;
      colunas = 3;
      linhas = estaDePijama ? 1 : 2;
      indices = { neutra: 0, falando: 1, feliz: 2, preocupada: 3, alerta: 4, surpresa: 5, seria: 4 };
    }
    const indicesPijama = { neutra: 0, feliz: 1, preocupada: 2, preocupado: 2 };
    const indicePara = (mapa: Record<string, number>, quantidade: number): number => {
      const solicitado = mapa[expressao] ?? 0;
      return solicitado < quantidade ? solicitado : 0;
    };
    const aplicarQuadro = (colunasQuadro: number, linhasQuadro: number, indice: number): void => {
      retrato.style.backgroundSize = `${colunasQuadro * 64}px ${linhasQuadro * 64}px`;
      retrato.style.backgroundPosition = `-${(indice % colunasQuadro) * 64 + 4}px -${Math.floor(indice / colunasQuadro) * 64 + 4}px`;
    };
    const indice = indicePara(estaDePijama && !npc ? indicesPijama : indices, colunas * linhas);
    aplicarQuadro(colunas, linhas, indice);
    retrato.style.backgroundImage = `url("${caminho}")`;
    retrato.setAttribute('role', 'img');
    retrato.setAttribute('aria-label', textosInterface.dialogo.retrato.replace('{personagem}', dados.personagem));
    const imagem = new Image();
    let tentandoAlternativa = false;
    imagem.onerror = () => {
      if (!tentandoAlternativa && caminhoAlternativo) {
        tentandoAlternativa = true;
        this.avisoAsset(caminho);
        const indiceAlternativo = indicePara(indices, 6);
        aplicarQuadro(3, 2, indiceAlternativo);
        retrato.style.backgroundImage = `url("${caminhoAlternativo}")`;
        imagem.src = caminhoAlternativo;
        return;
      }
      retrato.classList.add('retrato-placeholder');
      retrato.style.backgroundImage = '';
      this.avisoAsset(tentandoAlternativa ? caminhoAlternativo ?? caminho : caminho);
    };
    imagem.src = caminho;
  }

  private iniciarDialogo(alvo: HTMLElement, texto: string): void {
    const area = alvo.parentElement;
    if (!area) return;
    this.paginasDialogo = this.paginarTexto(area, texto);
    this.paginaDialogo = 0;
    alvo.dataset.totalPaginas = String(this.paginasDialogo.length);
    alvo.dataset.paginaAtual = '1';
    this.digitar(alvo, this.paginasDialogo[0] ?? '');
  }

  private paginarTexto(area: HTMLElement, texto: string): string[] {
    if (!texto.trim()) return [''];
    const medir = (conteudo: string): boolean => {
      const medidor = area.cloneNode(true) as HTMLElement;
      const fala = medidor.querySelector<HTMLElement>('.texto-dialogo');
      const indicador = medidor.querySelector('.indicador-avanco');
      if (fala) fala.textContent = conteudo;
      indicador?.remove();
      medidor.style.position = 'fixed';
      medidor.style.inset = 'auto';
      medidor.style.left = '-10000px';
      medidor.style.top = '0';
      medidor.style.width = '262px';
      medidor.style.height = 'auto';
      medidor.style.minHeight = '0';
      medidor.style.maxHeight = 'none';
      medidor.style.overflow = 'visible';
      medidor.style.pointerEvents = 'none';
      document.body.append(medidor);
      const cabe = medidor.scrollHeight <= 76 && medidor.scrollWidth <= 262;
      medidor.remove();
      return cabe;
    };

    const paginas: string[] = [];
    let pagina = '';
    const palavras = texto.trim().split(/\s+/u);
    palavras.forEach((palavra) => {
      const candidata = pagina ? `${pagina} ${palavra}` : palavra;
      if (medir(candidata)) {
        pagina = candidata;
        return;
      }
      if (pagina) {
        paginas.push(pagina);
        pagina = '';
      }
      if (medir(palavra)) {
        pagina = palavra;
        return;
      }
      let trecho = '';
      for (const caractere of Array.from(palavra)) {
        if (trecho && !medir(trecho + caractere)) {
          paginas.push(trecho);
          trecho = caractere;
        } else {
          trecho += caractere;
        }
      }
      pagina = trecho;
    });
    if (pagina) paginas.push(pagina);
    return paginas.length ? paginas : [''];
  }

  private digitar(alvo: HTMLElement, texto: string): void {
    let indice = 0;
    const indicador = alvo.parentElement?.querySelector<HTMLElement>('.indicador-avanco');
    if (indicador) indicador.hidden = true;
    alvo.textContent = '';
    const digito = (): void => {
      if (this.completandoTexto) return;
      indice = Math.min(texto.length, indice + 2);
      alvo.textContent = texto.slice(0, indice);
      if (indice > 0) audioJogo.tocar('blip');
      if (indice < texto.length) {
        this.temporizadorTexto = window.setTimeout(digito, 22);
      } else if (indicador) {
        indicador.hidden = false;
      }
    };
    this.completandoTexto = false;
    if (texto.length) this.temporizadorTexto = window.setTimeout(digito, 22);
    else if (indicador) indicador.hidden = false;
  }

  private avancarDialogo(alvo: HTMLElement, texto: string, proximo?: () => void): void {
    const pagina = this.paginasDialogo[this.paginaDialogo] ?? texto;
    if (alvo.textContent !== pagina) {
      this.completandoTexto = true;
      if (this.temporizadorTexto !== undefined) window.clearTimeout(this.temporizadorTexto);
      alvo.textContent = pagina;
      const indicador = alvo.parentElement?.querySelector<HTMLElement>('.indicador-avanco');
      if (indicador) indicador.hidden = false;
      return;
    }
    if (this.paginaDialogo + 1 < this.paginasDialogo.length) {
      this.paginaDialogo += 1;
      alvo.dataset.paginaAtual = String(this.paginaDialogo + 1);
      this.digitar(alvo, this.paginasDialogo[this.paginaDialogo]);
      return;
    }
    this.pararTemporizadores();
    this.acaoDialogoAtual = undefined;
    if (proximo) {
      this.limpar();
      proximo();
      return;
    }
    eventos.emit(NOME_EVENTO_DIALOGO_FECHAR);
  }

  private coletarErros(): string[] {
    const erros: string[] = [];
    Object.entries(decisoes).forEach(([id, decisao]) => {
      const resposta = estadoJogo.dados.respostas[id];
      if (resposta && !resposta.acertou) erros.push(decisao.resultado);
    });
    itensInspecao.forEach((item) => {
      const marcado = estadoJogo.dados.inspecao.includes(item.id);
      if ((item.tipo === 'risco' && !marcado) || (item.tipo === 'falso' && marcado)) erros.push(item.resultado);
    });
    return erros;
  }

  private dataHoje(): Date {
    const forçada = new URLSearchParams(window.location.search).get('data');
    if (forçada && /^\d{4}-\d{2}-\d{2}$/.test(forçada)) {
      const data = new Date(`${forçada}T12:00:00`);
      if (!Number.isNaN(data.getTime())) return data;
    }
    return new Date();
  }

  private pensamentoDoDia(dia: DiaSipat, hoje: Date): string {
    const data = new Date(hoje.getFullYear(), sipatJson.mes - 1, dia.dia);
    const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    if (hojeSemHora < new Date(hoje.getFullYear(), sipatJson.mes - 1, diasSipat[0].dia)) return textosInterface.calendario.antesDaSemana;
    if (hojeSemHora > new Date(hoje.getFullYear(), sipatJson.mes - 1, diasSipat[diasSipat.length - 1].dia)) return textosInterface.calendario.depoisDaSemana;
    const tema = dia.tema;
    if (data < hojeSemHora) return textosInterface.calendario.pensamentoPassado.replace('{semana}', `${dia.semana[0].toLocaleUpperCase('pt-BR')}${dia.semana.slice(1)}`).replace('{tema}', tema);
    if (data.getTime() === hojeSemHora.getTime()) return textosInterface.calendario.pensamentoHoje.replace('{tema}', tema).replace('{horario}', dia.horario).replace('{local}', dia.local);
    return textosInterface.calendario.pensamentoFuturo.replace('{semana}', dia.semana).replace('{tema}', tema);
  }

  private mostrarCreditos(): void {
    const tela = this.elemento('section', 'painel-ui painel-creditos');
    tela.setAttribute('role', 'dialog');
    const titulo = this.elemento('h2', 'titulo-painel');
    titulo.textContent = textosInterface.creditos.titulo;
    const conteudo = this.elemento('pre', 'conteudo-creditos rolagem-ui');
    conteudo.textContent = creditosMarkdown;
    const fechar = this.botao(textosInterface.creditos.voltar, 'botao-pixel');
    fechar.addEventListener('click', () => this.mostrarMenu());
    tela.append(titulo, conteudo, fechar);
    this.mostrar(tela);
  }

  private botaoAudio(): HTMLButtonElement {
    const botao = this.botao('', 'botao-audio', null);
    botao.setAttribute('aria-label', estadoJogo.dados.audio ? textosInterface.audio.desligar : textosInterface.audio.ligar);
    const icone = this.imagem(`/assets/ui/icones/audio-${estadoJogo.dados.audio ? 'ligado' : 'mudo'}.png`, '');
    icone.alt = '';
    botao.append(icone);
    botao.addEventListener('click', () => {
      audioJogo.definirAtivo(!estadoJogo.dados.audio);
      icone.src = `/assets/ui/icones/audio-${estadoJogo.dados.audio ? 'ligado' : 'mudo'}.png`;
      botao.setAttribute('aria-label', estadoJogo.dados.audio ? textosInterface.audio.desligar : textosInterface.audio.ligar);
      if (estadoJogo.dados.audio) audioJogo.tocar('menu');
    });
    return botao;
  }

  private imagem(caminho: string, texto: string): HTMLImageElement {
    const imagem = new Image();
    imagem.src = caminho;
    imagem.alt = texto;
    imagem.addEventListener('error', () => {
      imagem.classList.add('asset-ausente');
      this.avisoAsset(caminho);
    }, { once: true });
    return imagem;
  }

  private botao(texto: string, classe: string, som: string | null = 'menu'): HTMLButtonElement {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = classe;
    botao.textContent = texto;
    if (som) botao.addEventListener('click', () => audioJogo.tocar(som));
    return botao;
  }

  private elemento<T extends keyof HTMLElementTagNameMap>(tag: T, classe: string): HTMLElementTagNameMap[T] {
    const elemento = document.createElement(tag);
    elemento.className = classe;
    if (elemento.classList.contains('painel-ui')) elemento.classList.add('ui-painel', 'rolagem-ui');
    return elemento;
  }

  private rotulo(texto: string, classe: string): HTMLElement {
    const elemento = this.elemento('span', classe);
    elemento.textContent = texto;
    return elemento;
  }

  private mostrar(elemento: HTMLElement): void {
    this.raiz.replaceChildren(elemento);
    eventos.emit('ui:modal', this.mapaAtivo && !['inspecao', 'cones', 'notificacao', ''].includes(this.telaAtual));
    this.anexarFaixaObjetivo();
    if (this.mapaAtivo && !['menu', 'selecao', 'resultado'].includes(this.telaAtual)) {
      this.raiz.append(this.botaoAudio());
    }
  }

  private limpar(): void {
    this.pararTemporizadores();
    this.fecharTutorialVisual();
    if (this.telaAtual === 'mensagem' || this.telaAtual === 'notificacao') this.mensagemPendente = undefined;
    this.raiz.replaceChildren();
    this.telaAtual = '';
    eventos.emit('ui:modal', false);
    this.anexarFaixaObjetivo();
    if (this.mapaAtivo) this.raiz.append(this.botaoAudio());
  }

  private readonly atualizarObjetivo = (dados: DadosObjetivo): void => {
    this.textoObjetivoAtual = dados.texto;
    this.inspecaoNaFaixa = false;
    this.atualizarTextoFaixa(dados.texto);
    this.anexarFaixaObjetivo();
    if (dados.animar) {
      this.faixaObjetivo?.classList.remove('objetivo-trocando');
      this.textoDaFaixa?.classList.remove('objetivo-entrando');
      // Força novo quadro da animação quando objetivos mudam em sequência.
      void this.faixaObjetivo?.offsetWidth;
      this.faixaObjetivo?.classList.add('objetivo-trocando');
      this.textoDaFaixa?.classList.add('objetivo-entrando');
    }
    if (dados.dicaInicial) this.mostrarDicaObjetivo();
  };

  private criarFaixaObjetivo(): HTMLElement {
    const faixa = this.elemento('div', 'faixa-objetivo');
    faixa.setAttribute('role', 'status');
    faixa.setAttribute('aria-live', 'polite');
    const icone = this.elemento('span', 'icone-objetivo');
    icone.setAttribute('aria-hidden', 'true');
    const texto = this.elemento('span', 'texto-faixa-objetivo');
    this.textoDaFaixa = texto;
    const dica = this.elemento('span', 'dica-faixa-objetivo');
    dica.textContent = textosInterface.objetivo.dicaInicial;
    dica.hidden = true;
    this.dicaDaFaixa = dica;
    faixa.append(icone, texto, dica);
    this.faixaObjetivo = faixa;
    return faixa;
  }

  private anexarFaixaObjetivo(): void {
    if (!this.faixaObjetivo) this.criarFaixaObjetivo();
    const faixa = this.faixaObjetivo;
    if (!faixa) return;
    faixa.hidden = !this.mapaAtivo || !this.textoObjetivoAtual || this.telaOcultaObjetivo();
    if (!this.raiz.contains(faixa)) this.raiz.append(faixa);
    this.ajustarTextoFaixa();
  }

  private telaOcultaObjetivo(): boolean {
    if (this.telaAtual === 'inspecao' && this.inspecaoNaFaixa) return false;
    return ['menu', 'selecao', 'dialogo', 'fala-local', 'mensagem', 'relato', 'calendario', 'decisao', 'inspecao', 'resultado'].includes(this.telaAtual);
  }

  private atualizarTextoFaixa(texto: string): void {
    if (!this.faixaObjetivo) this.criarFaixaObjetivo();
    if (!this.textoDaFaixa) return;
    this.textoDaFaixa.textContent = texto;
    this.faixaObjetivo?.setAttribute('aria-label', texto);
    this.ajustarTextoFaixa();
  }

  private ajustarTextoFaixa(): void {
    const texto = this.textoDaFaixa;
    if (!texto || !this.faixaObjetivo || this.faixaObjetivo.hidden || !texto.isConnected) return;
    texto.style.textOverflow = 'clip';
    texto.style.fontSize = '10px';
    if (texto.scrollWidth > texto.clientWidth) texto.style.fontSize = '9px';
    if (texto.scrollWidth > texto.clientWidth) texto.style.fontSize = '8px';
    texto.style.textOverflow = texto.scrollWidth > texto.clientWidth ? 'ellipsis' : 'clip';
  }

  private textoInspecaoObjetivo(): string {
    return textosInterface.objetivo.inspecao.replace('{tempo}', this.formatarTempoFaixa(this.segundosInspecao));
  }

  private formatarTempoFaixa(segundos: number): string {
    return `${Math.floor(segundos / 60)}:${(segundos % 60).toString().padStart(2, '0')}`;
  }

  private mostrarDicaObjetivo(): void {
    if (!this.dicaDaFaixa) return;
    if (this.temporizadorDicaObjetivo !== undefined) window.clearTimeout(this.temporizadorDicaObjetivo);
    this.dicaDaFaixa.hidden = false;
    this.temporizadorDicaObjetivo = window.setTimeout(() => {
      if (this.dicaDaFaixa) this.dicaDaFaixa.hidden = true;
      this.temporizadorDicaObjetivo = undefined;
    }, 3000);
  }

  private readonly mostrarEtapaTutorial = (dados: DadosEtapaTutorial): void => {
    if (dados.etapa === 'livre') {
      this.fecharTutorialVisual();
      return;
    }
    this.fecharTutorialVisual();
    this.tutorialEtapaAtual = dados.etapa;
    this.tutorialPosicaoSeta = dados.seta;
    this.tutorialPosicaoPersonagem = dados.personagem;
    document.getElementById('controles-toque')?.classList.toggle(
      'joystick-tutorial', dados.etapa === 'andar' && this.temToqueTutorial(),
    );
    if (dados.etapa === 'andar' && this.temToqueTutorial()) {
      const controles = document.getElementById('controles-toque');
      const estilos = controles ? getComputedStyle(controles) : undefined;
      const areaSegura = (nome: 'safe-left' | 'safe-bottom'): number =>
        Number.parseFloat(estilos?.getPropertyValue(`--${nome}`) ?? '') || 0;
      this.tutorialPosicaoJoystick = {
        x: 72 + areaSegura('safe-left'),
        y: 544 - areaSegura('safe-bottom'),
      };
    }
    if (this.temporizadorDicaObjetivo !== undefined) window.clearTimeout(this.temporizadorDicaObjetivo);
    this.temporizadorDicaObjetivo = undefined;
    if (this.dicaDaFaixa) this.dicaDaFaixa.hidden = true;

    const overlay = this.elemento('section', `tutorial-overlay tutorial-${dados.etapa}`);
    const textoAcessivel = dados.etapa === 'andar'
      ? this.temToqueTutorial() ? interfaceJson.tutorial.andarToque : interfaceJson.tutorial.andarTeclado
      : dados.etapa === 'objetivo' ? interfaceJson.tutorial.objetivo
        : this.temToqueTutorial() ? interfaceJson.tutorial.interagirToque : interfaceJson.tutorial.interagirTeclado;
    overlay.setAttribute('aria-label', textoAcessivel);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('tutorial-mascara');
    svg.setAttribute('viewBox', '0 0 360 640');
    svg.setAttribute('aria-hidden', 'true');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const mascara = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
    mascara.id = `mascara-tutorial-${dados.etapa}`;
    mascara.setAttribute('maskUnits', 'userSpaceOnUse');
    mascara.setAttribute('x', '0');
    mascara.setAttribute('y', '0');
    mascara.setAttribute('width', '360');
    mascara.setAttribute('height', '640');
    this.tutorialMascara = mascara;
    defs.append(mascara);
    const sombra = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    sombra.setAttribute('x', '0');
    sombra.setAttribute('y', '0');
    sombra.setAttribute('width', '360');
    sombra.setAttribute('height', '640');
    sombra.setAttribute('fill', '#000');
    sombra.setAttribute('fill-opacity', '0.6');
    sombra.setAttribute('mask', `url(#${mascara.id})`);
    svg.append(defs, sombra);
    overlay.append(svg);
    this.atualizarMascaraTutorial();

    if (dados.etapa === 'andar') {
      const dica = this.elemento('div', 'tutorial-dica tutorial-dica-andar');
      dica.textContent = this.temToqueTutorial()
        ? interfaceJson.tutorial.andarToque : interfaceJson.tutorial.andarTeclado;
      overlay.append(dica);
      if (this.temToqueTutorial()) {
        const mao = this.criarMaoTutorial();
        const ponto = this.tutorialPosicaoJoystick ?? { x: 72, y: 544 };
        mao.style.left = `${ponto.x - 24}px`;
        mao.style.bottom = `${592 - ponto.y}px`;
        overlay.append(mao);
      }
    } else if (dados.etapa === 'objetivo') {
      this.faixaObjetivo?.classList.add('tutorial-destacada');
      const dicaObjetivo = this.elemento('div', 'tutorial-dica tutorial-dica-objetivo');
      dicaObjetivo.textContent = interfaceJson.tutorial.objetivo;
      overlay.append(dicaObjetivo);
      const dicaSeta = this.elemento('div', 'tutorial-dica tutorial-dica-seta');
      dicaSeta.textContent = interfaceJson.tutorial.seta;
      this.tutorialDicaSeta = dicaSeta;
      this.posicionarDicaSetaTutorial();
      overlay.append(dicaSeta);
      const avancar = document.createElement('button');
      avancar.type = 'button';
      avancar.className = 'tutorial-toque';
      avancar.setAttribute('aria-label', interfaceJson.tutorial.objetivo);
      avancar.addEventListener('click', this.avancarTutorial);
      overlay.append(avancar);
      this.temporizadorTutorial = window.setTimeout(this.avancarTutorial, 3000);
    } else {
      const dica = this.elemento('div', 'tutorial-dica tutorial-dica-interagir');
      dica.textContent = this.temToqueTutorial()
        ? interfaceJson.tutorial.interagirToque : interfaceJson.tutorial.interagirTeclado;
      overlay.append(dica);
    }

    const pular = document.createElement('button');
    pular.type = 'button';
    pular.className = 'tutorial-pular';
    pular.textContent = interfaceJson.tutorial.pular;
    pular.addEventListener('click', (evento) => {
      evento.stopPropagation();
      audioJogo.tocar('menu');
      eventos.emit('tutorial:pular');
    });
    overlay.append(pular);
    this.tutorialElemento = overlay;
    this.raiz.append(overlay);
  };

  private readonly avancarTutorial = (): void => {
    if (this.tutorialEtapaAtual !== 'objetivo') return;
    if (this.temporizadorTutorial !== undefined) window.clearTimeout(this.temporizadorTutorial);
    this.temporizadorTutorial = undefined;
    eventos.emit('tutorial:avancar');
  };

  private readonly atualizarFocoJoystickTutorial = (posicao: PontoTutorial): void => {
    if (this.tutorialEtapaAtual !== 'andar') return;
    this.tutorialPosicaoJoystick = posicao;
    this.atualizarMascaraTutorial();
  };

  private atualizarMascaraTutorial(): void {
    const mascara = this.tutorialMascara;
    const etapa = this.tutorialEtapaAtual;
    if (!mascara || !etapa) return;
    const base = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    base.setAttribute('x', '0');
    base.setAttribute('y', '0');
    base.setAttribute('width', '360');
    base.setAttribute('height', '640');
    base.setAttribute('fill', '#fff');
    const recortes: SVGElement[] = [];
    if (etapa === 'andar') {
      if (this.temToqueTutorial()) {
        const ponto = this.tutorialPosicaoJoystick ?? { x: 72, y: 544 };
        recortes.push(this.circuloMascara(ponto.x, ponto.y, 66));
      } else {
        recortes.push(this.retanguloMascara(76, 584, 276, 48, 5));
      }
    } else if (etapa === 'objetivo') {
      recortes.push(this.retanguloMascara(0, 0, 350, 48, 5));
      if (this.tutorialPosicaoSeta) recortes.push(this.circuloMascara(this.tutorialPosicaoSeta.x, this.tutorialPosicaoSeta.y, 38));
    } else if (etapa === 'interagir') {
      if (this.temToqueTutorial()) {
        const controles = document.getElementById('controles-toque');
        const estilos = controles ? getComputedStyle(controles) : undefined;
        const safeRight = Number.parseFloat(estilos?.getPropertyValue('--safe-right') ?? '') || 0;
        const safeBottom = Number.parseFloat(estilos?.getPropertyValue('--safe-bottom') ?? '') || 0;
        recortes.push(this.circuloMascara(296 - safeRight, 544 - safeBottom, 47));
      }
      else recortes.push(this.retanguloMascara(76, 584, 276, 48, 5));
      if (this.tutorialPosicaoPersonagem) {
        recortes.push(this.circuloMascara(this.tutorialPosicaoPersonagem.x, this.tutorialPosicaoPersonagem.y, 50));
      }
    }
    mascara.replaceChildren(base, ...recortes);
  }

  private circuloMascara(x: number, y: number, raio: number): SVGCircleElement {
    const circulo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circulo.setAttribute('cx', String(x));
    circulo.setAttribute('cy', String(y));
    circulo.setAttribute('r', String(raio));
    circulo.setAttribute('fill', '#000');
    return circulo;
  }

  private retanguloMascara(x: number, y: number, largura: number, altura: number, raio: number): SVGRectElement {
    const retangulo = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    retangulo.setAttribute('x', String(x));
    retangulo.setAttribute('y', String(y));
    retangulo.setAttribute('width', String(largura));
    retangulo.setAttribute('height', String(altura));
    retangulo.setAttribute('rx', String(raio));
    retangulo.setAttribute('fill', '#000');
    return retangulo;
  }

  private posicionarDicaSetaTutorial(): void {
    if (!this.tutorialDicaSeta || !this.tutorialPosicaoSeta) return;
    const largura = 148;
    const esquerda = Math.max(8, Math.min(360 - largura - 8, this.tutorialPosicaoSeta.x - largura / 2));
    const topo = Math.max(74, Math.min(640 - 56, this.tutorialPosicaoSeta.y - 52));
    this.tutorialDicaSeta.style.left = `${esquerda}px`;
    this.tutorialDicaSeta.style.top = `${topo}px`;
  }

  private criarMaoTutorial(): HTMLElement {
    const mao = this.elemento('span', 'tutorial-mao');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 56 56');
    svg.setAttribute('aria-hidden', 'true');
    const forma = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    forma.setAttribute('d', 'M8 27h7V15h6v12h3V8h6v19h3V13h6v15h3V19h6v16l-8 11H20L8 37z');
    forma.setAttribute('fill', '#fff');
    forma.setAttribute('stroke', '#093f1a');
    forma.setAttribute('stroke-width', '4');
    forma.setAttribute('stroke-linejoin', 'miter');
    forma.setAttribute('shape-rendering', 'crispEdges');
    svg.append(forma);
    mao.append(svg);
    return mao;
  }

  private temToqueTutorial(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  private readonly fecharTutorialVisual = (): void => {
    if (this.temporizadorTutorial !== undefined) window.clearTimeout(this.temporizadorTutorial);
    this.temporizadorTutorial = undefined;
    this.tutorialElemento?.remove();
    this.tutorialElemento = undefined;
    this.tutorialMascara = undefined;
    this.tutorialDicaSeta = undefined;
    this.tutorialEtapaAtual = undefined;
    this.tutorialPosicaoJoystick = undefined;
    this.tutorialPosicaoSeta = undefined;
    this.tutorialPosicaoPersonagem = undefined;
    this.faixaObjetivo?.classList.remove('tutorial-destacada');
    document.getElementById('controles-toque')?.classList.remove('joystick-tutorial');
  };

  private pararTemporizadores(): void {
    if (this.temporizadorTexto !== undefined) window.clearTimeout(this.temporizadorTexto);
    if (this.temporizadorInspecao !== undefined) window.clearInterval(this.temporizadorInspecao);
    if (this.temporizadorNotificacao !== undefined) window.clearTimeout(this.temporizadorNotificacao);
    if (this.temporizadorMensagem !== undefined) window.clearTimeout(this.temporizadorMensagem);
    if (this.temporizadorTutorial !== undefined) window.clearTimeout(this.temporizadorTutorial);
    this.temporizadoresEstrelas.forEach((temporizador) => window.clearTimeout(temporizador));
    this.temporizadoresEstrelas.splice(0);
    this.temporizadorTexto = undefined;
    this.temporizadorInspecao = undefined;
    this.temporizadorNotificacao = undefined;
    this.temporizadorMensagem = undefined;
    this.temporizadorTutorial = undefined;
    this.acaoDialogoAtual = undefined;
    this.paginasDialogo = [];
    this.paginaDialogo = 0;
  }

  private formatarTempo(segundos: number): string {
    return `${Math.floor(segundos / 60).toString().padStart(2, '0')}:${(segundos % 60).toString().padStart(2, '0')}`;
  }

  private avisoAsset(caminho: string): void {
    console.warn(`[Missão Turno Seguro] Asset ausente: ${caminho}. Um placeholder visual será usado.`);
  }
}
