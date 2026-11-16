export interface Ponto {
  x: number;
  y: number;
}

export interface ObstaculoPoligonal {
  pontos: Ponto[];
  nome?: string;
  propriedades?: Record<string, unknown>;
}

export interface ElipsePes {
  raioX: number;
  raioY: number;
}

export interface GeometriaColisao {
  caminhavel: Ponto[];
  obstaculos: ObstaculoPoligonal[];
  elipsePes: ElipsePes;
}

export function pontoDentroDoPoligono(ponto: Ponto, poligono: Ponto[]): boolean {
  if (poligono.length < 3) return false;
  let dentro = false;
  for (let atual = 0, anterior = poligono.length - 1; atual < poligono.length; anterior = atual, atual += 1) {
    const a = poligono[anterior];
    const b = poligono[atual];
    const produto = (ponto.x - a.x) * (b.y - a.y) - (ponto.y - a.y) * (b.x - a.x);
    const naBorda = Math.abs(produto) < 1e-7
      && ponto.x >= Math.min(a.x, b.x) && ponto.x <= Math.max(a.x, b.x)
      && ponto.y >= Math.min(a.y, b.y) && ponto.y <= Math.max(a.y, b.y);
    if (naBorda) return true;
    const cruza = (a.y > ponto.y) !== (b.y > ponto.y)
      && ponto.x < (b.x - a.x) * (ponto.y - a.y) / (b.y - a.y) + a.x;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

export function pontosDosPes(centro: Ponto, elipse: ElipsePes): Ponto[] {
  return [
    centro,
    { x: centro.x - elipse.raioX, y: centro.y },
    { x: centro.x + elipse.raioX, y: centro.y },
    { x: centro.x, y: centro.y - elipse.raioY },
    { x: centro.x, y: centro.y + elipse.raioY },
  ];
}

export function posicaoValida(centro: Ponto, geometria: GeometriaColisao): boolean {
  const amostras = pontosDosPes(centro, geometria.elipsePes);
  return amostras.every((ponto) => pontoDentroDoPoligono(ponto, geometria.caminhavel))
    && geometria.obstaculos.every((obstaculo) =>
      amostras.every((ponto) => !pontoDentroDoPoligono(ponto, obstaculo.pontos)),
    );
}

export function resolverMovimento(
  atual: Ponto,
  destino: Ponto,
  geometria: GeometriaColisao,
): Ponto {
  if (posicaoValida(destino, geometria)) return destino;
  const eixoX = { x: destino.x, y: atual.y };
  if (posicaoValida(eixoX, geometria)) return eixoX;
  const eixoY = { x: atual.x, y: destino.y };
  if (posicaoValida(eixoY, geometria)) return eixoY;
  return atual;
}
