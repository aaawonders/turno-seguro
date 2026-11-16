import Phaser from 'phaser';

export interface DadosDialogo {
  personagem: string;
  texto: string;
  expressao?: string;
  pensando?: boolean;
}

export interface DadosDepuracao {
  fps: number;
  direcao: { x: number; y: number };
  pontos?: Array<{ nome: string; x: number; y: number }>;
  camera?: { x: number; y: number };
}

export interface DadosObjetivo {
  texto: string;
  ponto?: string;
  animar?: boolean;
  dicaInicial?: boolean;
}

export const NOME_EVENTO_DIALOGO_ABRIR = 'dialogo:abrir';
export const NOME_EVENTO_DIALOGO_FECHAR = 'dialogo:fechar';
export const NOME_EVENTO_DEPURACAO_ATUALIZAR = 'depuracao:atualizar';
export const NOME_EVENTO_OBJETIVO = 'ui:objetivo';
export const NOME_EVENTO_MENSAGEM_ABERTA = 'roteiro:mensagem-aberta';

export const eventos = new Phaser.Events.EventEmitter();
