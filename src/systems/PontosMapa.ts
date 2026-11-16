import type { MapaInterpretado, PontoMapa } from './MapaTiled';
import type { Ponto } from './Colisao';

export type PassoPonto = { tipo: 'liberar' | 'bloquear'; ponto: string };

function tiposDoPonto(ponto: PontoMapa): string[] {
  const tipo = ponto.propriedades.tipo;
  return (Array.isArray(tipo) ? tipo : [tipo]).map(String);
}

export class PontosMapa {
  readonly pensamentosVisitados = new Set<string>();
  constructor(readonly mapa: MapaInterpretado) {}
  raio(ponto: PontoMapa): number {
    const raio = Number(ponto.propriedades.raio ?? 24);
    return Number.isFinite(raio) && raio > 0 ? raio : 24;
  }
  perto(posicao: Ponto, ponto: PontoMapa): boolean {
    return Math.hypot(posicao.x - ponto.x, posicao.y - ponto.y) <= this.raio(ponto);
  }
  liberar(nome: string): void {
    const ponto = this.mapa.pontos.get(nome);
    if (!ponto) { console.warn(`[Mapa] Ponto ausente ao liberar: ${nome}`); return; }
    ponto.propriedades.bloqueado = false;
    // Atualiza o array existente: a geometria de colisão mantém a mesma referência.
    for (let i = this.mapa.obstaculos.length - 1; i >= 0; i--) {
      const nomeColisao = this.mapa.obstaculos[i].nome;
      if (nomeColisao === nome || nomeColisao?.startsWith(`${nome}-`)) this.mapa.obstaculos.splice(i, 1);
    }
  }
  executar(passo: PassoPonto): void {
    if (passo.tipo === 'liberar') this.liberar(passo.ponto);
    else {
      const ponto = this.mapa.pontos.get(passo.ponto);
      if (ponto) ponto.propriedades.bloqueado = true;
    }
  }
  interacao(posicao: Ponto, aceitar: (nome: string) => boolean = () => true): [string, PontoMapa] | undefined {
    return [...this.mapa.pontos].filter(([nome, p]) => aceitar(nome) &&
      tiposDoPonto(p).some((tipo) => ['interacao', 'npc'].includes(tipo))
        && !p.propriedades.bloqueado && this.perto(posicao, p))
      .sort((a, b) => Math.hypot(posicao.x - a[1].x, posicao.y - a[1].y) - Math.hypot(posicao.x - b[1].x, posicao.y - b[1].y))[0];
  }
  pensamento(posicao: Ponto): [string, PontoMapa] | undefined {
    const encontrado = [...this.mapa.pontos].find(([nome, p]) => tiposDoPonto(p).includes('pensamento')
      && !this.pensamentosVisitados.has(nome) && this.perto(posicao, p));
    if (encontrado) this.pensamentosVisitados.add(encontrado[0]);
    return encontrado;
  }
  saida(posicao: Ponto): [string, PontoMapa] | undefined {
    return [...this.mapa.pontos].find(([, p]) => tiposDoPonto(p).includes('saida')
      && !p.propriedades.bloqueado && this.perto(posicao, p));
  }

  saidaBloqueada(posicao: Ponto): [string, PontoMapa] | undefined {
    return [...this.mapa.pontos].find(([, p]) => tiposDoPonto(p).includes('saida')
      && Boolean(p.propriedades.bloqueado) && this.perto(posicao, p));
  }
}
