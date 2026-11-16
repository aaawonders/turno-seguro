# Missão Turno Seguro — SIPAT 2026

Base jogável em TypeScript, Vite e Phaser 4. A cena atual usa uma sala isométrica de teste para validar movimento, colisões por polígonos, profundidade e oclusão.

## Executar

```sh
npm install
npm run dev
```

O servidor de desenvolvimento escuta na rede local. Para testar o sprite alternativo, abra a página com `?personagem=lucas`. Para exibir colisões, pontos e oclusores, use `?debug=1`. A URL `?mapa=portaria` carrega uma área real quando seus arquivos `fundo.png` e `mapa.json` existem; caso contrário, abre o cenário de teste.

Controles: setas ou WASD para andar; Espaço, E, Enter ou o botão de toque para interagir com Renata.

```sh
npm run build
npm run preview
npm run verify
```

O mapa de teste usa o formato JSON do Tiled em `src/data/mapas/teste.json`. Em mapas reais, exporte as camadas de objetos `caminhavel`, `colisao`, `oclusores` e `pontos`. Cada oclusor precisa da propriedade numérica `baseY`; pontos como `chegada` e `npc-teste` são localizados pelo nome do objeto.

O build final fica em `dist/` para publicação estática no Vercel. Consulte [AGENTS.md](AGENTS.md), [CONTEXTO.md](CONTEXTO.md) e [ASSETS.md](ASSETS.md) antes de ampliar o jogo.

## Onde colocar cada coisa

| O quê | Onde |
| --- | --- |
| Imagem bruta do ChatGPT (fundo magenta, 1024 px) | `arte-original/` na pasta correspondente |
| Foto da fábrica | `arte-original/fotos-fabrica/` |
| Imagem tratada (transparente, tamanho final, nome da tabela) | `public/assets/` — ver **ASSETS.md** |
| Música e efeitos | `public/assets/audio/` + registro em **CREDITOS.md** |

## Arquivos de referência

- **ASSETS.md**: nome, tamanho e grade de cada arquivo que o jogo espera.
- **CONTEXTO.md**: stack, estrutura e identidade visual, para o Codex ler antes de gerar código.
- **CREDITOS.md**: origem e licença de assets de terceiros.

As pastas vazias têm um arquivo `.gitkeep` só para existirem no Git. Pode apagar quando colocar arquivos nelas.

## Editor de mapas (tarefa 03)

1. Rode `npm run dev` e abra `/?editor=1` para escolher uma das sete áreas, ou `/?editor=1&mapa=quarto`.
2. Use **C** para delimitar o caminhável; clique nos vértices e feche com Enter ou no primeiro vértice. Use **O** para obstáculos (Shift + arrastar cria retângulo).
3. Use **U**, arraste o recorte de um objeto alto e clique na altura dos pés da base. Evite incluir piso em recortes de objetos embutidos na parede.
4. Escolha os nomes dos pontos na lateral e clique para posicionar. **V** seleciona e move pontos, polígonos ou vértices; Delete apaga. Edite raio, baseY e propriedades na lateral.
5. Use a roda para zoom inteiro de 1 a 4, Espaço + arrastar ou botão do meio para pan, Ctrl+Z / Ctrl+Shift+Z para desfazer/refazer. A grade é opcional.
6. **Testar** coloca o jogador em `chegada` com as colisões e oclusores atuais; Esc retorna. A chegada precisa estar livre para os pés do jogador.
7. **Salvar no projeto** (apenas em desenvolvimento) grava `public/assets/mapas/<area>/mapa.json`. **Exportar** baixa o mesmo arquivo para colocação manual nessa pasta.

O editor salva rascunhos por área no localStorage e avisa quando restaura um mais recente que o arquivo. **Reabrir arquivo** descarta o rascunho. Avisos sobre pontos ausentes ou fora do caminhável não impedem salvar. Sem `editor=1`, o jogo continua abrindo normalmente; `?mapa=quarto` usa a marcação salva. O build estático não contém o endpoint de gravação.

## Mapas marcados (tarefa 05)

Abra `/?mapa=portaria&debug=1` (troque `portaria` por qualquer uma das sete áreas). O cenário de teste continua em `?mapa=teste`; o editor permanece em `?editor=1`.

A cena `Mapa` lê os arquivos reais, considera os raios individuais, dispara pensamentos uma vez e troca de área ao alcançar uma saída desbloqueada. Na portaria, fale com o speaker e avance as três falas do Sr. Antônio: as colisões `catraca-1`, `catraca-2` e `catraca-3` são removidas juntas. Na recepção, interaja com `catraca-facial` para remover a barreira. Os gatilhos implementados estão em `src/data/fluxo-mapas.json`.

A integração para o roteiro é o evento `roteiro:passo`, com `{ tipo: 'liberar', ponto: '<nome>' }`: desbloqueia o ponto e remove suas colisões pelo nome exato ou prefixo `<nome>-`. Os eventos `mapa:interagir`, `mapa:pensamento` e `mapa:saida` informam `{ area, ponto }` ao restante do jogo. A saída do `corredor-b` leva diretamente ao `posto` depois de receber a liberação do D11. As decisões D1–D11 e o roteiro completo continuam pertencendo à tarefa 04; os bloqueios dependentes dessas decisões são preservados.

`npm run verify` também percorre os sete mapas em uma malha de 2 px com a mesma geometria de pés do jogo, verificando chegadas e alcance dos pontos. A elipse padrão tem 20×10 px (raios 10 e 5). Não foi necessário alterar coordenadas dos mapas. Imagens estáticas de conferência, com pontos e caminhável sobrepostos, ficam em `artifacts/conferencia-mapas/`.
