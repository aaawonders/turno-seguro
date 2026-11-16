export interface Vetor {
  x: number;
  y: number;
}

export function aplicarZonaMorta(x: number, y: number, zona: number): Vetor {
  const modulo = Math.hypot(x, y);
  if (modulo <= zona) return { x: 0, y: 0 };
  const intensidade = (Math.min(modulo, 1) - zona) / (1 - zona);
  return { x: x / modulo * intensidade, y: y / modulo * intensidade };
}

export function aproximarVetor(atual: Vetor, alvo: Vetor, passo: number): Vetor {
  const x = alvo.x - atual.x;
  const y = alvo.y - atual.y;
  const distancia = Math.hypot(x, y);
  if (distancia <= passo || distancia === 0) return { ...alvo };
  return { x: atual.x + x / distancia * passo, y: atual.y + y / distancia * passo };
}
