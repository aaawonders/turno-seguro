# Contexto do projeto — Missão Turno Seguro

Jogo web para a SIPAT 2026 da Nidec (Indaiatuba, 16 a 19 de novembro): pixel art 16-bit, visual novel com movimentação mínima em cenários isométricos 2.5D. Duração-alvo: 15 a 30 min. Jogado principalmente no celular em pé.

## História

O Jonas se machucou ontem e o jogador (Júlia ou Lucas, escolhidos no início) assume o posto dele no primeiro dia. Roteiro completo, com todas as falas e decisões: **docs/ROTEIRO.md** (leia primeiro a seção "Ajustes finais"). Pontos de cada mapa: **docs/MAPAS.md**.

| Cap. | Mapa(s) | Resumo |
| --- | --- | --- |
| 1 | `quarto` | Acorda de pijama, troca de roupa, pega crachá e celular, mensagem da Renata |
| 2 | `portaria`, `recepcao` | Fala com o Sr. Antônio pelo speaker, passa a catraca; atravessa a recepção pela catraca facial |
| 3 | `vestiario` | Guarda a mochila no vestiário; EPIs com o Marcos (D1 a D3) |
| 4 | `corredor-a`, `corredor-b` | Diego (CIPA) apresenta a SIPAT e o calendário no quadro; Renata, isolamento (D4), Caio (D5 a D9), CAT (D10), vazamento (D11) |
| 5 | `posto` | Inspeção de início de turno: marcar riscos |
| 6 | `posto` | Relato ao Diego |
| 7 | `posto` | Liga a máquina, mensagem do Jonas, tela de resultado |

As decisões não mostram certo ou errado na hora: tudo é somado e explicado na tela de resultado (máximo 145 pontos). Entre os mapas, o protagonista "pensa alto". O foco da SIPAT deste ano é saúde mental.

## Stack

- **TypeScript + Vite + Phaser 4** para o mundo do jogo: mapa, personagem, câmera, NPCs, inspeção.
- **HTML/CSS por cima do canvas** para a interface de texto: caixa de diálogo, decisões, calendário, menus, tela de resultado. Phaser e interface conversam por um barramento de eventos.
- **nipplejs** para o joystick virtual no celular; teclado no PC (setas/WASD + Espaço).
- **Tiled** para marcar cada mapa sobre a imagem: área caminhável, obstáculos, oclusores e pontos de interação, exportados como `public/assets/mapas/<area>/mapa.json`.
- Conteúdo (falas, decisões, cronograma da SIPAT, itens da inspeção) em JSON dentro de `src/data/`.
- Estado (capítulo, personagem, decisões, áudio) em `src/state/`, salvo em localStorage.
- Deploy estático no Vercel (`vite build`). Sem backend.

## Tela e renderização

- Celular na vertical: resolução lógica **360x640**, escalada para caber na tela.
- Pixel art nítido: `pixelArt: true` no Phaser e `image-rendering: pixelated` no CSS.
- Personagem: quadro de 64x64 desenhado em escala 2 (128x128 no mundo). Mapas: imagem única isométrica de tamanho variável (de ~450 a ~840 px de largura), câmera seguindo o jogador; se o mapa for menor que a tela, ele fica centralizado.
- **Escala:** os fundos têm tamanho variável e foram redimensionados para que uma pessoa de 1,75 m tenha ~116 px de altura no mapa. Por isso, jogáveis, NPCs e figurantes são desenhados com **escala 2** (quadro de 64x64 vira 128x128, nearest). Objetos sobrepostos usam a escala definida em `src/data/objetos.json` (padrão: riscos 1, poça/cone/fita 2), ajustável por objeto.
- O áudio só começa depois do primeiro toque do usuário.

## Cenários isométricos (2.5D)

- Perspectiva isométrica 2:1: piso em losango, duas paredes de fundo visíveis, frente aberta, área de fora em #0d1a12.
- O personagem anda alinhado à tela (cima, baixo, lados e diagonais); a folha de caminhada tem baixo, cima e direita (a esquerda é espelhada).
- Colisão por polígonos: um polígono de área caminhável (o losango do piso) e polígonos ou retângulos na base de cada móvel ou máquina. Teste feito com o ponto dos pés do personagem, com deslizamento ao longo das bordas.
- Profundidade pelo `y` da base. Móveis altos que o personagem contorna viram oclusores: recortes do fundo desenhados por cima quando o personagem está atrás deles.

### Formato no Tiled (camadas de objetos do `mapa.json`)

| Camada | Tipo de objeto | Uso |
| --- | --- | --- |
| `caminhavel` | 1 polígono | Onde o personagem pode andar |
| `colisao` | polígonos ou retângulos | Bases sólidas de móveis e máquinas |
| `oclusores` | retângulos, com propriedade `baseY` | Recorte do fundo desenhado por cima do personagem quando ele está atrás (y dos pés < `baseY`) |
| `pontos` | pontos ou retângulos com `name` | Chegada, NPCs, portas, itens de interação, riscos da inspeção |

## Estrutura

```
public/assets/   arte e áudio FINAIS (transparentes, tamanho nativo) — ver ASSETS.md
arte-original/   saídas brutas do ChatGPT e fotos — NÃO é carregado pelo jogo
src/scenes/      Boot, Menu, Selecao, Mapa (uma cena que carrega cada área), Inspecao, Resultado, Editor
src/entities/    jogador, NPCs, objetos interativos
src/input/       teclado + joystick unificados
src/systems/     colisão por polígonos, profundidade, oclusores, leitor de mapas do Tiled
src/ui/          dialogo, decisoes, calendario, joystick, tela inicial (HTML/CSS)
src/state/       estado do jogo, save e barramento de eventos
src/data/        capitulos.json, dialogos.json, decisoes.json, sipat.json, inspecao.json, resultado.json, mapas de teste
docs/            ROTEIRO.md (conteúdo) e MAPAS.md (pontos de cada mapa)
ferramentas/     scripts de apoio
```

Nomes, tamanhos e grades de cada asset: **ASSETS.md**. Se um arquivo ainda não existir, use um placeholder do mesmo tamanho sem quebrar o jogo.

## Identidade visual

| Cor | Hex | Uso |
| --- | --- | --- |
| Verde principal | #093F1A | Painéis, botões, caixa de diálogo, tela inicial |
| Verde complemento | #35854e | Bordas, padrão de fundo |
| Laranja destaque | #FFBB61 | Botão selecionado/foco, títulos, nome de quem fala |
| Branco | #FFFFFF | Texto principal |
| Cinza | #c9c9c9 | Desativado, texto secundário |
| Azul | #1b78bf | Informação, dicas |
| Vermelho | #c22121 | Alertas |
| Fundo dos mapas | #0d1a12 | Área fora do cenário isométrico |

Botões: fundo #093F1A, borda #35854e com contorno externo escuro de 2 px e sombra em bloco de 2 px, texto branco; selecionado/pressionado = borda #FFBB61. Texto laranja só sobre #093F1A.
