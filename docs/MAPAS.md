# Mapas — pontos, colisões e transições

Todos os mapas estão em `public/assets/mapas/<area>/fundo.png` (tamanho variável, isométrico 2:1 em corte, fundo #0d1a12; pessoa de 1,75 m ≈ 116 px, então os personagens são desenhados em escala 2).
Os `mapa.json` das 7 áreas **já estão prontos** em `public/assets/mapas/<area>/mapa.json`, no formato de camadas de objetos do Tiled (`caminhavel`, `colisao`, `oclusores`, `pontos`). Coordenadas em pixels do `fundo.png`, no tamanho natural. Ajustes finos podem ser feitos no Tiled ou no editor.

### Convenções do `mapa.json`

- Cada ponto tem a propriedade `tipo` (`chegada`, `npc`, `interacao`, `pensamento`, `saida`, `objeto`, `toque`) e, quando precisa, `raio`, `bloqueado` e `certo`.
- **Colisões com nome:** um objeto da camada `colisao` cujo nome é igual ao de um ponto, ou começa com o nome do ponto + `-` (ex.: `catraca-1`, `catraca-2`, `catraca-3` para o ponto `catraca`), é **removido quando esse ponto é liberado**. É assim que as catracas abrem a passagem. Colisões sem nome são fixas.
- **Oclusores com imagem:** cada objeto da camada `oclusores` tem `baseY` e `imagem` (PNG recortado do fundo, em `mapas/<area>/oclusores/`). O jogo desenha esse PNG por cima do fundo com profundidade `baseY`, para o personagem passar atrás do objeto.
- Um ponto de interação pode cobrir vários objetos iguais com um `raio` maior: na portaria, o ponto `catraca` (raio 48) atende às 3 catracas.

Os nomes dos pontos abaixo são **contratos**: o código e os JSONs de conteúdo usam exatamente esses nomes.
Tipos de ponto: `chegada` (onde o jogador aparece), `npc` (onde o NPC fica parado), `interacao` (balão "!" e ação), `pensamento` (pensamento ao passar perto, uma vez só), `saida` (troca de mapa), `objeto` (onde o código desenha um objeto sobreposto), `toque` (área de toque da inspeção).

Propriedades opcionais de um ponto no JSON: `raio` (px, padrão 24), `bloqueado` (bool, até o roteiro liberar), `certo` (bool, usado nos cones e na inspeção).

## quarto (Cap. 1)

Cama à esquerda, criado-mudo com despertador, janela, escrivaninha com celular e crachá, guarda-roupa, porta à direita, tapete verde no meio.

| Ponto | Tipo | O que acontece |
| --- | --- | --- |
| `chegada` | chegada | Ao lado da cama (acorda de pijama) |
| `despertador` | pensamento | "5h30… Primeiro dia no turno da manhã. Bora!" (dispara no início) |
| `guarda-roupa` | interacao | Tela escura, som `trocar-roupa`, troca para o sprite de uniforme |
| `escrivaninha` | interacao | Pega o crachá, o celular vibra, mensagem da Renata (só depois do guarda-roupa) |
| `porta` | saida | Vai para a portaria (só depois da mensagem) |

Colisões: cama, criado-mudo, escrivaninha e cadeira, guarda-roupa, paredes.

## portaria (Cap. 2)

Sala das catracas. O jogador chega pela abertura da frente (lado da rua, do meio-fio amarelo), fala com o Sr. Antônio no speaker da guarita (à direita), passa pelas 3 catracas em diagonal e sai pela passagem da parede esquerda.

| Ponto | Tipo | O que acontece |
| --- | --- | --- |
| `chegada` | chegada | Abertura da frente, vindo da rua |
| `speaker` | interacao | Diálogo do Cap. 2 com o Sr. Antônio (o retrato dele aparece na caixa de fala; não tem sprite no mapa) |
| `catraca` | interacao | Som `catraca`, remove as colisões `catraca-1` a `catraca-3` (bloqueado até o diálogo) |
| `saida` | saida | Passagem da parede esquerda → transição (pensamento) e recepção |

Colisões: paredes (menos as passagens), guarita, catracas e grades (a catraca vira passável depois de liberada), canteiro.

## recepcao (fim do Cap. 2)

Saguão: fachada de vidro à esquerda, mesa da recepção vazia, área de espera, pilar com hidrante, catraca com leitor facial e grades verdes, escada com a porta de saída embaixo, banner em branco.

| Ponto | Tipo | O que acontece |
| --- | --- | --- |
| `chegada` | chegada | Porta de vidro da fachada |
| `banner-sipat` | pensamento | Pensamento opcional sobre a SIPAT |
| `catraca-facial` | interacao | Leitor facial reconhece, som `catraca`, remove a colisão `catraca-facial` |
| `saida` | saida | Porta embaixo da escada → vestiario (pensamento "Vestiário à direita… vamos lá.") |

Colisões: mesa e cadeiras, sofá e mesa de centro, bebedouro, expositor, pilar, grades e catraca, totem, mesa expositora, banner, extintores, escada. Oclusor: escada.

## vestiario (Cap. 3) — corredor dos vestiários

Corredor comprido na diagonal. Na chegada, à esquerda, o nicho da catraca da fábrica; depois o armário de EPI, a estante de caixas, a TV, o relógio de ponto, o quadro de RH, o painel 5S e, no fim, o nicho com a porta única do vestiário. No fundo, a porta fechada da cozinha.

| Ponto | Tipo | O que acontece |
| --- | --- | --- |
| `chegada` | chegada | Borda de baixo do corredor |
| `porta-vestiario` | interacao | Tela escura + som `trocar-roupa` (guarda a mochila); depois disso o Marcos aparece |
| `marcos` | npc | Em frente ao armário de EPI |
| `armario-epi` | interacao | D1 e D2 |
| `estante-caixas` | interacao | D3 |
| `quadro-rh` | pensamento | Opcional: avisos do RH |
| `porta-cozinha` | interacao | Opcional: "Ainda não é hora do almoço." |
| `catraca-fabrica` | saida | Bloqueada até o D3; leva ao corredor-a |

Colisões: paredes, armário, estante, extintores, porta da cozinha, catraca da fábrica (até liberar).

## corredor-a (Cap. 4, parte A) — faixa de pedestre

Faixa de pedestre colada na parede do galpão (blocos branco-gelo), guarda-corpo amarelo, corredor de empilhadeira com empilhadeira parada, quadro de gestão. Na parede: placas de saída e ponto de encontro, bebedouro, lixeira, extintor, porta do almoxarifado, quadro branco com o calendário da SIPAT, ventilador e ar-condicionado.

| Ponto | Tipo | O que acontece |
| --- | --- | --- |
| `chegada` | chegada | Início da faixa, embaixo |
| `diego` | npc | Na frente do quadro, perto do bebedouro: cena do Diego (ROTEIRO, ajuste 5) |
| `quadro-sipat` | interacao | Abre o calendário da SIPAT |
| `bebedouro` | pensamento | Opcional: hidratação no turno |
| `ponto-encontro` | pensamento | Opcional: onde ir numa emergência |
| `almoxarifado` | interacao | Opcional: "Almoxarifado… é aqui que repõe EPI." |
| `saida` | saida | Fim da faixa, à direita → corredor-b (o Diego insiste uma vez se o calendário não foi aberto) |

Colisões: paredes, bebedouro, lixeira, guarda-corpo inteiro. O jogador só anda na faixa de pedestre.

## corredor-b (Cap. 4, parte B) — lateral da produção

Estantes altas do estoque à esquerda (funcionam como parede), corredor de empilhadeira com faixa zebrada, faixa de pedestre, guarda-corpo amarelo com uma abertura perto do fim, sala dos líderes (balcão verde na janela), máquina de usinagem, carrinho de limpeza.

| Ponto | Tipo | O que acontece |
| --- | --- | --- |
| `chegada` | chegada | Início da faixa de pedestre, embaixo |
| `renata` | npc | Na faixa, antes da poça |
| `poca` | objeto | Poça de óleo (`objetos/cenario/poca-oleo.png`) na faixa e na abertura do guarda-corpo |
| `cone-1` … `cone-6` | interacao | D4: escolher 2 pontos em volta da poça; `cone-1` e `cone-2` (lado de quem vem pela faixa) têm `certo: true` |
| `caio` | npc | Entra pela abertura, vindo da direita, e para perto da Renata |
| `prancheta` | interacao | D10 (balcão da janela da sala dos líderes) |
| `saida` | saida | Abertura do guarda-corpo, à direita: ao passar, já vai para o posto (bloqueada pela fita até o D11) |

Colisões: estantes, extintores, lixeiras, parede do fundo, guarda-corpo, sala dos líderes, máquina, carrinhos. A poça ganha colisão depois de isolada. Oclusores: montantes da frente das estantes.

## posto (Cap. 5, 6 e 7) — posto do Jonas

Continuação da parte B: corredor de empilhadeira e faixa de pedestre à esquerda (com a saída de emergência no fim da faixa), guarda-corpo com abertura, área das máquinas à direita. Máquina do Jonas (centro de usinagem com portas azuis), unidade hidráulica com mangueira, esteira e carrinho de cavaco, tapete, bancada com caixas azuis, máquina vizinha, pilar com extintor A, painel elétrico, carrinho na área demarcada, estante com caixas, extintor B.

| Ponto | Tipo | O que acontece |
| --- | --- | --- |
| `chegada` | chegada | Faixa de pedestre, embaixo |
| `renata` | npc | Na frente da bancada |
| `diego` | npc | Chega pela faixa no Cap. 6 e para perto da bancada |
| `maquina` | interacao | Cap. 7: ligar a máquina (o sinaleiro acende verde, efeito no código) |
| `risco-oleo` | objeto + toque | `riscos/oleo-pingando.png` na mangueira |
| `risco-extintor` | objeto + toque | `riscos/caixas-extintor.png` na frente do extintor A |
| `risco-operador` | objeto + toque | `figurantes/operador-sem-protetor.png` no tapete da máquina vizinha |
| `risco-pedestre` | objeto + toque | `figurantes/pedestre-celular.png` no corredor de empilhadeira |
| `risco-cabo` | objeto + toque | `riscos/cabo.png` atravessando a abertura |
| `risco-painel` | objeto + toque | `riscos/painel-aberto.png` por cima do painel |
| `risco-saida` | objeto + toque | `riscos/pallets-saida.png` na frente da saída de emergência |
| `falso-carrinho` | toque | Carrinho na área demarcada (já no fundo) |
| `falso-extintor` | toque | Extintor B sinalizado e livre (já no fundo) |
| `falso-estante` | toque | Caixas organizadas na estante (já no fundo) |

Os objetos de risco só aparecem nos Cap. 5 e 6 e somem no Cap. 7. Na inspeção, a câmera afasta para mostrar o posto inteiro; cada área de toque tem no mínimo 32 px.

Colisões: guarda-corpo, máquinas, unidade hidráulica, esteira e carrinho de cavaco, bancada, pilar, carrinho, estante, extintor B, parede, painel. Oclusores: parte de cima das máquinas.

## Transições entre mapas

Toda troca de mapa: fade preto de 300 ms, pensamento da transição (quando o roteiro tiver um), carregamento do próximo mapa e chegada no ponto `chegada`.
