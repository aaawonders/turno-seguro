import type { ObstaculoPoligonal, Ponto } from './Colisao';

export interface PropriedadeTiled {
  name: string;
  type?: string;
  value: unknown;
}

export interface ObjetoTiled {
  id?: number;
  name?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  point?: boolean;
  polygon?: Ponto[];
  properties?: PropriedadeTiled[] | Record<string, unknown>;
}

export interface CamadaTiled {
  id?: number;
  name: string;
  type: string;
  objects?: ObjetoTiled[];
}

export interface DocumentoTiled {
  properties?: PropriedadeTiled[] | Record<string, unknown>;
  width?: number;
  height?: number;
  tilewidth?: number;
  tileheight?: number;
  layers?: CamadaTiled[];
}

export interface OclusorMapa {
  nome: string;
  x: number;
  y: number;
  w: number;
  h: number;
  baseY: number;
  imagem: string;
  textura: string;
}

export function chaveTexturaOclusor(area: string, imagem: string, nome = ''): string {
  const nomeSeguro = (imagem || nome).toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `oclusor-${area}-${nomeSeguro}`;
}

export interface PontoMapa {
  x: number;
  y: number;
  w?: number;
  h?: number;
  propriedades: Record<string, unknown>;
}

export interface ObjetoVisualMapa {
  nome: string;
  tipo: string;
  poligono: Ponto[];
  propriedades: Record<string, unknown>;
}

export interface MapaInterpretado {
  largura: number;
  altura: number;
  caminhavel: Ponto[];
  obstaculos: ObstaculoPoligonal[];
  oclusores: OclusorMapa[];
  pontos: Map<string, PontoMapa>;
  objetos: ObjetoVisualMapa[];
  elipsePes: { raioX: number; raioY: number };
}

export function propriedadesComoObjeto(
  propriedades: ObjetoTiled['properties'],
): Record<string, unknown> {
  if (!Array.isArray(propriedades)) return propriedades ?? {};
  return Object.fromEntries(propriedades.map(({ name, value }) => [name, value]));
}

export function poligonoDoObjeto(objeto: ObjetoTiled): Ponto[] {
  const angulo = (objeto.rotation ?? 0) * Math.PI / 180;
  const cos = Math.cos(angulo);
  const sin = Math.sin(angulo);
  const relativo = objeto.polygon ?? (
    objeto.point ? [] : [
      { x: 0, y: 0 },
      { x: objeto.width ?? 0, y: 0 },
      { x: objeto.width ?? 0, y: objeto.height ?? 0 },
      { x: 0, y: objeto.height ?? 0 },
    ]
  );
  return relativo.map(({ x, y }) => ({
    x: objeto.x + x * cos - y * sin,
    y: objeto.y + x * sin + y * cos,
  }));
}

function obterCamada(documento: DocumentoTiled, nome: string): CamadaTiled | undefined {
  return documento.layers?.find((camada) => camada.type === 'objectgroup' && camada.name === nome);
}

export function lerMapaTiled(
  documento: DocumentoTiled,
  avisar: (mensagem: string) => void = console.warn,
  tamanho?: { largura: number; altura: number },
  area = 'mapa',
): MapaInterpretado {
  const camadaCaminhavel = obterCamada(documento, 'caminhavel');
  const objetosCaminhaveis = camadaCaminhavel?.objects ?? [];
  if (!camadaCaminhavel) avisar('[Mapa] Camada "caminhavel" ausente.');
  const objetoCaminhavel = objetosCaminhaveis.find((objeto) => (objeto.polygon?.length ?? 0) >= 3);
  if (!objetoCaminhavel) avisar('[Mapa] Polígono caminhável ausente ou inválido.');

  const camadaColisao = obterCamada(documento, 'colisao');
  const obstaculos = (camadaColisao?.objects ?? []).map((objeto) => ({
    pontos: poligonoDoObjeto(objeto),
    nome: objeto.name,
    propriedades: propriedadesComoObjeto(objeto.properties),
  })).filter((obstaculo) => obstaculo.pontos.length >= 3);
  if (!camadaColisao) avisar('[Mapa] Camada "colisao" ausente.');

  const camadaOclusores = obterCamada(documento, 'oclusores');
  const oclusores = (camadaOclusores?.objects ?? []).map((objeto) => {
    const propriedades = propriedadesComoObjeto(objeto.properties);
    const imagem = String(propriedades.imagem ?? '');
    if (!imagem) avisar(`[Mapa] O oclusor "${objeto.name ?? ''}" não informa uma imagem própria.`);
    else if (!imagem.startsWith('oclusores/') || imagem.includes('..') || imagem.includes('\\')) {
      avisar(`[Mapa] Caminho de imagem inválido no oclusor "${objeto.name ?? ''}"; será usado um placeholder.`);
    }
    return {
      nome: objeto.name ?? '',
      x: objeto.x,
      y: objeto.y,
      w: objeto.width ?? 0,
      h: objeto.height ?? 0,
      baseY: Number(propriedades.baseY ?? objeto.y + (objeto.height ?? 0)),
      imagem,
      textura: chaveTexturaOclusor(area, imagem, objeto.name ?? `objeto-${objeto.id ?? 0}`),
    };
  }).filter((oclusor) => oclusor.w > 0 && oclusor.h > 0 && Number.isFinite(oclusor.baseY));
  if (!camadaOclusores) avisar('[Mapa] Camada "oclusores" ausente.');

  const camadaPontos = obterCamada(documento, 'pontos');
  const pontos = new Map<string, PontoMapa>();
  (camadaPontos?.objects ?? []).forEach((objeto) => {
    if (!objeto.name) {
      avisar('[Mapa] Há um ponto sem nome na camada "pontos".');
      return;
    }
    pontos.set(objeto.name, {
      x: objeto.x,
      y: objeto.y,
      ...(objeto.width ? { w: objeto.width } : {}),
      ...(objeto.height ? { h: objeto.height } : {}),
      propriedades: propriedadesComoObjeto(objeto.properties),
    });
  });
  if (!camadaPontos) avisar('[Mapa] Camada "pontos" ausente.');

  const objetos = (obterCamada(documento, 'objetos')?.objects ?? []).map((objeto) => {
    const propriedades = propriedadesComoObjeto(objeto.properties);
    return {
      nome: objeto.name ?? '',
      tipo: String(propriedades.tipo ?? ''),
      poligono: poligonoDoObjeto(objeto),
      propriedades,
    };
  });
  const propriedadesMapa = propriedadesComoObjeto(documento.properties);

  return {
    largura: tamanho?.largura ?? (documento.width ?? 512) * (documento.tilewidth ?? 1),
    altura: tamanho?.altura ?? (documento.height ?? 768) * (documento.tileheight ?? 1),
    caminhavel: objetoCaminhavel ? poligonoDoObjeto(objetoCaminhavel) : [],
    obstaculos,
    oclusores,
    pontos,
    objetos,
    elipsePes: {
      raioX: Number(propriedadesMapa.raioPesX ?? 10),
      raioY: Number(propriedadesMapa.raioPesY ?? 5),
    },
  };
}
