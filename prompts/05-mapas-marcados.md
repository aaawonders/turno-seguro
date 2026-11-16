# Tarefa 05 — Usar os mapas já marcados

Releia **AGENTS.md** e **docs/MAPAS.md** (principalmente a seção "Convenções do `mapa.json`").

## Contexto

Os 7 `mapa.json` foram marcados à mão e já estão em `public/assets/mapas/<area>/mapa.json`, no formato do Tiled. **O editor (`?editor=1`) deixa de ser o caminho principal:** não precisa melhorar nem terminar o editor. Ele pode ficar como está, só para debug, desde que não quebre o build.

## O que fazer

1. **Leitor de mapas:** confirme que o `MapaTiled.ts` lê esses arquivos (camadas `caminhavel`, `colisao`, `oclusores`, `pontos`; a propriedade `tipo` e as opcionais `raio`, `bloqueado` e `certo` de cada ponto; o `name` dos objetos de colisão).
2. **Colisões com nome:** quando um ponto é liberado (passo `liberar` do roteiro), remova todas as colisões cujo nome é igual ao nome do ponto ou começa com `<nome do ponto>-`. Exemplos: liberar `catraca` remove `catraca-1`, `catraca-2` e `catraca-3`; liberar `catraca-facial` remove `catraca-facial`.
3. **Pontos com raio:** o balão "!" e a interação usam o `raio` de cada ponto (padrão 24 px). Pontos `pensamento` disparam uma vez ao entrar no raio. Pontos `saida` trocam de mapa ao entrar no raio, se não estiverem bloqueados.
4. **Mudanças de fluxo em relação ao texto anterior** (já refletidas em docs/MAPAS.md):
   - **Portaria:** a chegada é pela abertura da frente (rua); o speaker fica do lado da chegada; a saída é a passagem da parede esquerda, depois das catracas.
   - **Corredor-b:** a saída é a abertura do guarda-corpo; ao entrar nela (depois do D11), vai direto para o posto.
5. **Conferência visual:** com `?debug=1`, percorra os 7 mapas e confira se o personagem (em escala 2) não atravessa móveis e se cada ponto fica onde o docs/MAPAS.md descreve. Se algum ponto estiver claramente fora do lugar, ajuste o `mapa.json` (só coordenadas) e liste o que mudou.

## Critérios de aceite

- [ ] Os 7 mapas carregam com colisão real, sem cair no fallback.
- [ ] Na portaria, as 3 catracas bloqueiam até o diálogo com o Sr. Antônio e liberam juntas depois.
- [ ] Na recepção, a catraca facial libera a passagem para a porta embaixo da escada.
- [ ] `npm run build` sem erros de TypeScript.
