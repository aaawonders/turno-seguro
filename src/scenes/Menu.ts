import Phaser from 'phaser';
import { eventos } from '../state/eventos';
import { estadoJogo } from '../state/JogoEstado';

export class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#093F1A');
    eventos.emit('ui:tela-menu');
    eventos.on('menu:novo', this.novoJogo, this);
    eventos.on('menu:continuar', this.continuar, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventos.off('menu:novo', this.novoJogo, this);
      eventos.off('menu:continuar', this.continuar, this);
    });
  }

  private readonly novoJogo = (): void => { this.scene.start('Selecao'); };

  private readonly continuar = (): void => {
    const capitulo = estadoJogo.dados.capitulo;
    const areasPorCapitulo: Record<number, string> = { 1: 'quarto', 2: 'portaria', 3: 'vestiario', 4: 'corredor-a', 5: 'posto', 6: 'posto', 7: 'posto' };
    const area = estadoJogo.dados.area || areasPorCapitulo[capitulo] || 'quarto';
    this.scene.start('Mapa', { capitulo, area, continuar: true });
  };
}
