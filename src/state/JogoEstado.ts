export interface RespostaJogo { opcao: string; acertou: boolean; tentativas: string[] }
export interface ObjetivoJogo { texto: string; ponto?: string }
export interface EstadoJogo {
  personagem: 'julia' | 'lucas';
  capitulo: number;
  area: string;
  iniciado: boolean;
  flags: Record<string, boolean | string | number>;
  respostas: Record<string, RespostaJogo>;
  tentativasD1: string[];
  inspecao: string[];
  diasAbertos: number[];
  objetivo?: ObjetivoJogo;
  audio: boolean;
  tutorialVisto: boolean;
}

const CHAVE = 'missao-turno-seguro:v1';
const novoEstado = (): EstadoJogo => ({ personagem: 'julia', capitulo: 1, area: 'quarto', iniciado: false, flags: {}, respostas: {}, tentativasD1: [], inspecao: [], diasAbertos: [], audio: true, tutorialVisto: false });

class JogoEstado {
  dados: EstadoJogo = this.carregar();
  private carregar(): EstadoJogo {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (!salvo) return novoEstado();
      const bruto = JSON.parse(salvo) as Partial<EstadoJogo>;
      const respostas = { ...novoEstado().respostas, ...(bruto.respostas ?? {}) };
      const tentativasD1 = Array.isArray(bruto.tentativasD1) ? bruto.tentativasD1 : [];
      const respostaD1Antiga = respostas.D1;
      if (!Array.isArray(bruto.tentativasD1) && respostaD1Antiga && !respostaD1Antiga.opcao.includes(',')) {
        tentativasD1.push(...(respostaD1Antiga.tentativas.length ? respostaD1Antiga.tentativas : [respostaD1Antiga.opcao]));
        delete respostas.D1;
      }
      const dados: EstadoJogo = {
        ...novoEstado(),
        ...bruto,
        flags: { ...novoEstado().flags, ...(bruto.flags ?? {}) },
        respostas,
        tentativasD1,
        inspecao: Array.isArray(bruto.inspecao) ? bruto.inspecao : [],
        diasAbertos: Array.isArray(bruto.diasAbertos) ? bruto.diasAbertos : [],
        tutorialVisto: bruto.tutorialVisto === true,
        objetivo: bruto.objetivo && typeof bruto.objetivo.texto === 'string'
          ? {
            texto: bruto.objetivo.texto,
            ...(typeof bruto.objetivo.ponto === 'string' && bruto.objetivo.ponto ? { ponto: bruto.objetivo.ponto } : {}),
          }
          : undefined,
      };
      if (!Number.isInteger(dados.capitulo) || dados.capitulo < 1 || dados.capitulo > 7) return novoEstado();
      return dados;
    } catch { return novoEstado(); }
  }
  salvar(): void { try { localStorage.setItem(CHAVE, JSON.stringify(this.dados)); } catch { console.warn('[Jogo] Não foi possível salvar o progresso neste aparelho.'); } }
  novo(personagem: 'julia' | 'lucas'): void {
    const audio = this.dados.audio;
    const tutorialVisto = this.dados.tutorialVisto;
    this.dados = { ...novoEstado(), personagem, audio, tutorialVisto };
    this.salvar();
  }
  marcarTutorialVisto(): void {
    if (this.dados.tutorialVisto) return;
    this.dados.tutorialVisto = true;
    this.salvar();
  }
  iniciarCapitulo(capitulo: number, area: string): void {
    this.dados.capitulo = capitulo;
    this.dados.area = area;
    this.dados.iniciado = true;
    this.salvar();
  }
  definirObjetivo(texto: string, ponto?: string): boolean {
    const objetivo: ObjetivoJogo = { texto, ...(ponto ? { ponto } : {}) };
    const atual = this.dados.objetivo;
    if (atual?.texto === objetivo.texto && atual.ponto === objetivo.ponto) return false;
    this.dados.objetivo = objetivo;
    this.salvar();
    return true;
  }
  flag(nome: string): boolean { return Boolean(this.dados.flags[nome]); }
  definirFlag(nome: string, valor: boolean | string | number = true): void { this.dados.flags[nome] = valor; this.salvar(); }
  responder(id: string, resposta: RespostaJogo): void { this.dados.respostas[id] = resposta; this.salvar(); }
  registrarTentativa(id: string, opcao: string): void {
    if (id !== 'D1') return;
    this.dados.tentativasD1.push(opcao);
    this.salvar();
  }
  alternarInspecao(id: string): void { this.dados.inspecao = this.dados.inspecao.includes(id) ? this.dados.inspecao.filter(item => item !== id) : [...this.dados.inspecao, id]; this.salvar(); }
  score(): number {
    const decisoes = Object.values(this.dados.respostas).reduce((soma, resposta) =>
      soma + (resposta.acertou ? regras.pontuacao.decisaoCorreta : 0), 0);
    const inspecao = this.dados.inspecao.reduce((soma, id) => soma + (
      id.startsWith('risco-') ? regras.pontuacao.riscoMarcado
        : id.startsWith('falso-') ? regras.pontuacao.falsoAlarmeMarcado : 0
    ), 0);
    return Math.max(0, Math.min(regras.pontuacao.maximo, decisoes + inspecao));
  }
  estrelas(): number {
    const pontos = this.score();
    return pontos >= regras.pontuacao.estrelasTres ? 3 : pontos >= regras.pontuacao.estrelasDuas ? 2 : 1;
  }
}

export const estadoJogo = new JogoEstado();
import regras from '../data/regras-jogo.json';

