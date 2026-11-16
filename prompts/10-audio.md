# Tarefa 10 — Ligar os áudios

Releia **AGENTS.md** e **ASSETS.md** (seção Áudio). Os arquivos já tratados estão em `public/assets/audio/sfx/` e `public/assets/audio/musica/` (MP3, volumes já equalizados, silêncio do começo e do fim já cortado). Não altere os arquivos.

## 1. Gerenciador de áudio

Use o gerenciador que já existe (tarefa 04) e configure por uma tabela em `src/data/audio.json`, com `volume` (0 a 1) e `loop` de cada som. Volumes iniciais:

| Som | Volume | Observação |
| --- | --- | --- |
| Músicas `t1` a `t5` | 0,45 | loop, crossfade de 800 ms ao trocar de música |
| `j1-vitoria`, `j2-tempo-esgotado` | 0,6 | uma vez; a música de fundo baixa para 0,15 enquanto tocam e volta depois |
| `ambiente-fabrica` | 0,25 | loop do Cap. 2 ao 7, por baixo da música; some no quarto e na tela de resultado |
| `blip` | 0,25 | a cada 2 letras; pitch aleatório entre 0,95 e 1,05; um por vez (não empilhar) |
| `passo-1` / `passo-2` | 0,35 | alternados a cada 300 ms enquanto anda; pitch aleatório 0,92 a 1,08 |
| `menu` | 0,5 | qualquer botão de interface |
| `interagir` | 0,5 | abrir diálogo / balão "!" / tocar no ponto |
| `escolha` | 0,6 | confirmar decisão (neutro) |
| `item` | 0,6 | escolher EPI, pegar crachá, pegar caixa, pegar formulário |
| `marcar` / `desmarcar` | 0,6 | inspeção |
| `tique` | 0,5 | últimos 10 s da inspeção, 1 por segundo |
| `cartao` | 0,6 | virar cartão do calendário |
| `catraca` | 0,7 | catraca da portaria, catraca facial e catraca da fábrica |
| `despertador` | 0,6 | início do Cap. 1, uma vez; para ao fechar o primeiro pensamento |
| `notificacao` | 0,7 | mensagem nova no celular e banner de notificação |
| `trocar-roupa` | 0,7 | guarda-roupa e porta do vestiário, durante a tela escura |
| `porta` | 0,6 | ao sair por porta: quarto, saída da recepção, porta do vestiário; e ao tocar na porta da cozinha |
| `porta-fechar` | 0,4 | logo depois do fade de uma saída por porta (opcional) |
| `estrela` | 0,7 | cada estrela que acende na tela de resultado, com 300 ms entre elas |

## 2. Música por capítulo

| Momento | Música |
| --- | --- |
| Tela inicial e seleção | `t1-tema` |
| Cap. 1, 2, 3 e 7 | `t2-fabrica` |
| Cap. 4 (corredor-a e corredor-b) | `t3-ontem` |
| Cap. 5 (inspeção) | `t4-olho-vivo` |
| Cap. 6 (relato) e calendário da SIPAT | `t5-sipat` |
| Fim do Cap. 7 e tela de resultado | `j1-vitoria` (depois, `t1-tema` baixinho) |
| Tempo esgotado na inspeção | `j2-tempo-esgotado` |

No calendário da SIPAT (corredor-a), a música troca para `t5-sipat` enquanto ele está aberto e volta para `t3-ontem` ao fechar.

## 3. Regras

- Nada toca antes do primeiro toque do jogador (desbloqueio do áudio no iOS/Android); a tela inicial toca `t1-tema` a partir do primeiro toque.
- O botão de áudio desliga tudo (música e efeitos) e a escolha fica salva.
- Ao minimizar o navegador ou trocar de aba, pausa tudo; ao voltar, retoma.
- Pré-carregue os efeitos curtos no Boot; as músicas, ao entrar no capítulo que as usa.
- Arquivo que falhar ao carregar = silêncio, com aviso no console, sem travar.

## Critérios de aceite

- [ ] Do menu ao resultado, cada som toca no momento da tabela, sem estourar nem sumir.
- [ ] A troca de músicas é suave e o ambiente da fábrica fica por baixo.
- [ ] O blip não vira um "zumbido" contínuo em falas longas.
- [ ] Mute salvo e respeitado em todas as telas.
- [ ] `npm run build` sem erros de TypeScript.
