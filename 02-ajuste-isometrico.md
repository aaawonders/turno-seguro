# Tarefa 02 — Ajustar a base para cenários isométricos 2.5D

Releia **AGENTS.md** e **CONTEXTO.md**: a direção de arte mudou de top-down para **isométrico 2:1 (2.5D)**, com cada mapa sendo uma imagem pré-desenhada. A tarefa 01 já foi feita; **analise o código existente primeiro e refatore**, mantendo o que continua valendo (configuração do projeto, entrada unificada, joystick, jogador e animação, barramento de eventos, caixa de diálogo de teste, modo debug, ajustes de celular). Não reescreva do zero.

## Objetivo

Trocar o cenário em branco top-down por um cenário isométrico de teste e criar a infraestrutura que os mapas reais vão usar: colisão por polígonos, ordenação de profundidade, oclusores e leitura de mapas no formato do Tiled.

## O que fazer

1. **Remover a colisão de cenário por Arcade.** Paredes e obstáculos deixam de ser corpos retangulares. O Arcade Physics pode continuar só para sobreposições de gatilho, se for útil; o movimento do jogador passa a ser validado pelo novo sistema de colisão.

2. **Sistema de colisão por polígonos** em `src/systems/Colisao.ts`:
   - Recebe um polígono `caminhavel` e uma lista de obstáculos (polígonos ou retângulos).
   - O jogador é testado por um ponto nos pés (centro da base do quadro) e por mais 4 pontos em volta dele, numa elipse de ~10x5 px, para não "encostar" com o meio do corpo.
   - Uma posição é válida se todos os pontos estão dentro de `caminhavel` e fora de todos os obstáculos.
   - **Deslizamento:** se o movimento completo for inválido, tentar só o eixo X e depois só o eixo Y, para o personagem escorregar ao longo das bordas diagonais em vez de travar.
   - Funções puras e testáveis (sem dependência de cena).

3. **Leitor de mapas do Tiled** em `src/systems/MapaTiled.ts`:
   - Lê um JSON exportado do Tiled com as camadas de objetos `caminhavel`, `colisao`, `oclusores` e `pontos` (formato descrito em CONTEXTO.md).
   - Converte objetos `polygon` (pontos relativos a `x,y`) e retângulos (`x, y, width, height`) para polígonos em coordenadas do mapa.
   - Devolve `{ caminhavel, obstaculos, oclusores: [{ x, y, w, h, baseY }], pontos: Map<nome, {x, y, w?, h?, propriedades}> }`.
   - Camadas ausentes não quebram o carregamento (avisos no console).

4. **Profundidade e oclusores** em `src/systems/Profundidade.ts`:
   - Todo objeto de mundo (jogador, NPCs, objetos) recebe `depth = y da base` a cada quadro.
   - Para cada oclusor: criar uma imagem recortada do próprio `fundo.png` (o retângulo `x, y, w, h`), posicionada no mesmo lugar, com `depth = baseY`. Assim, quando os pés do jogador estão acima de `baseY` (atrás do móvel), o recorte é desenhado por cima dele.

5. **Cenário isométrico de teste** (substitui o conteúdo de `TesteMovimento.ts`):
   - Fundo #0d1a12. Desenhado em código, num mapa de 512x768: um piso em losango de tiles isométricos 64x32 (cinza-claro, linhas da grade sutis) e duas paredes de fundo (esquerda e direita), em cinza mais escuro.
   - 3 "caixas" isométricas desenhadas em código (topo + duas faces laterais, contorno escuro), de tamanhos diferentes, simulando bancadas e máquinas. Cada caixa é um objeto separado com profundidade pela base, para o jogador poder passar na frente e atrás delas.
   - Os dados de colisão, oclusão e pontos desse cenário ficam em `src/data/mapas/teste.json`, **no mesmo formato do Tiled**, e são carregados pelo `MapaTiled.ts` (é o teste do leitor). O polígono `caminhavel` segue o losango do piso; cada caixa tem um polígono de colisão na base (o losango inferior dela).
   - NPC de teste e balão "!" continuam, agora posicionados pelo ponto `npc-teste` do JSON; a chegada do jogador vem do ponto `chegada`.
   - Câmera seguindo o jogador, presa aos limites do mapa.

6. **Movimento:** continua alinhado à tela (8 direções, diagonal normalizada, animação pela direção dominante), com as folhas atuais. Não é preciso trocar os sprites.

7. **Modo debug (`?debug=1`):** desenhar o polígono `caminhavel` (verde), os obstáculos (vermelho), os oclusores (contorno amarelo com a linha do `baseY`), os pontos (círculos com o nome) e os pontos de teste dos pés do jogador.

8. **Preparar o carregamento de mapas reais:** a cena deve aceitar, via URL `?mapa=<area>`, carregar `public/assets/mapas/<area>/fundo.png` + `mapa.json` em vez do cenário de teste. Se os arquivos não existirem, cair no cenário de teste com aviso.

## Fora do escopo

Menu, seleção de personagem, diálogos reais, inspeção, áudio, save. Não crie os mapas reais (as imagens ainda estão sendo geradas).

## Critérios de aceite

- [ ] O personagem anda pelo losango do piso e não sai dele; nas bordas diagonais, escorrega em vez de travar.
- [ ] O personagem passa atrás e na frente das caixas, com a sobreposição correta.
- [ ] Teclado e joystick continuam funcionando como na tarefa 01; balão "!" e caixa de diálogo do NPC de teste também.
- [ ] `?debug=1` mostra polígonos, oclusores, pontos e os pontos de teste dos pés.
- [ ] `src/data/mapas/teste.json` abre no Tiled sem erro (formato válido de camadas de objetos).
- [ ] `?mapa=portaria` sem os arquivos cai no cenário de teste com aviso no console.
- [ ] `npm run build` sem erros de TypeScript.

## Ao terminar

Liste o que foi refatorado, o que foi removido e os arquivos novos. Explique em poucas linhas como marcar um mapa real no Tiled para funcionar com o leitor (nomes das camadas, propriedade `baseY` e nomes dos pontos).
