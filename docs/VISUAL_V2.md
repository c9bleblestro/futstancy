# Futstancy — atualização visual v1.1

Esta atualização preserva os comandos, o banco Cloudflare D1 e os elencos existentes.

## Componentes V2
Todas as respostas de comando utilizam Text Display (tipo 10), Media Gallery (tipo 12) e Action Rows (tipo 1), com flag 32768. Os embeds antigos e suas barras laterais coloridas foram substituídos.

## Artes de jogo
As cartas, banners, campo de escalação e placares são gerados como PNG por um renderizador WebAssembly compatível com Cloudflare Workers, sem inserir imagens estáticas de demonstração com preços ou dados falsos.

- `/art/player.png?k=vinicius` — card com OVR, posição, nome, raridade e fotografia quando disponível
- `/art/banner.png?t=FUTSTANCY&s=FUTEBOL` — banner genérico
- `/art/team.png?slots=...` — campo do time com slots de escalação
- `/art/score.png?sh=2&sa=1` — imagem de placar

As fotos são resolvidas automaticamente da miniatura pública das páginas da Wikipédia, hospedadas no Wikimedia Commons. Caso a imagem não esteja disponível ou a rasterização falhe, há fallback de foto ou mensagem de indisponibilidade. Não usamos artes das cartas ou logos proprietários da EA SPORTS FC ou eFootball.

### Direitos e atribuições
As fotos da Wikimedia Commons podem ter licenças diferentes e exigir crédito ao fotógrafo, link da licença e registro de modificações. Para disponibilizar o projeto amplamente, é importante consultar a página do arquivo original de cada retrato e cumprir essas condições. O código usa um catálogo de nomes de artigos e não baixa nem redistribui um pacote de imagens proprietárias.

Os designs são artes originais inspiradas em jogos de futebol. Os OVRs são avaliações fictícias do Futstancy, não notas oficiais de outro jogo.

## Hospedagem
A integração atual continua no Cloudflare Workers + D1. O novo pacote `@cf-wasm/resvg` gera PNG. Uma fonte Lato de código aberto é carregada do repositório Google Fonts durante a inicialização do renderizador. O cache da Cloudflare armazena imagens PNG geradas.

### Verificação pós-deploy
1. Abra `https://futstancy.likeparaopeixe.workers.dev/health` e procure `"version":"1.1.0"`.
2. Abra `https://futstancy.likeparaopeixe.workers.dev/art/player.png?k=vinicius` e confirme que aparece uma imagem.
3. Use `/fut obter`, `/fut colecao`, `/fut time` e `/fut mercado` no Discord.
4. Se alguma imagem não carregar, consulte **Cloudflare → Worker → Observability → Logs** e procure `[ART]` ou `[ART PLAYER]`. Isso é diferente do log de build.

O status do Worker em `/health` indica acessibilidade da API, mas não prova que o renderizador de imagens está funcionando: teste também a rota `/art/player.png`.

O sistema continua sendo um MVP. O resultado não reproduz pixel a pixel os conceitos gerados para apresentação e as fotos podem variar conforme o artigo da Wikipédia. As cartas e telas devem ser refinadas com screenshots reais de teste.
