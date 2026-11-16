# Roteiro — Missão Turno Seguro

Fonte: Documento de Preparação (aprovado em 15/11/2026). Este arquivo é a referência de conteúdo para `src/data/*.json`.

## Ajustes finais (valem por cima do texto abaixo)

Os mapas foram refeitos com base nas fotos da fábrica. Onde o texto original divergir, vale o que está aqui:

1. **Mapas e ordem:** quarto → portaria → recepção → vestiario → corredor-a → corredor-b → posto. Pontos de cada mapa em `docs/MAPAS.md`.
2. **Cap. 1:** a troca de pijama para uniforme continua no guarda-roupa do quarto.
3. **Recepção (fim do Cap. 2):** mapa de passagem. O jogador atravessa o saguão, passa pela catraca de reconhecimento facial (som `catraca`) e sai pela porta de madeira embaixo da escada. Pensamento opcional no banner da SIPAT: "Banner da SIPAT… semana que vem já? Quero ver a programação." A transição "Vestiário à direita… vamos lá." acontece na saída da recepção.
4. **Cap. 3 (mapa `vestiario`, que é o corredor dos vestiários):** o mapa começa na chegada. O jogador vai até a porta única do vestiário, interage (tela escura + som `trocar-roupa`: guarda a mochila no armário e volta) e só então o Marcos aparece no armário de EPI. Falas do Marcos: trocar "Ali é colado na prensa" por "Ali é colado nas máquinas de usinagem". D1 no armário de EPI, D2 logo em seguida no mesmo diálogo, D3 na estante de caixas. A catraca da fábrica só libera depois do D3.
5. **Cap. 4, parte A (mapa `corredor-a`):** cena nova com o Diego (CIPA), junto do bebedouro:
   - **Diego** (feliz): E aí! Você é {nome}, que vai cobrir o Jonas? Sou o Diego, da CIPA.
   - **Diego** (neutra): Caminho aqui dentro é só pela faixa de pedestre, tá? Empilhadeira não avisa.
   - **Diego** (feliz): Ah, e essa semana tem SIPAT! A Semana Interna de Prevenção de Acidentes do Trabalho, que a CIPA organiza todo ano com o SESMT. O foco deste ano é saúde mental: estresse, pressão e pedir ajuda sem vergonha.
   - **Diego** (neutra): A programação está no quadro ali. Dá uma olhada.
   - O **calendário da SIPAT** (que no texto original ficava no tablet, no Cap. 6) abre ao tocar no quadro `quadro-sipat`. As regras do calendário (data do aparelho, falas de passado/hoje/futuro, antes de 16/11 e depois de 19/11) continuam as mesmas. Se o jogador tentar sair sem abrir o calendário, o Diego insiste uma vez: "Não esquece de olhar a programação, hein!" Na segunda tentativa, ele deixa passar.
   - **Diego** (neutra), no fim da cena: A Renata está te esperando lá na frente, no fim da faixa. Ela precisa de uma ajuda.
6. **Cap. 4, parte B (mapa `corredor-b`):** todo o resto do Cap. 4 (Renata, D4 a D11, Caio). A prancheta da D10 fica no balcão da janela da sala dos líderes. A poça, os cones e a fita são objetos sobrepostos. D4: o jogador escolhe 2 pontos de cone entre 6 pontos marcados (`cone-1` a `cone-6`) e a fita liga os cones escolhidos; certo = os 2 pontos do lado da faixa de pedestre (`cone-1` e `cone-2`, marcados com a propriedade `certo: true`).
7. **Cap. 6 (posto):** o Diego chega, recebe o relato e diz as falas de agradecimento. As falas de explicação da SIPAT e o calendário saíram daqui (foram para a parte A). Troque "Dá uma olhada na programação aqui no tablet." por "Lembra do quadro lá na entrada? Te espero nas atividades!".
8. **Cap. 7:** na mensagem do Jonas, trocar "aquela prensa não perdoa" por "aquelas máquinas não perdoam".
9. **Pendências de conteúdo (usar placeholder visível e marcar `"aConfirmar": true` no JSON):** `[ramal]` da emergência, `[canal de apoio da Nidec]` e a programação da SIPAT (tema, horário e local de cada dia).

## Roteiro

O fio da história: **o Jonas se machucou ontem, e hoje o jogador assume o posto dele.** Cada capítulo é um passo natural até começar o turno nesse posto, e cada pergunta é uma decisão dentro da história. O jogo não diz na hora se a escolha foi certa: tudo é somado e explicado na tela de resultado.

Cada capítulo gera o seguinte: a mensagem da Renata leva à fábrica, o posto do Jonas exige EPI, o caminho até ele passa pelo local do acidente, a inspeção acha riscos, o relato chama a CIPA e a CIPA apresenta a SIPAT.

### Personagens

| Personagem | Papel | Onde aparece | Visual |
| --- | --- | --- | --- |
| Júlia / Lucas (jogável) | Novo no turno da manhã; hoje assume o posto do Jonas | Todos os capítulos | Já desenhados; versão de pijama para o quarto |
| Renata | Líder de linha e brigadista; manda a mensagem, reconstrói o acidente, pede a inspeção | Mensagem, corredor, posto | \~45 anos, cabelo preto cacheado em coque, uniforme cinza, colete vermelho de brigadista |
| Sr. Antônio | Porteiro | Portaria | \~60 anos, grisalho, bigode, uniforme de portaria azul-marinho, sem capacete |
| Marcos | Técnico de segurança (SESMT); cuida dos EPIs | Vestiário | \~40 anos, pele negra, cabeça raspada, camisa branca, colete laranja refletivo, prancheta |
| Caio | Colega que socorreu o Jonas do jeito errado; o jogador o orienta | Corredor | \~22 anos, magro, cabelo crespo curto, uniforme padrão, ar envergonhado |
| Diego | Membro da CIPA; recebe o relato e apresenta a SIPAT | Posto | \~25 anos, cabelo castanho-claro, óculos de grau, camiseta verde da SIPAT, tablet na mão |
| Operador (figurante) | Trabalha sem protetor no posto vizinho (risco da inspeção) | Posto | Uniforme padrão, sem fala |

O Jonas só aparece por mensagem no celular, no começo e no fim. As cores de capacete de Marcos, Renata e Diego devem seguir o código de cores da Nidec.

### Capítulos

| Cap. | Local | O que acontece | Decisões que contam pontos | Tempo |
| --- | --- | --- | --- | --- |
| 0 · Início | Tela inicial | Menu e escolha do personagem | — | \~1 min |
| 1 · Bom dia | Quarto do jogador | Acorda de pijama, aprende a andar, se arruma; chega a mensagem da Renata: hoje você assume o posto do Jonas | — | 2–3 min |
| 2 · Chegada | Portaria | Sr. Antônio comenta o acidente de ontem; catraca | — | 1–2 min |
| 3 · Vestiário | Vestiário | Marcos explica que o posto do Jonas é ao lado da prensa; o jogador escolhe os EPIs, coloca o plug e escolhe a caixa de protetor | EPI certo, colocação do plug, caixa com CA | 3–4 min |
| 4 · O que houve ontem | Corredor, área isolada | Ajuda a Renata a isolar a área; o Caio aparece e o jogador o orienta sobre como deveria ter sido o socorro; ajuda a Renata com o registro | Isolamento, 4 orientações ao Caio, acolher o Caio, formulário, o que fazer ao ver um vazamento | 5–7 min |
| 5 · Inspeção | Posto do Jonas | Inspeção de início de turno: marcar o que estiver errado no posto, sem saber na hora se acertou | 7 riscos e falsos alarmes | 3–4 min |
| 6 · O relato | Posto do Jonas | Diego, da CIPA, recebe o relato, apresenta a SIPAT e mostra o calendário, que reage à data de hoje | — | 3–4 min |
| 7 · Turno seguro | Posto do Jonas | O turno começa; chega uma mensagem do Jonas; tela de resultado | — | 2–3 min |

Total estimado: 20 a 28 min, dentro da meta de 15 a 30. Em todo capítulo com troca de cenário, o personagem pensa alto no caminho, ligando uma cena à outra.

### Tela inicial

O layout segue o estilo da tela do Stardew Valley (logo grande no topo, botões embaixo, fundo animado), com arte própria e as cores da Identidade visual. No celular em pé (360x640 lógico), de cima para baixo:

1. **Canto superior direito:** toggle de áudio, ícone de alto-falante ligado/mudo com área de toque de 44x44 px. A escolha fica salva no aparelho.
2. **Terço superior:** título do jogo (emblema + nome) e o subtítulo "SIPAT 2026" em laranja.
3. **Centro:** respiro com o padrão de fundo (opcional: os dois personagens chibi parados, como prévia).
4. **Terço inferior:** botões **Novo jogo** e **Continuar**, retangulares e lado a lado, \~150x48 px cada, 16 px entre eles.
5. **Rodapé:** logo oficial da Nidec pequeno e o link discreto "Créditos" (onde ficam as atribuições dos sons e assets).

**Fundo:** #093F1A com um padrão de ícones de segurança (capacete, óculos, protetor auricular, luva, botina, extintor, cruz de primeiros socorros, triângulo de atenção) em #35854e a \~25% de opacidade, numa grade diagonal que rola devagar. O padrão é montado no código a partir de uma folha de ícones, porque padrões gerados por IA raramente emendam sem costura.

**Botões:**

| Estado | Fundo | Borda | Texto |
| --- | --- | --- | --- |
| Normal | #093F1A | #35854e + contorno externo escuro + sombra em bloco | Branco |
| Selecionado / pressionado | #093F1A | #FFBB61; a sombra some e o botão "afunda" 2 px | Branco |
| Desativado (Continuar sem jogo salvo) | #093F1A | #c9c9c9 a 50% | #c9c9c9 |

- **Novo jogo:** se já existe progresso salvo, confirma antes ("Começar do zero? O progresso salvo será apagado.") e vai para a seleção de personagem.
- **Continuar:** só fica ativo com jogo salvo e leva ao início do último capítulo.
- **Música (T1):** o navegador bloqueia som até o primeiro toque, então a tela abre em silêncio e a música começa no primeiro toque em qualquer lugar, se o toggle estiver ligado.
- **Animação:** padrão rolando, título flutuando 2 px para cima e para baixo, botões entrando com fade.

**Nome do jogo:** Missão Turno Seguro. No título, "Missão" pode vir menor e em laranja, sobre "Turno Seguro" em branco.

**Prompts da tela inicial:**

```
Crie uma folha com 8 ÍCONES de segurança do trabalho em pixel art 16-bit, cada um
equivalente a 24x24 pixels ampliado, em grade 4x2, todos na MESMA cor sólida branca
(silhueta com 1 ou 2 linhas internas, sem outras cores): capacete de segurança, óculos
de proteção, protetor auricular tipo concha, luva, botina com biqueira, extintor, cruz
de primeiros socorros, triângulo de atenção com exclamação. Traço grosso e legível,
mesmo peso visual em todos. Fundo magenta sólido #FF00FF. Sem texto.
```

Os ícones vêm brancos para o código pintar na cor que quiser.

```
Crie um EMBLEMA para o logo de um jogo 16-bit: capacete de segurança branco à frente
de um escudo verde-escuro (#093F1A) com borda verde (#35854e) e um detalhe laranja
(#FFBB61), visto de frente, contorno escuro de 2 pixels e brilho em blocos. Deixe espaço
livre embaixo para o nome do jogo (não escreva nada). Pixel art equivalente a 96x96
pixels ampliado, sem anti-aliasing. Fundo magenta sólido #FF00FF. NENHUM texto.
```

No mesmo chat: `dois ícones 16x16 brancos no mesmo estilo: alto-falante com ondas de som (ligado) e alto-falante com um X (mudo).`

O nome do jogo entra no código, em fonte pixel branca com contorno #093F1A e sombra laranja, ou desenhado letra a letra no Aseprite. O logo da Nidec deve ser o arquivo oficial da Comunicação, nunca gerado por IA.

### Mecânicas

- **Movimento e interação:** joystick virtual no canto inferior esquerdo e botão de ação no direito (no PC, setas/WASD + Espaço). Um balão "!" aparece sobre quem ou o que tem interação. O tutorial acontece no quarto, de forma natural (andar até o guarda-roupa, pegar o celular).
- **Pensar alto:** ao passar por um ponto do mapa, abre a caixa de fala com o retrato do jogador, o nome seguido de "(pensando)" e o texto em itálico.
- **Decisões sem gabarito na hora:** escolhas aparecem como opções de fala ou como ações (pegar um item, entregar um formulário). Os personagens reagem com naturalidade, sem dizer "certo" ou "errado". Cada decisão fica registrada para a tela de resultado. Única exceção: o Marcos não libera a produção sem os EPIs certos, como na vida real (o erro conta mesmo assim).
- **Inspeção (minigame):** o jogador toca no que achar errado no posto e o item fica marcado, sem indicar se acertou. Tocar de novo desmarca. Tempo de 2 min ou o botão "Finalizar inspeção". Há 7 riscos reais e alguns itens que parecem errados mas estão certos (falsos alarmes).
- **Calendário da SIPAT:** usa a data do aparelho. Destaca o dia de hoje, mostra os dias que já passaram e os que vêm. Ao tocar num dia, o protagonista pensa alto sobre a programação daquele dia, com falas diferentes para dia passado, hoje e dia futuro. Antes de 16/11 ou depois de 19/11, há falas próprias.
- **Pontuação:** 10 pontos por decisão certa (11 decisões = 110) e 5 por risco encontrado (7 = 35), menos 3 por falso alarme marcado, sem ficar negativo. Máximo de 145. 3 estrelas a partir de 125, 2 estrelas a partir de 85, 1 estrela abaixo disso.
- **Tela de resultado:** pontos, estrelas e a lista "O que você deixou passar": cada erro com o que aconteceu, o impacto real que ele teria e a forma certa. Fecha com uma mensagem de conscientização e o convite da SIPAT.
- **Progresso:** salvo no próprio aparelho, para retomar do último capítulo.

## Diálogos

Cada fala indica o personagem e a expressão do retrato; {nome} é o personagem jogável e "(pensando)" marca o pensamento em voz alta. As decisões D1 a D11 têm a opção certa marcada com **(certa)** só neste documento: no jogo, nenhuma opção é sinalizada e o texto **Resultado** aparece apenas na tela final, se o jogador errar. Primeiros socorros e ramal de emergência devem ser conferidos com o SESMT e a brigada.

### Cap. 1 · Bom dia (Quarto)

- *(Despertador. {nome}, de pijama, levanta da cama. Dica na tela: "Arraste para andar".)*
- **{nome}** (neutra, pensando): 5h30… Primeiro dia no turno da manhã. Bora!
- *(Interagir com o guarda-roupa: a tela escurece e o sprite troca do pijama para o uniforme.)*
- **{nome}** (feliz, pensando): Uniforme ok. Agora o crachá e o celular.
- *(Interagir com a mesa: pega o crachá. O celular vibra.)*
- **Mensagem da Renata:** "Bom dia! O Jonas se machucou ontem na linha. Ele está bem, mas hoje você assume o posto dele. Passa no vestiário que o Marcos te ajuda com os EPIs."
- **{nome}** (preocupada, pensando): O Jonas se machucou? O que será que aconteceu…
- *(Resposta rápida, não pontua: "Pode deixar, Renata!" ou "Nossa! Ele está bem mesmo?")*
- **Mensagem da Renata:** "Está sim, levou uns pontos. Te conto quando você chegar."
- *(Sai pela porta.)*

**Transição (calçada da portaria):**

- **{nome}** (neutra, pensando): Assumir um posto logo no primeiro dia… Quero entender direitinho o que aconteceu.

### Cap. 2 · Chegada (Portaria)

- **Antônio** (feliz): Bom dia! Você é quem vai cobrir o Jonas hoje, né? A Renata avisou.
- **Antônio** (séria): Foi feio ontem, viu. Mas ele está bem, ainda bem.
- **Antônio** (neutra): Passa o crachá na catraca e vai direto pro vestiário. O Marcos está te esperando.
- *(Catraca.)*

**Transição:**

- **{nome}** (neutra, pensando): Vestiário à direita… vamos lá.

### Cap. 3 · Vestiário

- **Marcos** (neutra): Opa, {nome}! Então é você que vai pro posto do Jonas. Ali é colado na prensa: o barulho passa fácil de 85 dB.
- **Marcos** (séria): Sem proteção, o ouvido vai perdendo a audição aos poucos. E não volta. Pega no armário o que você precisa pra lá.

**D1 · Armário de EPI** (escolher 2 itens): protetor auricular tipo plug **(certa)** · calçado de segurança com biqueira **(certa)** · fone de ouvido bluetooth · tênis · algodão

- Se a escolha estiver errada: **Marcos** (séria): Com isso aí eu não te deixo entrar na área. Dá uma olhada de novo. *(Repete até acertar; o erro conta.)*
- Se estiver certa: **Marcos** (feliz): Isso. Vamos lá.
- **Resultado:** Fone e algodão não reduzem o ruído, e tênis não protege contra queda de peças. Na área da prensa, o certo é protetor auricular e calçado com biqueira.

**D2 · Colocar o plug.** **Marcos** (neutra): Coloca o plug aí que eu quero ver.

- Opções: empurrar o plug direto no ouvido · enrolar entre os dedos, puxar a orelha para cima e para trás, inserir e segurar até expandir **(certa)** · colocar só a pontinha, pra não incomodar
- Reação (qualquer opção): **Marcos** (neutra): Hum… beleza.
- **Resultado:** Plug mal colocado quase não reduz o ruído. Com meses acima de 85 dB, a perda auditiva é permanente. O certo é enrolar, puxar a orelha para cima e para trás, inserir e segurar até expandir.

**D3 · Caixa de reposição.** **Marcos** (neutra): Pega uma caixa de protetor pra deixar no posto.

- Opções: caixa lacrada com o número do CA impresso **(certa)** · caixa sem número de CA · saquinho avulso sem embalagem
- Reação (qualquer opção): **Marcos** (neutra): Tá, leva essa.
- **Resultado:** Sem CA (Certificado de Aprovação), não há garantia de que o protetor protege. Confira sempre o número do CA na embalagem.
- **Marcos** (feliz): Pronto. A Renata vai te encontrar no corredor, perto de onde aconteceu.

**Transição:**

- **{nome}** (preocupada, pensando): Perto de onde aconteceu… então vou passar pelo local.

### Cap. 4 · O que houve ontem (Corredor)

- **Renata** (preocupada): Oi, {nome}! Chegou na hora. Me ajuda a terminar de isolar aqui? Ainda tem óleo no chão.

**D4 · Isolar a área** (atividade): posicionar 2 cones e a fita zebrada em volta da poça, escolhendo entre pontos marcados no chão. Certo: cercar a poça inteira, inclusive o lado do corredor de pedestres.

- Reação (qualquer resultado): **Renata** (neutra): Obrigada.
- **Resultado:** A poça ficou com um lado aberto para o corredor de pedestres. Isolamento incompleto é quase o mesmo que não isolar: alguém pode escorregar no mesmo lugar.
- **Renata** (preocupada): Foi aqui. Vazou óleo daquela máquina do posto do Jonas. Ele escorregou, caiu e cortou o braço na quina de um carrinho.
- **Renata** (séria): O Caio chegou primeiro. Correu pelo óleo, quase caiu junto, levantou o Jonas pelo braço e enrolou o corte com a estopa suja da máquina.
- **Renata** (séria): Ia levar ele andando até o ambulatório, sem chamar ninguém.
- *(O Caio se aproxima.)*
- **Caio** (envergonhado): Eu só queria ajudar… Travei e fiz o que veio na cabeça.
- **Renata** (neutra): Ninguém está te culpando, Caio. {nome}, você acabou de passar pela integração, está com tudo fresco. Explica pra ele como deveria ter sido?

**D5 · O primeiro passo.** **Caio** (neutra): Quando eu vi o Jonas no chão, o que eu devia ter feito primeiro?

- Opções: "Correr até ele, cada segundo conta." · "Olhar se o local era seguro, por causa do óleo, e chamar a brigada." **(certa)** · "Levantar ele logo do chão."
- Reações: certa → **Caio** (neutra): Faz sentido. Eu quase caí no mesmo óleo. Errada → **Caio** (neutra): Então foi mais ou menos o que eu fiz…
- **Resultado:** Correr ou levantar a vítima sem olhar o local transforma quem socorre na segunda vítima, e mover alguém que caiu pode piorar uma lesão. Primeiro a cena segura, depois a brigada.

**D6 · Chamar ajuda.** **Caio** (neutra): E pra chamar a brigada? Eu nem sei como.

- Opções: "Pelo ramal de emergência \[ramal\] ou pelo rádio do líder." **(certa)** · "Manda mensagem no grupo do setor." · "Vai correndo até o ambulatório buscar alguém."
- Reação (qualquer opção): **Caio** (neutra): Anotado.
- **Resultado:** Mensagem em grupo pode demorar a ser vista, e correr atrás de ajuda deixa a vítima sozinha. O ramal de emergência aciona a brigada na hora.

**D7 · O sangramento.** **Caio** (preocupado): E o sangue? Eu peguei o que tinha na mão.

- Opções: "A estopa serve, o importante é estancar." · "Pressão firme e contínua com gaze ou pano limpo, usando luvas." **(certa)** · "Lavar o corte com álcool primeiro."
- Reação (qualquer opção): **Caio** (neutra): Entendi.
- **Resultado:** Estopa suja leva graxa e sujeira para o corte, e álcool não estanca sangramento. Pressão direta com material limpo, usando luvas, segura a maioria dos sangramentos.

**D8 · Levar ou não levar.** **Caio** (neutra): E levar ele andando até o ambulatório, foi errado?

- Opções: "Foi certo, quanto antes chegar, melhor." · "Quem decide se pode mover é a brigada. Se precisar, ela chama o SAMU, no 192." **(certa)** · "Devia ter chamado a polícia, no 190."
- Reação (qualquer opção): **Caio** (feliz): Valeu, {nome}. Da próxima vez eu sei o que fazer.
- **Resultado:** Quem caiu pode ter lesões que não aparecem, e andar pode piorar. Quem avalia é a brigada, que aciona o SAMU (192) se precisar.

**D9 · Depois do susto.** **Caio** (envergonhado): Posso falar uma coisa? Eu não dormi essa noite. Fico vendo a cena e achando que piorei tudo.

- Opções: "Bola pra frente, Caio. Esquece isso e foca no trabalho." · "É normal ficar abalado depois de algo assim. Conversa com alguém: a Renata, o ambulatório ou o \[canal de apoio da Nidec\]." **(certa)** · "Se você tivesse feito o treinamento, não estaria assim."
- Reações: certa → **Caio** (neutra): É… acho que vou conversar, sim. Valeu. Errada → **Caio** (preocupado): Tá… vou tentar. *(O Caio sai.)*
- **Resultado:** Mandar esquecer ou culpar faz a pessoa guardar o sofrimento sozinha, e isso pesa no sono, na atenção e na segurança de todos. Acolher e indicar quem pode ajudar é o caminho.
- **Renata** (preocupada): Sabe que eu também fiquei mexida? Socorri o Jonas com a mão firme, mas cheguei em casa e desabei.
- **Renata** (neutra): Quem socorre também sente. Hoje cedo conversei com o pessoal do ambulatório e já estou melhor.
- **Renata** (feliz): Este ano a SIPAT vai falar muito disso: saúde mental. Cuidar da cabeça também é segurança.
- **Renata** (neutra): Agora preciso registrar o acidente oficialmente. Me passa o formulário certo ali da prancheta?

**D10 · O formulário** (ação: pegar uma folha da prancheta): CAT, Comunicação de Acidente de Trabalho **(certa)** · ASO, Atestado de Saúde Ocupacional · FISPQ, ficha de segurança de produto químico

- Reação (qualquer opção): **Renata** (neutra): Obrigada.
- **Resultado:** Acidente de trabalho é registrado na CAT. Ela garante os direitos do trabalhador e alimenta as estatísticas que ajudam a prevenir novos acidentes.
- **Renata** (séria): O pior é que esse vazamento já tinha sido visto dois dias antes. Todo mundo achou que alguém já tinha avisado.

**D11 · E se fosse você.** **Renata** (neutra): Se fosse você que visse aquele vazamento, o que faria?

- Opções: "Avisaria na hora o líder, o SESMT ou a CIPA, mesmo achando que alguém já avisou." **(certa)** · "Desviaria e tomaria cuidado." · "Esperaria a manutenção perceber."
- Reação (qualquer opção): **Renata** (neutra): Hum. Guarda isso, que a gente vai precisar já já.
- **Resultado:** Desviar ou esperar foi exatamente o que levou ao acidente do Jonas. Condição insegura se reporta na hora. Avisar nunca é exagero.
- **Renata** (neutra): Vamos pro posto. Antes de ligar qualquer coisa, a gente faz a inspeção de início de turno.

**Transição:**

- **{nome}** (neutra, pensando): Inspeção de início de turno… olho vivo.

### Cap. 5 · Inspeção (Posto do Jonas)

- **Renata** (neutra): Esse é o posto. Toca em tudo que você achar que está errado. Quando terminar, me avisa.
- *(Minigame: 2 min, sem indicação de acerto. Tocar marca, tocar de novo desmarca.)*

| Item na cena | Tipo | Na tela de resultado |
| --- | --- | --- |
| Óleo pingando da máquina (origem do vazamento de ontem) | Risco | O vazamento que derrubou o Jonas continua. Sem reportar, o próximo acidente é questão de tempo. |
| Extintor obstruído por caixas | Risco | Na emergência, cada segundo para chegar ao extintor conta. |
| Operador do posto vizinho sem protetor | Risco | Ruído acima de 85 dB sem protetor causa perda auditiva permanente. |
| Pedestre fora da faixa, no corredor de empilhadeira | Risco | Atropelamento por empilhadeira costuma ser grave. Pedestre anda na faixa. |
| Cabo atravessando a passagem | Risco | Cabo solto no caminho é tropeço certo. |
| Painel elétrico aberto | Risco | Painel aberto expõe a choque elétrico. Só eletricista autorizado mexe. |
| Saída de emergência bloqueada por pallets | Risco | Numa evacuação, uma rota bloqueada pode custar vidas. |
| Carrinho parado dentro da área demarcada | Falso alarme | Estava no lugar certo: a área demarcada é para isso. |
| Extintor da parede oposta, sinalizado e livre | Falso alarme | Estava em ordem: sinalizado e com acesso livre. |
| Caixas de peças organizadas na prateleira | Falso alarme | Estavam organizadas e no lugar. |

- **Renata** (neutra): Anotado. Isso tudo vai para a CIPA. Vou chamar o Diego.

### Cap. 6 · O relato (Posto do Jonas)

- **Diego** (feliz): E aí, {nome}! Sou o Diego, da CIPA. A Renata disse que você fez a inspeção. Me conta o que achou.
- *(O tablet do Diego mostra a lista do que o jogador marcou.)*
- **Diego** (neutra): Valeu pelo relato. É assim que se evita o próximo acidente: alguém vê, alguém avisa.
- **Diego** (feliz): E é exatamente isso que a SIPAT discute. É a Semana Interna de Prevenção de Acidentes do Trabalho, que a CIPA organiza todo ano com o SESMT. E este ano o foco principal é saúde mental: estresse, pressão e pedir ajuda sem vergonha.
- **Diego** (neutra): Este ano vai de 16 a 19 de novembro. Dá uma olhada na programação aqui no tablet.
- *(Calendário no tablet: o dia de hoje vem destacado pela data do aparelho. O jogador precisa abrir os 4 dias para seguir. Ao tocar em cada um, {nome} pensa alto.)*

| Situação do dia tocado | Pensamento de {nome} (exemplo: terça, 17/11) |
| --- | --- |
| Já passou | Terça teve \[tema\]. Perdi… vou pedir o material pro Diego. |
| É hoje | Hoje tem \[tema\], às \[horário\], no \[local\]. Já vou me programar. |
| Ainda vai acontecer | Na terça tem \[tema\]. Vou anotar. |
| Jogo aberto antes de 16/11 | A SIPAT começa segunda, dia 16. Vou ficar de olho. |
| Jogo aberto depois de 19/11 | A SIPAT já passou, mas o que ela ensina vale o ano todo. |

| Dia | Tema | Horário | Local |
| --- | --- | --- | --- |
| Seg 16/11 | \[abertura + tema\] | \[horário\] | \[local\] |
| Ter 17/11 | \[tema\] | \[horário\] | \[local\] |
| Qua 18/11 | \[tema\] | \[horário\] | \[local\] |
| Qui 19/11 | \[tema + encerramento\] | \[horário\] | \[local\] |

- **Diego** (feliz): Te espero lá! E qualquer condição insegura, fala com qualquer cipeiro.

### Cap. 7 · Turno seguro (Posto do Jonas)

- **Renata** (feliz): Agora sim. Posto inspecionado, riscos reportados. Pode começar, {nome}.
- *(O jogador liga a máquina. O celular vibra.)*
- **Mensagem do Jonas:** "Oi! A Renata me contou que você achou de onde vinha o vazamento. Valeu mesmo! E coloca o protetor direito, que aquela prensa não perdoa."
- **{nome}** (feliz, pensando): Primeiro dia… e já deu pra fazer diferença.
- *(Fade para a tela de resultado.)*

### Tela de resultado

- **Topo:** "Missão cumprida!", pontos de 145 e estrelas.
- **O que você deixou passar:** um cartão por erro, com o texto **Resultado** da decisão ou do item da inspeção (riscos não marcados e falsos alarmes marcados). Sem nenhum erro: "Você não deixou passar nada. É assim que um turno seguro acontece."
- **Mensagem de conscientização:** "Todo acidente dá sinais antes: um vazamento, um cabo no caminho, um protetor mal colocado. Ver e avisar é trabalho de todos. Segurança não é sorte, é atitude."
- **Convite:** "SIPAT 2026, de 16 a 19 de novembro. Participe!"
- **Botões:** Jogar de novo e Menu.

Base das regras citadas: [NR-15, Anexo 1](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-15-anexo-01.pdf) (85 dB(A) para 8 horas) e [NR-5, item 5.3.1](https://www.normaslegais.com.br/legislacao/trabalhista/nr/nr5.htm) (CIPA promove a SIPAT anualmente com o SESMT).

