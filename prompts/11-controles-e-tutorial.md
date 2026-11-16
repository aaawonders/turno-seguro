# Tarefa 11 — Controles novos e mini tutorial

Releia **AGENTS.md** e use a escala `--px` da tarefa 06.

## 1. Controles com a arte nova

Os arquivos de `public/assets/ui/controles/` foram trocados:

- `joystick-base.png` (64x64): base verde com 4 setas laranja. Desenhe em **escala 1,5** (96 px lógicos), opacidade 0,85; com o dedo solto, opacidade 0,5.
- `joystick-alavanca.png` (32x32): alavanca branca. Escala 1,5, centralizada na base; acompanha o dedo até 30 px lógicos do centro e volta ao centro com uma animação de 80 ms ao soltar.
- `botao-acao.png` (64x32, **2 quadros**): quadro 0 normal, quadro 1 pressionado. Escala 2 (64 px lógicos). Troca para o quadro 1 enquanto o dedo está em cima. Tire o texto "Ação" de baixo do botão.
- **Destaque do botão:** quando há um ponto de interação ao alcance (balão "!" visível), o botão pulsa (escala 1 → 1,08 → 1, a cada 0,8 s). Sem nada ao alcance, fica com opacidade 0,6.
- Posições: joystick com o centro a 72 px da esquerda e 96 px da base; botão com o centro a 64 px da direita e 96 px da base (respeitando `safe-area-inset`).
- Joystick **flutuante:** um toque em qualquer ponto da metade esquerda da tela (fora de botões e da caixa de diálogo) move a base para onde o dedo tocou; ao soltar, ela volta à posição padrão.
- No PC (sem tela de toque), esconda o joystick e o botão e mostre no canto inferior uma legenda pequena: "Setas/WASD andar · Espaço/E interagir".

## 2. Mini tutorial (só na primeira vez que o jogador começa um jogo novo)

No Cap. 1, logo depois do primeiro pensamento ("5h30…"), em sequência:

1. **Andar:** escurece a tela (preto 60%) menos um círculo em volta do joystick. Uma mão pixel (desenhada em código, branca com contorno #093F1A) arrasta a alavanca em loop. Balão de dica acima: **"Arraste aqui para andar"** (no PC: **"Use as setas ou WASD para andar"**). Some quando o jogador andar 40 px.
2. **Seta e objetivo:** a faixa de objetivo pisca e um balão aponta para ela: **"Seu objetivo fica aqui em cima. Siga a seta laranja!"** e um segundo balão perto da seta. Some após 3 s ou um toque.
3. **Interagir:** quando o jogador chega perto do guarda-roupa e o "!" aparece, escurece tudo menos o botão de ação e o personagem. Balão: **"Quando aparecer o !, toque aqui para interagir"** (no PC: **"Aperte Espaço ou E para interagir"**). Some quando ele interagir.

Regras:
- Balões de dica: fundo #093F1A, borda 2 px #FFBB61, texto branco (fonte da tarefa 09), seta pequena apontando para o alvo, aparece com um "pop" curto.
- Enquanto um passo do tutorial está ativo, só o controle destacado responde.
- Um link "Pular tutorial" pequeno no canto superior esquerdo da área escura.
- Ao terminar ou pular, salve `tutorialVisto: true` e não mostre mais (nem no Continuar, nem em Jogar de novo). `?tutorial=1` força o tutorial para teste.

## Critérios de aceite

- [ ] Joystick e botão com a arte nova, no tamanho certo, com estado pressionado e destaque quando há interação.
- [ ] Tutorial de 3 passos no primeiro jogo, no celular e no PC, sem travar se o jogador fizer outra coisa.
- [ ] "Pular tutorial" funciona e o tutorial não volta depois de visto.
- [ ] `npm run build` sem erros de TypeScript.
