import Phaser from 'phaser';
import { eventos } from '../state/eventos';
import { estadoJogo } from '../state/JogoEstado';

export class Selecao extends Phaser.Scene {
  constructor() { super('Selecao'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#093F1A');
    eventos.emit('ui:tela-selecao');
    eventos.on('selecao:confirmar', this.confirmar, this);
    eventos.on('selecao:voltar', this.voltar, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventos.off('selecao:confirmar', this.confirmar, this);
      eventos.off('selecao:voltar', this.voltar, this);
    });
  }

  private readonly confirmar = (personagem: 'julia' | 'lucas'): void => {
    estadoJogo.novo(personagem);
    estadoJogo.iniciarCapitulo(1, 'quarto');
    this.scene.start('Mapa', { capitulo: 1, area: 'quarto' });
  };

  private readonly voltar = (): void => { this.scene.start('Menu'); };
}
