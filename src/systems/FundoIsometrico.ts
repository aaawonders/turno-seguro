import Phaser from 'phaser';

export function criarFundoIsometrico(
  texturas: Phaser.Textures.TextureManager,
  largura: number,
  altura: number,
  chave = 'fundo-mapa-teste',
): string {
  const textura = texturas.createCanvas(chave, largura, altura);
  if (!textura) return chave;
  const contexto = textura.context;
  contexto.imageSmoothingEnabled = false;
  contexto.fillStyle = '#0d1a12';
  contexto.fillRect(0, 0, largura, altura);

  preencherPoligono(contexto, [
    { x: 256, y: 148 }, { x: 32, y: 260 }, { x: 32, y: 372 }, { x: 256, y: 260 },
  ], '#555c59', '#212824');
  preencherPoligono(contexto, [
    { x: 256, y: 148 }, { x: 480, y: 260 }, { x: 480, y: 372 }, { x: 256, y: 260 },
  ], '#626966', '#212824');

  // Armário embutido na parede fica no fundo: não há passagem atrás dele.
  preencherPoligono(contexto, [
    { x: 77, y: 243 }, { x: 142, y: 211 }, { x: 142, y: 269 }, { x: 77, y: 301 },
  ], '#343a36', '#1c211e');
  preencherPoligono(contexto, [
    { x: 83, y: 249 }, { x: 136, y: 223 }, { x: 136, y: 261 }, { x: 83, y: 287 },
  ], '#77817b', '#292f2b');
  contexto.strokeStyle = '#aab2ad';
  contexto.lineWidth = 2;
  contexto.beginPath();
  contexto.moveTo(110, 253);
  contexto.lineTo(110, 276);
  contexto.stroke();

  for (let i = -6; i <= 6; i += 1) {
    for (let j = -6; j <= 6; j += 1) {
      if (Math.abs(i + j) > 6 || Math.abs(i - j) > 6) continue;
      const x = 256 + 32 * (i - j);
      const y = 372 + 16 * (i + j);
      const claro = (i - j + 2 * (i + j)) % 2 === 0;
      preencherPoligono(contexto, [
        { x, y: y - 16 }, { x: x + 32, y }, { x, y: y + 16 }, { x: x - 32, y },
      ], claro ? '#c9c9c9' : '#c1c1c1', '#aeb3af');
    }
  }
  preencherPoligono(contexto, [
    { x: 256, y: 260 }, { x: 480, y: 372 }, { x: 256, y: 484 }, { x: 32, y: 372 },
  ], 'rgba(0,0,0,0)', '#707873');
  textura.refresh();
  return chave;
}

function preencherPoligono(
  contexto: CanvasRenderingContext2D,
  pontos: { x: number; y: number }[],
  preenchimento: string,
  contorno: string,
): void {
  contexto.beginPath();
  contexto.moveTo(pontos[0].x, pontos[0].y);
  pontos.slice(1).forEach((ponto) => contexto.lineTo(ponto.x, ponto.y));
  contexto.closePath();
  if (preenchimento !== 'rgba(0,0,0,0)') {
    contexto.fillStyle = preenchimento;
    contexto.fill();
  }
  contexto.strokeStyle = contorno;
  contexto.lineWidth = 1;
  contexto.stroke();
}
