# AGENTS.md — Missão Turno Seguro

Instruções permanentes para agentes de código neste repositório. Leia também **CONTEXTO.md** (visão do jogo, paleta), **ASSETS.md** (nomes, tamanhos e grades de cada arquivo), **docs/ROTEIRO.md** (falas e decisões) e **docs/MAPAS.md** (pontos de cada mapa) antes de qualquer tarefa.

## Projeto

Jogo web em pixel art 16-bit para a SIPAT 2026 da Nidec: visual novel com movimentação mínima em cenários isométricos 2.5D, jogado principalmente no **celular em pé**. Publicado como site estático no Vercel.

## Stack obrigatória

- **TypeScript** (strict) + **Vite** + **Phaser 4** (`phaser@^4`), com Arcade Physics.
- Interface de texto (diálogo, menus, quiz, calendário, resultado) em **HTML/CSS por cima do canvas**, nunca desenhada no Phaser.
- **nipplejs** para o joystick virtual em telas de toque.
- Sem frameworks de UI e sem backend, a não ser que a tarefa peça.
- O pacote `phaser` traz uma pasta `skills/` com documentação para agentes de IA: consulte essa pasta em `node_modules/phaser/skills/` antes de usar APIs do Phaser 4, porque várias mudaram em relação ao Phaser 3.

## Estrutura

```
public/assets/   assets FINAIS (ver ASSETS.md) — o jogo só carrega daqui
arte-original/   arte bruta e fotos — NUNCA importar, copiar para public/ ou commitar em build
src/scenes/      cenas do Phaser
src/entities/    jogador, NPCs e objetos interativos
src/input/       teclado + joystick unificados
src/systems/     colisão por polígonos, profundidade, oclusores, leitura de mapas do Tiled
src/ui/          componentes HTML/CSS da interface
src/state/       estado do jogo, save (localStorage) e barramento de eventos
src/data/        conteúdo em JSON (falas, decisões, inspeção, SIPAT)
docs/            ROTEIRO.md e MAPAS.md — fonte do conteúdo; não editar sem pedido
```

## Regras

1. **Pixel art nítido:** `pixelArt: true`, `roundPixels: true`, CSS `image-rendering: pixelated`. Nunca suavizar imagens.
2. **Resolução lógica 360x640** (retrato), escalada com `Phaser.Scale.FIT` e centralizada. Personagem no mapa = quadro de 64x64 desenhado em **escala 2** (128x128, nearest), igual para NPCs e figurantes.
   **Cenários isométricos 2.5D:** cada mapa é UMA imagem pré-desenhada em perspectiva isométrica 2:1 (`mapas/<area>/fundo.png`, tamanho variável: use sempre o tamanho natural da imagem, nunca um valor fixo). O personagem se move livre, alinhado à tela (8 direções, animação nas 4 da folha). A colisão NÃO usa corpos retangulares do Arcade para o cenário: usa o sistema de polígonos de `src/systems/` (área caminhável + obstáculos), lido do JSON do Tiled. Profundidade sempre pelo `y` da base (pés do personagem, base dos objetos). Objetos altos que o personagem pode contornar por trás são "oclusores": recortes do próprio fundo desenhados por cima, com profundidade pela base. **Escala:** os fundos têm tamanho variável e foram redimensionados para que uma pessoa de 1,75 m tenha ~116 px de altura no mapa. Por isso, jogáveis, NPCs e figurantes são desenhados com **escala 2** (quadro de 64x64 vira 128x128, nearest). Objetos sobrepostos usam a escala definida em `src/data/objetos.json` (padrão: riscos 1, poça/cone/fita 2), ajustável por objeto. Todas as coordenadas de `mapa.json` são em pixels do fundo, no tamanho natural.
3. **Assets ausentes não quebram o jogo:** se um arquivo do ASSETS.md ainda não existir, use um placeholder gerado em código (retângulo da cor certa, com o mesmo tamanho) e registre um aviso no console.
4. **Conteúdo fora do código:** textos, falas e números de jogo ficam em `src/data/*.json`. Não escreva falas dentro de `.ts`.
5. **Comunicação Phaser ↔ interface** só pelo barramento de eventos de `src/state/`. Cenas não manipulam o DOM diretamente.
6. **Entrada unificada:** toda leitura de direção e de ação passa por `src/input/`, para teclado e joystick se comportarem igual.
7. **Celular primeiro:** sem rolagem nem zoom da página, respeitar `safe-area-inset`, botões com pelo menos 44x44 px de área de toque.
8. **Áudio** só depois do primeiro toque ou tecla do usuário.
9. **Paleta da interface:** verde #093F1A, verde #35854e, laranja #FFBB61, branco, cinza #c9c9c9, azul #1b78bf, vermelho #c22121 (detalhes em CONTEXTO.md). Fonte pixel com acentos em `public/assets/fontes/`.
10. **Código e comentários em português**, nomes de arquivos e pastas sem acento.
11. **Nomes de pontos dos mapas** seguem exatamente docs/MAPAS.md. Se um `mapa.json` ainda não existir ou faltar um ponto, use o fallback descrito na tarefa e avise no console, sem travar o jogo.
12. Antes de terminar uma tarefa: `npm run build` sem erros de TypeScript.

## Comandos

- `npm install`
- `npm run dev` — servidor local (com `--host`, para testar no celular pela rede)
- `npm run build` — gera `dist/` para o Vercel
- `npm run preview` — serve o build localmente
