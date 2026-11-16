# Assets — nomes, tamanhos e grades

Regras gerais:

- **`arte-original/`** guarda o que sai do ChatGPT, sem tratamento (fundo magenta, 1024 px). Nome livre, de preferência o nome final + versão: `corpo-v1.png`, `corpo-v2.png`.
- **`public/assets/`** guarda só a versão final que o jogo carrega: reduzida para o tamanho nativo com *nearest neighbor*, paleta limitada, **fundo transparente** (sem magenta) e com o nome exato da tabela.
- Nomes em minúsculas, sem acento, palavras separadas por hífen.
- Imagens em PNG. Áudio em MP3.
- Grades: quadros do mesmo tamanho, sem espaço entre eles, lidos da esquerda para a direita e de cima para baixo.

No jogo, todos os sprites de personagem (jogáveis, NPCs, figurantes) são desenhados em escala 2, para combinar com a escala dos mapas.

## Jogáveis — `public/assets/sprites/jogaveis/julia/` e `.../lucas/`

| Arquivo | Conteúdo | Tamanho final | Grade |
| --- | --- | --- | --- |
| `corpo.png` | Corpo inteiro, pose neutra (seleção de personagem) | 128x192 | 1 quadro |
| `selecionado.png` | Corpo inteiro, polegar para cima | 128x192 | 1 quadro |
| `caminhada.png` | Chibi andando | 192x192 | 3x3 de 64x64. Linhas: baixo, cima, direita. Colunas: pé esquerdo à frente, parado, pé direito à frente. A esquerda é a direita espelhada no código |
| `retratos.png` | Retratos da caixa de diálogo | 192x128 | 3x2 de 64x64. Linha 1: neutra, falando, feliz. Linha 2: preocupada, alerta, surpresa |
| `caminhada-pijama.png` | Chibi de pijama andando (Cap. 1, quarto) | 192x192 | Mesma grade da `caminhada.png` |
| `retratos-pijama.png` | Retratos de pijama, sem capacete | 192x64 | 3 de 64x64 em linha: neutra, feliz, preocupada |

`julia/corpo.png` é **provisório** (v1, ainda com o logo e o rabo de cavalo alto). Substitua pela versão final.

## NPCs — `public/assets/sprites/npcs/<nome>/` (antonio, marcos, renata, diego, caio)

| Arquivo | Conteúdo | Tamanho final | Grade |
| --- | --- | --- | --- |
| `chibi.png` | Chibi parado, respirando | 128x64 | 2 de 64x64: normal, respirando |
| `retratos.png` | Retratos da caixa de diálogo | 256x64 (Renata e Caio: 320x64) | 64x64 em linha: neutra, falando, feliz, séria (Renata: + preocupada; Caio: neutra, falando, feliz, envergonhado, preocupado) |

## Figurantes — `public/assets/sprites/figurantes/`

| Arquivo | Conteúdo | Tamanho final |
| --- | --- | --- |
| `operador-sem-protetor.png` | Operador na bancada, de perfil, sem protetor auricular | 64x64 |
| `pedestre-celular.png` | Pessoa andando de perfil olhando o celular | 64x64 |

## Mapas — `public/assets/mapas/<area>/` (quarto, portaria, recepcao, vestiario, corredor-a, corredor-b, posto)

| Arquivo | Conteúdo | Tamanho final |
| --- | --- | --- |
| `fundo.png` | Cenário isométrico em corte, sem personagens e sem texto (fundo #0d1a12) | Variável: pessoa de 1,75 m ≈ 116 px (quarto 453x460, portaria 464x538, recepcao 672x529, vestiario 571x783, corredor-a 503x721, corredor-b 695x1003, posto 837x900) |
| `mapa.json` | Marcação no formato do Tiled (camadas `caminhavel`, `colisao`, `oclusores`, `pontos`), feita no editor do jogo (`?editor=1`) ou no Tiled. Nomes dos pontos em docs/MAPAS.md | — |

As fotos da fábrica (já aprovadas pela Segurança da Informação) ficam em `arte-original/fotos-fabrica/`, **nunca** em `public/`.

## Objetos — `public/assets/objetos/`

| Arquivo | Conteúdo | Tamanho final |
| --- | --- | --- |
| `riscos/caixas-extintor.png` | Pilha de caixas (vai na frente do extintor) | até 64x64 |
| `riscos/oleo-pingando.png` | Óleo pingando da máquina (origem do vazamento) | 2 quadros de 32x32 |
| `riscos/cabo.png` | Cabo solto atravessando a passagem | até 96x32 |
| `riscos/painel-aberto.png` | Painel elétrico de porta aberta | até 64x64 |
| `riscos/pallets-saida.png` | Pilha de pallets (vai na frente da saída de emergência) | até 64x64 |
| `cenario/poca-oleo.png` | Poça de óleo do acidente (Cap. 4) | até 64x32 |
| `cenario/fita-zebrada.png` | Fita zebrada entre 2 postes | 64x32 |
| `cenario/cone.png` | Cone de sinalização | 32x32 |

## Interface — `public/assets/ui/`

| Arquivo | Conteúdo | Tamanho final |
| --- | --- | --- |
| `dialogo/moldura.png` | Moldura da caixa de fala, vazia, ~3:1 | 360x120 |
| `controles/joystick-base.png` | Base do joystick | 64x64 |
| `controles/joystick-alavanca.png` | Alavanca do joystick | 32x32 |
| `controles/botao-acao.png` | Botão de ação laranja com "!": quadro 0 normal, quadro 1 pressionado | 64x32 (2 quadros de 32x32) |
| `controles/balao-interacao.png` | Balão com "!" sobre quem tem algo a dizer | 16x16 |
| `controles/seta-caminho.png` | Seta flutuante que aponta o próximo objetivo (placeholder em código até existir) | 16x16 |
| `icones/epi-plug.png`, `epi-calcado.png`, `epi-fone.png`, `epi-tenis.png`, `epi-algodao.png` | Itens do armário de EPI | 32x32 cada |
| `icones/audio-ligado.png`, `audio-mudo.png` | Toggle de áudio | 16x16 cada |
| `itens/caixa-com-ca.png`, `caixa-sem-ca.png`, `saquinho.png` | Caixas de protetor (decisão D3) | 32x32 cada |
| `itens/folha-cat.png`, `folha-aso.png`, `folha-fispq.png` | Folhas da prancheta (decisão D10), sem texto | 32x32 cada |
| `celular/moldura.png` | Celular para as mensagens da Renata e do Jonas | 200x360 |
| `tablet/moldura.png` | Tablet do Diego (lista do relato no Cap. 6) e moldura do calendário da SIPAT | 320x240 |
| `calendario/cartao-frente.png`, `cartao-verso.png` | Cartão do calendário aberto e fechado | 80x112 cada |
| `tela-inicial/padrao-icones.png` | 8 ícones brancos do padrão de fundo | 96x48 (4x2 de 24x24) |
| `tela-inicial/emblema.png` | Emblema do título, sem texto | 96x96 |
| `tela-inicial/logo-titulo.png` | Letreiro "MISSÃO / TURNO SEGURO" com o emblema (plano B: fonte no código) | ~240x160 |
| `tela-inicial/logo-horizontal.png` | Variação horizontal do letreiro | ~320x96 |
| `tela-inicial/logo-nidec.svg` | Logo **oficial** da Nidec (SVG; `logo-nidec.png` 240x73 de reserva). Não alterar | vetor |
| `tela-inicial/fundo.png` | Fundo da tela inicial e da seleção (galpão em pixel art) | 360x640 |
| `tela-final/estrela-cheia.png`, `estrela-vazia.png` | Estrelas da pontuação | 16x16 cada |
| `tela-final/selo.png` | Selo "Missão cumprida" | 96x96 |

## Telas — `public/assets/telas/`

| Arquivo | Conteúdo | Tamanho final |
| --- | --- | --- |
| `fundo-inicial.png` | Fundo da tela inicial (se usar imagem além do padrão) | 360x640 |
| `fundo-selecao.png` | Fundo da seleção de personagem | 360x640 |

## Áudio — `public/assets/audio/`

| Arquivo | Uso |
| --- | --- |
| `musica/t1-tema.mp3` | Tela inicial e seleção (loop) |
| `musica/t2-fabrica.mp3` | Cap. 1, 2, 3 e 7 (loop) |
| `musica/t3-ontem.mp3` | Cap. 4 (loop) |
| `musica/t4-olho-vivo.mp3` | Cap. 5, inspeção (loop) |
| `musica/t5-sipat.mp3` | Cap. 6, relato e SIPAT (loop) |
| `musica/j1-vitoria.mp3` | Fim de capítulo e tela de resultado |
| `musica/j2-tempo-esgotado.mp3` | Minigame |
| `sfx/passo-1.mp3`, `passo-2.mp3` | Passos (alternados) |
| `sfx/blip.mp3` | Cada letra da fala |
| `sfx/interagir.mp3` | Abrir diálogo |
| `sfx/menu.mp3` | Botões |
| `sfx/escolha.mp3` | Confirmar uma decisão (som neutro: o jogo não indica certo ou errado) |
| `sfx/item.mp3` | EPI escolhido |
| `sfx/marcar.mp3`, `desmarcar.mp3`, `tique.mp3` | Inspeção (sem som de certo/errado) |
| `sfx/cartao.mp3` | Virar cartão do calendário |
| `sfx/catraca.mp3` | Cap. 2 |
| `sfx/despertador.mp3` | Início do Cap. 1 |
| `sfx/notificacao.mp3` | Mensagens no celular |
| `sfx/trocar-roupa.mp3` | Guarda-roupa (Cap. 1) |
| `sfx/estrela.mp3` | Tela de resultado |
| `sfx/porta.mp3` | Abrir porta (saídas por porta: quarto, recepção, vestiário, porta da cozinha) |
| `sfx/porta-fechar.mp3` | Porta fechando (opcional, depois do fade) |
| `sfx/ambiente-fabrica.mp3` | Fundo da fábrica, volume baixo (loop) |

Registre a origem e a licença de cada som em `CREDITOS.md`.

## Fontes — `public/assets/fontes/`

Fonte pixel com acentos (VT323 ou Pixelify Sans, do Google Fonts), em `.woff2`.
