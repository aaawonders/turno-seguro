import type Phaser from 'phaser';

export function limitesCamera(largura: number, altura: number, telaLargura: number, telaAltura: number) {
  return { x: Math.min(0, (largura - telaLargura) / 2), y: Math.min(0, (altura - telaAltura) / 2),
    largura: Math.max(largura, telaLargura), altura: Math.max(altura, telaAltura) };
}

export function configurarCameraMapa(camera: Phaser.Cameras.Scene2D.Camera, largura: number, altura: number): void {
  const limites = limitesCamera(largura, altura, camera.width, camera.height);
  camera.setBackgroundColor('#0d1a12');
  camera.setBounds(limites.x, limites.y, limites.largura, limites.altura);
  camera.centerOn(largura / 2, altura / 2);
}
