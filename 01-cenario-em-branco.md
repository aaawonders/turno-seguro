# Tarefa 01 — Base do projeto + cenário em branco para testar movimentação

Leia **AGENTS.md**, **CONTEXTO.md** e **ASSETS.md** antes de começar. A estrutura de pastas e os assets já existem; não apague nem mova nada em `public/assets/` ou `arte-original/`.

## Objetivo

Criar a base do projeto (Vite + TypeScript + Phaser 4) e uma única cena de teste: um cenário vazio onde o personagem anda nas 4 direções, colide com obstáculos, é seguido pela câmera e interage com um NPC de teste. Deve funcionar no PC (teclado) e no celular em pé (joystick), para validar o "feeling" do controle antes de qualquer conteúdo.

## O que criar

1. **Configuração do projeto:** `package.json` (scripts `dev` com `--host`, `build`, `preview`), `vite.config.ts`, `tsconfig.json` (strict), `index.html` com viewport para celular (`width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`) e `.gitignore` (inclua `node_modules`, `dist` e `arte-original/`).

2. **Jogo Phaser** em `src/main.ts`: resolução lógica 360x640, `Scale.FIT` + `CENTER_BOTH`, `pixelArt: true`, `roundPixels: true`, fundo #093F1A, Arcade Physics sem gravidade. Canvas ocupando `100dvh`, sem rolagem.

3. **Cenas** em `src/scenes/`:
   - `Boot.ts`: carrega os assets do teste com fallback para placeholder (regra 3 do AGENTS.md) e segue para a cena de teste.
   - `TesteMovimento.ts`: a cena descrita abaixo.

4. **Cenário em branco** (`TesteMovimento.ts`):
   - Mapa de **512x768** desenhado em código: chão cinza-claro (#c9c9c9) com uma grade sutil de 32 px, para dar noção de deslocamento.
   - Bordas do mapa com colisão.
   - 4 obstáculos retangulares de tamanhos variados (cinza-escuro, contorno preto de 1 px) espalhados, com colisão, simulando bancadas e máquinas.
   - Uma faixa amarela de pedestre no chão (só visual, sem colisão).
   - Câmera seguindo o jogador com leve suavização, presa aos limites do mapa.

5. **Jogador** em `src/entities/Jogador.ts`:
   - Usa `public/assets/sprites/jogaveis/julia/caminhada.png` (spritesheet 192x192, quadros de 64x64, grade 3x3). Linhas: 0 = baixo, 1 = cima, 2 = direita; colunas: 0 = pé esquerdo, 1 = parado, 2 = pé direito. **Esquerda = linha da direita com `flipX`.**
   - Se o arquivo não existir: placeholder de 64x64 em código (corpo verde #35854e com um triângulo laranja #FFBB61 apontando para a direção atual), para dar para testar mesmo assim.
   - Animação de caminhada na ordem de colunas **0 → 1 → 2 → 1**, em loop a 8 fps; parado = coluna 1 da última direção.
   - Velocidade de ~90 px/s. Movimento livre em 8 direções com velocidade diagonal normalizada; a animação usa a direção dominante (o eixo com maior intensidade).
   - Hitbox só nos pés (cerca de 28x16 px, na base do quadro), para o personagem poder "passar na frente" dos objetos de forma natural.
   - Ordenação de profundidade pelo `y` (quem está mais embaixo é desenhado na frente).
   - Escolha do personagem via URL para o teste: `?personagem=lucas` usa a pasta do Lucas (padrão: julia).

6. **Entrada unificada** em `src/input/Controles.ts`:
   - Teclado: setas e WASD para mover; Espaço, E ou Enter para ação.
   - Toque (só aparece em dispositivos de toque): joystick nipplejs fixo no canto inferior esquerdo e botão de ação redondo no canto inferior direito, ambos em HTML por cima do canvas, com área de toque de pelo menos 64x64 px e respeitando `safe-area-inset-bottom`. Use `public/assets/ui/controles/*.png` se existirem; senão, CSS com a paleta.
   - Uma única interface para as cenas: `direcao(): { x, y }` (valores de -1 a 1) e `acaoPressionada(): boolean` (verdadeiro uma vez por toque).
   - Zona morta do joystick de ~15%.

7. **Interação de teste:**
   - Um NPC parado (placeholder 64x64 azul #1b78bf, ou `npcs/renata/chibi.png` se existir) num ponto do mapa, com colisão.
   - Ao chegar a menos de ~40 px, aparece um balão "!" sobre ele (`ui/controles/balao-interacao.png` ou um "!" desenhado).
   - Ao apertar ação perto dele, a cena emite o evento `dialogo:abrir` no barramento (`src/state/eventos.ts`). Uma caixa de diálogo **em HTML** (`src/ui/DialogoTeste.ts`) aparece no rodapé com o texto lido de `src/data/teste.json` ("Teste de interação: a caixa de diálogo abriu!"). Fundo #093F1A, borda #35854e, texto branco, nome "Renata" em laranja #FFBB61.
   - Enquanto a caixa estiver aberta, o jogador não se move. Ação ou toque na caixa fecha e emite `dialogo:fechar`.

8. **Ajustes de celular:**
   - Bloquear rolagem, zoom por gesto e o menu de toque longo sobre o jogo.
   - Em celular na horizontal, mostrar uma tela cheia com "Gire o celular para jogar" (sem pausar o carregamento).

9. **Modo debug:** com `?debug=1` na URL, mostrar as caixas de colisão (Arcade debug), o FPS e a direção do joystick no canto superior.

## Fora do escopo desta tarefa

Menu, seleção de personagem, mapas reais, Tiled, áudio, save, diálogos de verdade e minigame. Não crie nada disso ainda; a estrutura só precisa deixar espaço para eles.

## Critérios de aceite

- [ ] `npm install && npm run dev` abre o jogo no navegador sem erros no console (avisos de asset ausente são esperados).
- [ ] No PC, o personagem anda com setas/WASD, colide com bordas e obstáculos e a animação troca de direção corretamente, inclusive a esquerda espelhada.
- [ ] Abrindo `http://<ip-do-pc>:5173` no celular, o joystick e o botão de ação aparecem, o movimento é fluido e a página não rola nem dá zoom.
- [ ] O balão "!" aparece perto do NPC e a caixa de diálogo HTML abre e fecha pelo botão de ação.
- [ ] Pixel art nítido em qualquer tamanho de tela, sem borrar.
- [ ] `?debug=1` mostra as colisões e o FPS; `?personagem=lucas` troca o sprite.
- [ ] `npm run build` termina sem erros de TypeScript.

## Ao terminar

Liste os arquivos criados e diga quais assets foram encontrados e quais caíram em placeholder.
