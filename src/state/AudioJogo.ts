import audioJson from '../data/audio.json';
import { estadoJogo } from './JogoEstado';

type CanalAudio = 'musica' | 'ambiente';
type EspecificacaoAudio = {
  arquivo: string;
  volume: number;
  loop: boolean;
  pitchMin?: number;
  pitchMax?: number;
  semSobrepor?: boolean;
};
type ConfiguracaoAudio = {
  musicas: Record<string, EspecificacaoAudio>;
  ambientes: Record<string, EspecificacaoAudio>;
  efeitos: Record<string, EspecificacaoAudio>;
  fadeMs: number;
  fadeVolumeMs: number;
  volumeMusicaBaixada: number;
  passoMs: number;
  intervaloEntreEstrelasMs: number;
};

const configuracao = audioJson as ConfiguracaoAudio;

class AudioJogo {
  private desbloqueado = false;
  private paginaVisivel = document.visibilityState !== 'hidden';
  private musica?: HTMLAudioElement;
  private ambiente?: HTMLAudioElement;
  private musicaBase = configuracao.musicas['t1-tema'].volume;
  private readonly temporizadores = new Map<CanalAudio, number>();
  private readonly caminhosAlvo = new Map<CanalAudio, string | undefined>();
  private readonly volumesAlvo = new Map<CanalAudio, number>();
  private readonly loopsAlvo = new Map<CanalAudio, boolean>();
  private readonly faixasAtivas = new Map<CanalAudio, Set<HTMLAudioElement>>();
  private readonly piscinas = new Map<string, HTMLAudioElement[]>();
  private readonly caminhosAudio = new WeakMap<HTMLAudioElement, string>();
  private readonly finalizadoresMusicais = new Map<HTMLAudioElement, {
    finalizar: () => void;
    aoFinal?: () => void;
  }>();
  private readonly arquivosComErro = new Set<string>();
  private readonly avisosEmitidos = new Set<string>();

  constructor() {
    document.addEventListener('visibilitychange', this.alterarVisibilidade);
  }

  desbloquear(): void {
    if (this.desbloqueado) return;
    this.desbloqueado = true;
    this.sincronizarCanais();
  }

  definirAtivo(ativo: boolean): void {
    estadoJogo.dados.audio = ativo;
    estadoJogo.salvar();
    if (!ativo) {
      this.piscinas.forEach((audios) => audios.forEach((audio) => {
        audio.pause();
        try { audio.currentTime = 0; } catch { /* Alguns navegadores ainda não abriram o arquivo. */ }
      }));
      [...this.finalizadoresMusicais.keys()].forEach((audio) => this.finalizarSomMusical(audio));
    }
    this.sincronizarCanais();
  }

  precarregarEfeitos(): void {
    Object.entries(configuracao.efeitos).forEach(([nome, som]) => {
      const chave = `efeito:${nome}`;
      if (this.piscinas.has(chave) || this.arquivosComErro.has(som.arquivo)) return;
      const audio = this.criarAudio(som.arquivo);
      if (!audio) return;
      this.piscinas.set(chave, [audio]);
      this.carregar(audio);
    });
  }

  trocarTrilha(capitulo: number, menu = false): void {
    const chave = menu ? 't1-tema' : capitulo === 4 ? 't3-ontem'
      : capitulo === 5 ? 't4-olho-vivo' : capitulo === 6 ? 't5-sipat' : 't2-fabrica';
    this.trocarMusica(chave);

    const ambienteAtivo = !menu && capitulo >= 2 && capitulo <= 7;
    const somAmbiente = ambienteAtivo ? configuracao.ambientes['ambiente-fabrica'] : undefined;
    this.trocarCanal(
      'ambiente',
      somAmbiente?.arquivo,
      somAmbiente?.volume ?? 0,
      somAmbiente?.loop ?? false,
      configuracao.fadeMs,
    );
  }

  trocarMusica(chave: string, volume?: number): void {
    const som = configuracao.musicas[chave];
    if (!som) {
      this.avisarUmaVez(`musica:${chave}`, `[Áudio] Música não configurada: ${chave}.`);
      return;
    }
    this.musicaBase = this.limitarVolume(volume ?? som.volume);
    this.trocarCanal(
      'musica',
      som.arquivo,
      this.volumeAlvoMusica(),
      som.loop,
      configuracao.fadeMs,
    );
  }

  tocarResultado(): void {
    this.musicaBase = configuracao.volumeMusicaBaixada;
    this.trocarCanal('ambiente', undefined, 0, false, configuracao.fadeMs);
    this.tocarMusicaPontual('j1-vitoria', () => {
      this.trocarMusica('t1-tema', configuracao.volumeMusicaBaixada);
    });
  }

  tocarTempoEsgotado(): void {
    this.tocarMusicaPontual('j2-tempo-esgotado');
  }

  tocar(nome: string): void {
    if (!this.podeTocar()) return;
    const som = configuracao.efeitos[nome];
    if (!som) {
      this.avisarUmaVez(`efeito:${nome}`, `[Áudio] Efeito não configurado: ${nome}.`);
      return;
    }
    const chave = `efeito:${nome}`;
    const piscina = this.piscinas.get(chave) ?? [];
    if (som.semSobrepor && piscina.some((audio) => !audio.paused && !audio.ended)) return;
    const audio = this.obterAudio(chave, som);
    if (audio) this.reproduzirEfeito(audio, som);
  }

  pararEfeito(nome: string): void {
    this.piscinas.get(`efeito:${nome}`)?.forEach((audio) => {
      audio.pause();
      try { audio.currentTime = 0; } catch { /* O efeito pode ainda estar carregando. */ }
    });
  }

  destruir(): void {
    document.removeEventListener('visibilitychange', this.alterarVisibilidade);
    this.temporizadores.forEach((id) => window.clearTimeout(id));
    this.temporizadores.clear();
    this.todosAudios().forEach((audio) => {
      audio.pause();
      try { audio.currentTime = 0; } catch { /* Ignora elementos ainda sem dados. */ }
    });
    this.finalizadoresMusicais.clear();
    this.piscinas.clear();
    this.faixasAtivas.clear();
    this.caminhosAlvo.clear();
    this.volumesAlvo.clear();
    this.loopsAlvo.clear();
    this.musica = undefined;
    this.ambiente = undefined;
  }

  private readonly alterarVisibilidade = (): void => {
    const visivel = document.visibilityState !== 'hidden';
    if (visivel === this.paginaVisivel) return;
    this.paginaVisivel = visivel;
    if (!visivel) {
      this.todosAudios().forEach((audio) => audio.pause());
      return;
    }
    if (!this.podeTocar()) return;
    this.sincronizarCanais();
    this.todosAudios().forEach((audio) => {
      if (audio.currentTime > 0 && !audio.ended && audio.paused) this.tocarElemento(audio);
    });
  };

  private tocarMusicaPontual(chave: string, aoFinal?: () => void): void {
    const som = configuracao.musicas[chave];
    if (!som) {
      this.avisarUmaVez(`musica:${chave}`, `[Áudio] Música não configurada: ${chave}.`);
      aoFinal?.();
      return;
    }
    if (!this.podeTocar()) {
      aoFinal?.();
      return;
    }
    const audio = this.obterAudio(`musica-pontual:${chave}`, som);
    if (!audio) {
      aoFinal?.();
      return;
    }

    audio.loop = false;
    audio.volume = this.limitarVolume(som.volume);
    audio.playbackRate = 1;
    const finalizar = (): void => this.finalizarSomMusical(audio);
    this.finalizadoresMusicais.set(audio, { finalizar, aoFinal });
    audio.addEventListener('ended', finalizar, { once: true });
    this.atualizarVolumeMusica(configuracao.fadeVolumeMs);
    this.tocarElemento(audio, finalizar, true);
  }

  private finalizarSomMusical(audio: HTMLAudioElement): void {
    const evento = this.finalizadoresMusicais.get(audio);
    if (!evento) return;
    this.finalizadoresMusicais.delete(audio);
    audio.removeEventListener('ended', evento.finalizar);
    audio.pause();
    if (evento.aoFinal) evento.aoFinal();
    else this.atualizarVolumeMusica(configuracao.fadeVolumeMs);
  }

  private atualizarVolumeMusica(duracao: number): void {
    const caminho = this.caminhosAlvo.get('musica');
    if (!caminho) return;
    const atual = this.musica;
    this.trocarCanal(
      'musica',
      caminho,
      this.volumeAlvoMusica(),
      this.loopsAlvo.get('musica') ?? true,
      duracao,
    );
    if (atual && this.podeTocar()) this.tocarElemento(atual);
  }

  private trocarCanal(
    canal: CanalAudio,
    caminho: string | undefined,
    volume: number,
    loop: boolean,
    duracao: number,
  ): void {
    const audios = this.faixasAtivas.get(canal) ?? new Set<HTMLAudioElement>();
    this.faixasAtivas.set(canal, audios);
    const timerAntigo = this.temporizadores.get(canal);
    if (timerAntigo !== undefined) window.clearTimeout(timerAntigo);
    this.temporizadores.delete(canal);

    const atual = this.audioAtual(canal);
    let novo: HTMLAudioElement | undefined;
    if (caminho) {
      novo = caminho === this.caminhosAlvo.get(canal) && atual
        ? atual
        : [...audios].find((audio) => this.caminhosAudio.get(audio) === caminho);
      if (!novo) {
        novo = this.criarAudio(caminho);
        if (novo) {
          audios.add(novo);
          this.carregar(novo);
        }
      }
      if (novo && novo !== atual) {
        novo.loop = loop;
        try { novo.currentTime = 0; } catch { /* O navegador ajustará a posição após carregar o áudio. */ }
        novo.volume = 0;
      }
    }

    this.caminhosAlvo.set(canal, caminho);
    this.volumesAlvo.set(canal, this.limitarVolume(volume));
    this.loopsAlvo.set(canal, loop);
    if (canal === 'musica') this.musica = novo;
    else this.ambiente = novo;

    const anteriores = [...audios].filter((audio) => audio !== novo);
    if (!novo && anteriores.length === 0) return;
    const volumesAnteriores = new Map(anteriores.map((audio) => [audio, audio.volume]));
    const volumeInicialNovo = novo?.volume ?? 0;
    if (novo && this.podeTocar()) this.tocarElemento(novo);

    const inicio = performance.now();
    const passo = (): void => {
      const progresso = duracao <= 0 ? 1 : Math.min(1, (performance.now() - inicio) / duracao);
      const audivel = this.podeTocar();
      if (novo) {
        novo.volume = audivel ? volumeInicialNovo + (this.volumesAlvo.get(canal) ?? 0) * progresso - volumeInicialNovo * progresso : 0;
        if (audivel && novo.paused) this.tocarElemento(novo);
      }
      anteriores.forEach((audio) => {
        audio.volume = audivel ? (volumesAnteriores.get(audio) ?? 0) * (1 - progresso) : 0;
      });

      if (progresso >= 1) {
        this.temporizadores.delete(canal);
        anteriores.forEach((audio) => {
          audio.pause();
          try { audio.currentTime = 0; } catch { /* Ignora faixas que falharam ao abrir. */ }
          audios.delete(audio);
        });
        if (novo) {
          novo.volume = audivel ? this.volumesAlvo.get(canal) ?? 0 : 0;
          if (!audivel) novo.pause();
        }
        return;
      }
      const id = window.setTimeout(passo, 32);
      this.temporizadores.set(canal, id);
    };
    passo();
  }

  private obterAudio(chave: string, som: EspecificacaoAudio): HTMLAudioElement | undefined {
    if (this.arquivosComErro.has(som.arquivo)) return undefined;
    const piscina = this.piscinas.get(chave) ?? [];
    let audio = piscina.find((item) => item.paused || item.ended);
    if (!audio) {
      audio = this.criarAudio(som.arquivo);
      if (!audio) return undefined;
      piscina.push(audio);
      this.piscinas.set(chave, piscina);
      this.carregar(audio);
    }
    return audio;
  }

  private criarAudio(caminho: string): HTMLAudioElement | undefined {
    if (this.arquivosComErro.has(caminho)) return undefined;
    try {
      const audio = new Audio(caminho);
      audio.preload = 'auto';
      this.caminhosAudio.set(audio, caminho);
      audio.addEventListener('error', () => this.registrarFalha(caminho, audio), { once: true });
      return audio;
    } catch {
      this.registrarFalha(caminho);
      return undefined;
    }
  }

  private carregar(audio: HTMLAudioElement): void {
    try { audio.load(); } catch { this.registrarFalha(this.caminhosAudio.get(audio) ?? 'arquivo desconhecido', audio); }
  }

  private registrarFalha(caminho: string, audio?: HTMLAudioElement): void {
    this.arquivosComErro.add(caminho);
    this.avisarUmaVez(caminho, `[Áudio] Não foi possível carregar ${caminho}; o jogo seguirá em silêncio.`);
    if (audio) this.finalizarSomMusical(audio);
  }

  private reproduzirEfeito(audio: HTMLAudioElement, som: EspecificacaoAudio): void {
    audio.loop = som.loop;
    audio.volume = this.limitarVolume(som.volume);
    audio.playbackRate = this.pitchAleatorio(som);
    this.desativarPreservacaoTom(audio);
    this.tocarElemento(audio, undefined, true);
  }

  private tocarElemento(audio: HTMLAudioElement, aoFalhar?: () => void, reiniciar = false): void {
    if (!this.podeTocar()) return;
    if (reiniciar) {
      try { audio.currentTime = 0; } catch { /* O navegador ajustará ao terminar o carregamento. */ }
    }
    audio.play().catch(() => aoFalhar?.());
  }

  private desativarPreservacaoTom(audio: HTMLAudioElement): void {
    const elemento = audio as HTMLAudioElement & {
      preservesPitch?: boolean;
      webkitPreservesPitch?: boolean;
      mozPreservesPitch?: boolean;
    };
    elemento.preservesPitch = false;
    elemento.webkitPreservesPitch = false;
    elemento.mozPreservesPitch = false;
  }

  private pitchAleatorio(som: EspecificacaoAudio): number {
    if (som.pitchMin === undefined || som.pitchMax === undefined) return 1;
    return som.pitchMin + Math.random() * (som.pitchMax - som.pitchMin);
  }

  private sincronizarCanais(): void {
    const ativo = this.podeTocar();
    (['musica', 'ambiente'] as const).forEach((canal) => {
      const atual = this.audioAtual(canal);
      const audios = this.faixasAtivas.get(canal);
      if (!audios) return;
      if (!ativo) {
        audios.forEach((audio) => { audio.volume = 0; audio.pause(); });
        return;
      }
      if (this.temporizadores.has(canal)) {
        audios.forEach((audio) => this.tocarElemento(audio));
        return;
      }
      audios.forEach((audio) => {
        if (audio === atual) {
          audio.volume = this.volumesAlvo.get(canal) ?? 0;
          this.tocarElemento(audio);
        } else {
          audio.pause();
          audios.delete(audio);
        }
      });
    });
  }

  private todosAudios(): Set<HTMLAudioElement> {
    const audios = new Set<HTMLAudioElement>();
    this.faixasAtivas.forEach((faixas) => faixas.forEach((audio) => audios.add(audio)));
    this.piscinas.forEach((piscina) => piscina.forEach((audio) => audios.add(audio)));
    return audios;
  }

  private audioAtual(canal: CanalAudio): HTMLAudioElement | undefined {
    return canal === 'musica' ? this.musica : this.ambiente;
  }

  private volumeAlvoMusica(): number {
    return this.finalizadoresMusicais.size > 0
      ? Math.min(this.musicaBase, configuracao.volumeMusicaBaixada)
      : this.musicaBase;
  }

  private podeTocar(): boolean {
    return this.desbloqueado && this.paginaVisivel && estadoJogo.dados.audio;
  }

  private limitarVolume(volume: number): number {
    return Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 0));
  }

  private avisarUmaVez(chave: string, mensagem: string): void {
    if (this.avisosEmitidos.has(chave)) return;
    this.avisosEmitidos.add(chave);
    console.warn(mensagem);
  }
}

export const audioJogo = new AudioJogo();
export const configuracaoAudioJogo = configuracao;
