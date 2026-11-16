# Tarefa 06 — Correções de interface, colisão e profundidade

Releia **AGENTS.md**, **docs/MAPAS.md** e **ASSETS.md**. Não reescreva o jogo: corrija o que está abaixo, em cima do código atual.

## 1. Escala única da interface (causa do celular e do retrato fora de tamanho)

Toda a interface em HTML/CSS tem que acompanhar a escala do canvas:

- Crie uma variável CSS `--px` = largura exibida do canvas ÷ 360, atualizada no resize. **Toda** medida de UI (posição, largura, altura, fonte, borda) é escrita em pixels lógicos × `var(--px)`, nunca em px fixos de tela, `vw` ou `%` soltos.
- A camada de UI é uma caixa do tamanho e na posição exatos do canvas (360x640 lógicos), por cima dele.
- Imagens de UI com `image-rendering: pixelated` e tamanho = tamanho do arquivo × escala inteira × `var(--px)`.

## 2. Caixa de diálogo com a moldura certa

Use `ui/dialogo/moldura.png` (360x120) como fundo, em escala 1 lógica (360x120 × `--px`), presa na base da tela (com `safe-area-inset-bottom`). Áreas da moldura, em pixels do arquivo:

| Área | x | y | Tamanho |
| --- | --- | --- | --- |
| Texto | 14 | 21 | 262 x 76 |
| Retrato (quadro azul) | 288 | 21 | 57 x 57 |
| Nome (caixa laranja) | 286 | 86 | 62 x 14 |

- **Retrato:** o quadro de 64x64 da folha de retratos, recortado no centro para 56x56 (tira 4 px de cada lado) e desenhado em escala 1 dentro do quadro azul, sem borda extra.
- **Nome:** dentro da caixa laranja, centralizado, fonte pixel em #FFBB61, tamanho que caiba (para "Júlia (pensando)", quebre em "Júlia" e mostre "(pensando)" em itálico dentro da área de texto, na primeira linha).
- **Texto:** branco, fonte pixel, com a máquina de escrever; quebra automática dentro da área. Se não couber, pagina.
- **Continuar:** tirar o botão "Continuar". Tocar em qualquer lugar da caixa avança; um triângulo pequeno #FFBB61 pisca no canto inferior direito da área de texto quando o texto terminou.
- **Opções de decisão:** ficam numa coluna logo acima da caixa, cada botão com largura da área de texto.

## 3. Celular e tablet no tamanho certo

- `ui/celular/moldura.png` (195x360) desenhado em **escala 1,5** (292x540 lógicos), centralizado na tela, com o mapa escurecido atrás (preto 50%).
- A área da tela do celular, em pixels do arquivo, é **x 23, y 48, 150 x 264** (em escala 1,5: x 34, y 72, 225 x 396 a partir do canto da moldura). Todo o conteúdo (nome do contato no topo, balões, respostas rápidas embaixo) fica **dentro** dessa área, com rolagem se precisar. As respostas rápidas também ficam dentro da tela, não por cima da moldura.
- O nome do contato fica numa barrinha #093F1A no topo da área da tela. Balões: recebido branco com borda #c9c9c9 à esquerda; enviado #35854e com texto branco à direita.
- Tablet (`ui/tablet/moldura.png`, 320x203): mesma regra, escala 1, centralizado; meça a área clara da tela no próprio arquivo e use só ela.

## 4. Colisão e profundidade com os novos `mapa.json`

Os 7 `mapa.json` foram refeitos (substitua os arquivos). Mudanças no formato:

- **Oclusores agora têm imagem própria.** Cada objeto da camada `oclusores` tem as propriedades `baseY` e `imagem` (ex.: `oclusores/mesa.png`), e os PNGs estão em `public/assets/mapas/<area>/oclusores/`. Desenhe cada um como sprite em `(x, y)` do objeto, com profundidade `baseY`. Não recorte mais do fundo em código. Isso faz o personagem passar **atrás** da mesa da recepção, das catracas, dos muros, das grades amarelas, da sala dos líderes, do carrinho, da estante etc.
- **Profundidade:** jogador, NPCs, figurantes, objetos e oclusores no mesmo container ordenado por `depth = y da base` a cada frame. O jogador usa o y dos pés.
- **Caminhável e colisão:** o pé do jogador é um ponto (centro da base do sprite em escala 2) mais uma elipse de 20x10. O jogador só pode ficar com os 5 pontos dentro do `caminhavel` e fora de todos os polígonos e retângulos de `colisao` (os retângulos do Tiled vêm com `x`, `y`, `width`, `height`; os polígonos com `polygon` relativo a `x, y`). Se o movimento for bloqueado, tente deslizar só no eixo x e depois só no eixo y.
- **Colisões com nome** continuam sumindo quando o ponto é liberado (`catraca-1..3`, `catraca-facial`). O oclusor de mesmo nome **continua** sendo desenhado (a catraca não some, só deixa passar).
- Com `?debug=1`, desenhe também o contorno de cada oclusor e a linha do `baseY`.

## 5. Ajustes vistos nos testes

- O personagem não pode aparecer em cima de móveis (cama, criado-mudo, mesa, catracas): é resolvido pelo item 4; confira em todos os mapas.
- A seta de caminho fica sobre o ponto, 40 px acima dele (acima da cabeça de quem está ali), não no chão.
- O balão "!" fica acima da cabeça do personagem/NPC (topo do sprite em escala 2), não no meio do corpo.
- Botão de áudio e controles respeitam `--px` (área de toque de 44 px lógicos).

## Critérios de aceite

- [ ] Em 360x640 e num celular real, celular, tablet e caixa de diálogo têm sempre a mesma proporção em relação ao mapa.
- [ ] O diálogo usa a moldura de faixas amarelas e pretas, com retrato de 56x56 no quadro azul e o nome na caixa laranja.
- [ ] Na recepção, o personagem passa atrás da mesa; na portaria, não atravessa as catracas antes de liberar e passa entre elas depois; no corredor-a, fica atrás da grade amarela.
- [ ] `npm run build` sem erros de TypeScript.
