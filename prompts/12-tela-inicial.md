# Tarefa 12 — Fundo da tela inicial e logo da Nidec

Releia **AGENTS.md** e use a escala `--px` da tarefa 06. Mexa só na tela inicial (e na de seleção, item 3).

## 1. Camadas da tela inicial (de trás para a frente)

1. **Fundo:** `ui/tela-inicial/fundo.png` (360x640, galpão em pixel art), em escala 1, ocupando a tela inteira, `image-rendering: pixelated`. Movimento lento de "respiração": sobe e desce 2 px em 6 s (parallax leve), para dar vida.
2. **Padrão de ícones na frente do fundo:** `ui/tela-inicial/padrao-icones.png` repetido, pintado em #35854e com **opacidade 0,10**, rolando devagar na diagonal (8 px por segundo). Escala 1. Ele fica por cima do fundo e por baixo do logo e dos botões.
3. **Vinheta:** gradiente radial de transparente no centro para #0d1a12 a 55% nas bordas, e uma faixa escura (#0d1a12 a 70%) atrás dos botões, para o texto continuar legível.
4. Logo do jogo, subtítulo e botões, como já estão.
5. **Logo da Nidec** no rodapé (item 2).

As lâmpadas do fundo (em x 60 e x 295, y 75 aproximadamente) podem ter um brilho pulsando de leve (círculo amarelo-claro com opacidade 0,15 a 0,3, 3 s).

## 2. Logo da Nidec

- Arquivo oficial: `ui/tela-inicial/logo-nidec.svg` (use o SVG; o PNG de 240 px é só reserva).
- **Não pixelizar, não recolorir, não distorcer, não aplicar contorno nem sombra** (é o logo oficial da marca): `image-rendering: auto`, proporção original.
- No **canto inferior esquerdo**, no lugar do texto "Nidec": **largura de 80 px lógicos**, 16 px da borda esquerda e 16 px acima da borda inferior (mais `safe-area-inset-left` e `safe-area-inset-bottom`). Espaço livre em volta de pelo menos 10 px.
- O link "Créditos" continua no canto inferior direito, alinhado pela base com o logo, em fonte pequena.

## 3. Tela de seleção de personagem

Use o mesmo `fundo.png` com a vinheta mais forte (#0d1a12 a 70%) e sem o padrão de ícones, para os dois personagens aparecerem bem.

## Critérios de aceite

- [ ] Fundo do galpão com o padrão de ícones bem sutil por cima, rolando, sem atrapalhar a leitura.
- [ ] Logo oficial da Nidec nítido, nas cores originais, no canto inferior esquerdo.
- [ ] Em 360x640 e no celular real, nada cortado nem esticado.
- [ ] `npm run build` sem erros de TypeScript.
