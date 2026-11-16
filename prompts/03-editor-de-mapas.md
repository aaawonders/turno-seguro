# Tarefa 03 — Editor de marcação dos mapas (`?editor=1`)

Releia **AGENTS.md**, **CONTEXTO.md**, **ASSETS.md** e **docs/MAPAS.md**. As tarefas 01 e 02 já foram feitas: analise o código existente e reaproveite `src/systems/MapaTiled.ts`, `Colisao.ts` e `Profundidade.ts`.

## Ajuste de escala (fazer primeiro)

Os fundos foram refeitos com tamanho variável: uma pessoa de 1,75 m tem ~116 px no mapa. Ajuste o que já existe:

- Jogador, NPCs e figurantes desenhados com escala 2 (64x64 → 128x128, nearest). A animação, o espelhamento e o ponto dos pés continuam iguais, só que em escala 2 (pés no centro da base do quadro escalado).
- Os pontos de teste dos pés passam a formar uma elipse de ~20x10 px.
- Nada pode supor mapa de 512x768: largura e altura vêm do `fundo.png` carregado. Se o mapa for menor que a tela lógica (360x640) em alguma direção, centralize-o e preencha o resto com #0d1a12; a câmera só segue o jogador no eixo em que o mapa é maior que a tela.
- O mapa de teste da tarefa 02 continua funcionando.

## Contexto

Os 7 fundos isométricos já estão em `public/assets/mapas/<area>/fundo.png` (quarto, portaria, recepcao, vestiario, corredor-a, corredor-b, posto). Falta marcar em cada um a área caminhável, as colisões, os oclusores e os pontos. Em vez de depender só do Tiled, o jogo vai ter um editor próprio, usado no PC, que salva o `mapa.json` no mesmo formato que o `MapaTiled.ts` já lê.

## O que fazer

1. **Lista de pontos por mapa** em `src/data/mapas/pontos.json`: para cada área, a lista de nomes de pontos de docs/MAPAS.md, com o tipo (`chegada`, `npc`, `interacao`, `pensamento`, `saida`, `objeto`, `toque`) e as propriedades padrão (`cone-1` e `cone-2` com `certo: true`; `catraca`, `catraca-fabrica` e a `saida` do corredor-b com `bloqueado: true`).

2. **Cena `Editor`** aberta com `?editor=1&mapa=<area>` (sem `mapa`, mostrar a lista das 7 áreas para escolher). Ela carrega o `fundo.png` e o `mapa.json` existente, se houver.

3. **Ferramentas** (barra em HTML/CSS por cima do canvas, com atalhos de teclado):
   - **Caminhável (C):** cliques adicionam vértices do polígono único `caminhavel`; Enter ou clique no primeiro vértice fecha. Refazer substitui o anterior.
   - **Colisão (O):** mesmo esquema, cria quantos polígonos quiser. Shift + arrastar cria um retângulo.
   - **Oclusor (U):** arrastar cria um retângulo; depois, clicar define o `baseY` (linha horizontal amarela). Mostrar o recorte do fundo destacado.
   - **Ponto (P):** escolher o nome numa lista lateral, que mostra os pontos daquela área ainda não marcados e os já marcados (riscados); clicar no mapa posiciona. Arrastar move. Campo para ajustar `raio` e editar propriedades.
   - **Selecionar/mover (V):** clicar num vértice, retângulo ou ponto para mover; Delete apaga; arrastar o meio de um polígono move ele inteiro.
   - **Desfazer/refazer:** Ctrl+Z e Ctrl+Shift+Z.
   - **Zoom e pan:** roda do mouse com zoom no cursor (1x a 4x, em passos inteiros, mantendo o pixel nítido); espaço + arrastar ou botão do meio faz pan. Coordenadas sempre em pixels inteiros do fundo, no tamanho natural da imagem (cada mapa tem um tamanho diferente).
   - **Grade:** opcional, mostra a posição do cursor em px.

4. **Visualização:** mesmas cores do modo debug (caminhável verde translúcido, colisão vermelha, oclusor amarelo com a linha do `baseY`, pontos em círculos com o nome e o raio). Um botão **Testar** coloca o jogador no ponto `chegada` com a marcação atual, sem salvar, para andar e conferir colisão e profundidade; Esc volta ao editor.

5. **Salvar:**
   - **Exportar** baixa `mapa.json` no formato de camadas de objetos do Tiled (o mesmo de `src/data/mapas/teste.json`), pronto para colocar em `public/assets/mapas/<area>/`.
   - Durante o `npm run dev`, um botão **Salvar no projeto** grava direto em `public/assets/mapas/<area>/mapa.json` por um pequeno plugin de servidor do Vite (rota POST só no modo dev, que só aceita esses 7 caminhos). No build de produção, o botão não aparece.
   - Rascunho automático no localStorage a cada alteração, por área, com aviso ao abrir se existir rascunho mais novo que o arquivo.
   - Validação ao salvar: avisar (sem bloquear) se faltar `caminhavel`, se faltar algum ponto da lista da área ou se um ponto estiver fora do caminhável (menos os tipos `objeto` e `toque`).

6. **O editor não entra no jogo normal:** só abre com `?editor=1` e não aparece no menu.

## Fora do escopo

Conteúdo do jogo, diálogos e capítulos (tarefa 04).

## Critérios de aceite

- [ ] Consigo marcar as 4 camadas de um mapa, salvar e, ao reabrir, a marcação volta igual.
- [ ] O JSON salvo é lido pelo `MapaTiled.ts` e abre no Tiled sem erro.
- [ ] O botão Testar mostra o jogador andando com a colisão e a profundidade da marcação atual.
- [ ] `?mapa=<area>` (sem editor) carrega o mapa marcado com colisão real.
- [ ] Desfazer, zoom, pan e rascunho funcionam.
- [ ] `npm run build` sem erros de TypeScript, e o build não inclui a rota de salvar.

## Ao terminar

Explique em poucos passos como marcar um mapa do zero no editor e onde o arquivo fica salvo.
