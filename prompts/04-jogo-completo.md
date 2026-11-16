# Tarefa 04 — Jogo completo (do menu à tela de resultado)

Releia **AGENTS.md**, **CONTEXTO.md**, **ASSETS.md**, **docs/ROTEIRO.md** (comece pela seção "Ajustes finais", que vale por cima do resto) e **docs/MAPAS.md**. As tarefas 01 a 03 já foram feitas: analise o código existente e construa em cima dele. Não reescreva do zero.

## Objetivo

Deixar o jogo jogável de ponta a ponta: tela inicial → seleção de personagem → capítulos 1 a 7 nos 7 mapas → tela de resultado, com save, áudio e todas as decisões do roteiro.

Faça em **fases, na ordem, com um commit por fase** e `npm run build` limpo ao fim de cada uma.

## Situação dos assets

- Os 7 fundos de mapa estão prontos, com tamanhos diferentes (escala: pessoa ≈ 116 px; personagens em escala 2, ver AGENTS.md).
- Escalas dos objetos sobrepostos em `src/data/objetos.json` (padrão: riscos 1, poça/cone/fita 2), para ajustar sem mexer no código. Os `mapa.json` podem ainda não existir (estão sendo marcados com o editor da tarefa 03).
- Sprites dos jogáveis, controles e parte da interface já estão em `public/assets/`. Retratos e chibis dos NPCs, objetos de risco e alguns ícones podem faltar.
- **Nenhum áudio existe ainda** (músicas e efeitos chegam depois, com os nomes do ASSETS.md).
- Regra geral (AGENTS.md, regra 3): qualquer asset ausente vira placeholder gerado em código, do tamanho certo, com aviso no console. O jogo nunca trava por falta de arquivo.

**Fallback de mapa sem `mapa.json`:** caminhável = retângulo do fundo com margem de 40 px; sem colisão; os pontos da área (lista de `src/data/mapas/pontos.json`) são distribuídos numa coluna no centro do mapa, de baixo para cima, na ordem da lista, com o nome escrito em cima (só neste modo). Assim o fluxo inteiro dá para testar antes da marcação.

## Fase A — Infraestrutura de roteiro

1. **Estado e save** (`src/state/`): personagem escolhido, capítulo atual, flags do roteiro, respostas de cada decisão (incluindo tentativas erradas do D1), itens marcados na inspeção, dias do calendário abertos e preferência de áudio. Salvar no localStorage ao começar cada capítulo e a cada decisão. **Continuar** volta ao início do capítulo salvo, com as decisões anteriores preservadas.

2. **Roteiro em dados:** um pequeno motor de passos lê `src/data/capitulos.json`. Cada capítulo lista os mapas e, para cada mapa, os gatilhos (`aoEntrar`, `aoInteragir:<ponto>`, `aoPassar:<ponto>`, `aoTentarSair`) com uma sequência de passos. Tipos de passo, no mínimo:
   - `fala` (personagem, expressão, texto), `pensamento` (texto em itálico, nome + "(pensando)"), `mensagem` (celular: remetente, texto, respostas rápidas opcionais que não pontuam);
   - `decisao` (id de `decisoes.json`), `acao` especial (`cones`, `prancheta`, `armario`, `inspecao`, `calendario`, `relatoTablet`);
   - `fade`, `som`, `musica`, `trocarSprite` (pijama → uniforme), `mostrarNpc`/`esconderNpc`/`moverNpc` (até um ponto, andando), `mostrarObjeto`/`esconderObjeto`, `liberar`/`bloquear` (ponto), `flag`, `se` (condição por flag ou resposta), `irPara` (próximo mapa ou capítulo), `objetivo` (ponto para onde a seta aponta).
   As falas ficam em `src/data/dialogos.json` (referenciadas por id) ou direto no `capitulos.json`, como achar mais legível. **Todo texto sai de docs/ROTEIRO.md**, palavra por palavra, com os Ajustes finais aplicados. `{nome}` vira "Júlia" ou "Lucas".

3. **Caixa de diálogo** (HTML/CSS): moldura do ASSETS.md ou CSS na paleta, retrato 64x64 (em escala 2, se couber) no quadro da direita da moldura `ui/dialogo/moldura.png`, que já tem a área do retrato à direita e uma barrinha laranja embaixo dela para o nome, nome em laranja, texto com efeito máquina de escrever (som `blip` a cada 2 letras), toque/Espaço completa o texto e depois avança. Expressões: use a coluna certa da folha de retratos; se a expressão pedida não existir na folha daquele personagem, use `neutra`. O Sr. Antônio só fala pela caixa (sem sprite no mapa).

4. **Decisões:** opções empilhadas como botões da paleta (mínimo 44 px de altura), embaralhadas a cada vez, **sem nenhum indicativo de certo ou errado** (som `escolha`, neutro). Ações especiais:
   - **D1 (armário):** grade com os 5 ícones de EPI, escolher 2 e confirmar. Se errado, o Marcos repete a fala e a escolha volta; a primeira tentativa errada fica registrada como erro.
   - **D3 e D10:** escolher um dos 3 itens visuais (caixas / folhas da prancheta).
   - **D4 (cones):** o mapa mostra marcadores nos pontos `cone-1` a `cone-6`; o jogador toca em 2, a fita aparece ligando os cones escolhidos e a poça. Certo = os pontos com `certo: true`.
   - Pontuação conforme o roteiro: 10 por decisão certa (11 decisões), 5 por risco marcado, −3 por falso alarme marcado, mínimo 0, máximo 145.

5. **Celular:** moldura do ASSETS.md por cima da tela, mensagens em balões, som `notificacao`, respostas rápidas como botões.

6. **Seta de caminho:** seta pixel 16x16 laranja (#FFBB61) com contorno escuro (placeholder desenhado em código; arquivo final `ui/seta-caminho.png`), flutuando 2 a 3 px para cima e para baixo sobre o ponto do `objetivo` atual. Some durante diálogos e na inspeção. Se o ponto estiver fora da tela, fica presa na borda apontando para ele.

7. **Áudio:** gerenciador único com a lista de músicas e efeitos do ASSETS.md. Arquivo ausente = silêncio, sem erro. Música por capítulo conforme a tabela do ASSETS.md, com crossfade de 500 ms; `ambiente-fabrica` baixo do Cap. 2 ao 7; passos alternados enquanto anda. Só começa depois do primeiro toque. O toggle da tela inicial e um botão pequeno de áudio no canto durante o jogo (44x44 de área de toque) controlam tudo, e a escolha fica salva.

8. **Transições:** fade preto de 300 ms, pensamento da transição quando o roteiro tiver, chegada no ponto `chegada` do próximo mapa.

## Fase B — Menu, seleção e Cap. 1 e 2

1. **Tela inicial** conforme docs/ROTEIRO.md ("Tela inicial"): padrão de ícones de `tela-inicial/padrao-icones.png` pintado em #35854e a ~25% e rolando na diagonal; logo (`logo-titulo.png` ou fonte com contorno, plano B); subtítulo "SIPAT 2026"; botões Novo jogo e Continuar com os estados da tabela; toggle de áudio; rodapé com logo da Nidec (se o arquivo existir) e link Créditos (lê `CREDITOS.md` convertido em HTML no build ou um `creditos.json`).
2. **Seleção de personagem:** Júlia e Lucas lado a lado com `corpo.png`; ao tocar, troca para `selecionado.png` e aparece "Começar".
3. **Cap. 1 (quarto)** com os sprites de pijama até o guarda-roupa; dica "Arraste para andar" (no PC: "Use as setas ou WASD") na primeira vez.
4. **Cap. 2 (portaria e recepção).**

## Fase C — Cap. 3 e 4

1. **Cap. 3 (vestiario):** porta do vestiário → Marcos aparece → D1, D2 → D3 → catraca da fábrica libera.
2. **Cap. 4 parte A (corredor-a):** cena do Diego e calendário (abaixo).
3. **Cap. 4 parte B (corredor-b):** Renata, D4 com cones, Caio chegando pela abertura, D5 a D9 (o Caio sai andando depois do D9), falas de saúde mental da Renata, D10 na prancheta, D11, fita libera a saída.
4. **Calendário da SIPAT** (`src/ui/`): abre pelo ponto `quadro-sipat`. Mostra os 4 dias (16 a 19/11) como cartões (`calendario/cartao-frente.png` e `cartao-verso.png`, ou CSS), com o de hoje destacado em laranja, os que passaram esmaecidos e os futuros normais. Tocar num cartão vira o cartão (som `cartao`) e dispara o pensamento de passado/hoje/futuro de docs/ROTEIRO.md. Antes de 16/11 e depois de 19/11, usa as falas próprias. Dados em `src/data/sipat.json` (tema, horário, local por dia), hoje com placeholders e `"aConfirmar": true`. Para testar, `?data=2026-11-17` força a data.

## Fase D — Cap. 5, 6 e 7 e resultado

1. **Inspeção (Cap. 5):** a câmera afasta até o posto inteiro caber na tela (zoom inteiro ou fracionário, mantendo pixel art nítido); os objetos de risco aparecem nos pontos `risco-*`; as áreas de toque são os pontos `risco-*` e `falso-*` (mínimo 32 px). Tocar marca (contorno laranja e som `marcar`), tocar de novo desmarca (`desmarcar`). Cronômetro de 2 min com `tique` nos últimos 10 s e botão "Finalizar inspeção". Sem nenhuma indicação de acerto. Itens em `src/data/inspecao.json` com o texto da tabela do roteiro.
2. **Cap. 6:** o Diego chega andando pela faixa; o tablet (`tablet/moldura.png`) mostra a lista do que o jogador marcou (só os nomes, sem certo/errado); falas de agradecimento.
3. **Cap. 7:** interagir com `maquina` liga a máquina (o sinaleiro do fundo ganha um brilho verde desenhado em código por cima), riscos somem, mensagem do Jonas no celular, pensamento final, fade.
4. **Tela de resultado** conforme docs/ROTEIRO.md: "Missão cumprida!", pontos de 145, estrelas (3 a partir de 125, 2 a partir de 85), cartões "O que você deixou passar" com o texto **Resultado** de cada decisão errada, de cada risco não marcado e de cada falso alarme marcado (ou a mensagem de nenhum erro), mensagem de conscientização, convite da SIPAT e botões Jogar de novo e Menu. Textos em `src/data/resultado.json`.

## Fase E — Ajustes finais

- `?cap=<n>` começa direto no capítulo n com a Júlia, ou com o Lucas usando `?personagem=lucas` (para teste). `?debug=1` continua mostrando a marcação.
- Teste no celular em pé (Chrome Android e Safari iOS): sem rolagem, joystick e botão de ação confortáveis, textos legíveis, `safe-area-inset` respeitado.
- Desempenho: carregar os assets de cada mapa só ao entrar nele (com tela curta de carregamento), mirar 60 fps em celular intermediário.
- Revise todos os textos contra docs/ROTEIRO.md (acentos, `{nome}`, Ajustes finais).

## Fora do escopo

Criar ou alterar arte e áudio, marcar os mapas (o editor já existe), backend, ranking online.

## Critérios de aceite

- [ ] Dá para jogar do menu à tela de resultado, com os 7 mapas, mesmo sem `mapa.json` (fallback) e sem nenhum áudio.
- [ ] Com os `mapa.json` marcados, colisão, profundidade, NPCs, objetos e seta usam os pontos de docs/MAPAS.md.
- [ ] Todas as falas e decisões D1 a D11 estão no jogo, iguais ao roteiro com os Ajustes finais, e nenhuma tela indica certo ou errado antes do resultado.
- [ ] A pontuação bate com as regras (teste: tudo certo = 145 e 3 estrelas; nada marcado e tudo errado = 0).
- [ ] O calendário reage à data (`?data=` para 15/11, 16/11, 18/11 e 20/11).
- [ ] Continuar retoma no início do capítulo salvo, com as decisões anteriores.
- [ ] Áudio: toggle salvo, nada toca antes do primeiro toque, arquivos ausentes não geram erro.
- [ ] `npm run build` sem erros de TypeScript.

## Ao terminar

Liste o que foi feito em cada fase, os placeholders que ainda aparecem (assets e textos `aConfirmar`) e como testar cada capítulo pela URL.
