# FUTSTANCY V5.9 — Perfil dinâmico e cartas originais no time

## /fut perfil
- Imagem PNG 1024×1250 produzida pelo Cloudflare Worker em /art/profile.png.
- Nome e avatar são consultados ao Discord REST em cada geração (preferência por nick/avatar de servidor, depois nome/avatar globais).
- Sem token/acesso REST, o Worker utiliza dados recebidos na interação assinada. Sem avatar disponível, exibe silhueta neutra.
- Moedas, partidas, vitórias, empates, derrotas, aproveitamento, gols e OVR são calculados das tabelas users e lineup no D1 a cada solicitação.
- Melhor titular é o de maior OVR escalado, com edição completa aprovada quando disponível.
- A imagem é informativa: nenhum botão desenhado dentro do PNG.
- Os botões nativos são Atualizar, Time, Coleção e Mercado, que editam a mesma mensagem pública e validam o dono.
- Cada abertura/refresh usa nova URL com parâmetro rev para evitar cache antigo. Mensagens que não forem atualizadas permanecem com a imagem anterior, sem atualização em segundo plano.

## /fut time
- Cartas de assets/editions/ renderizadas inteiras com SVG preserveAspectRatio=xMidYMid meet, sem cortar o jogador nem adicionar moldura ou retângulo sobre a carta.
- Etiquetas de posição e nomes são elementos externos à arte.
- Vagas e jogadores sem arte completa usam marcador neutro, sem reutilizar imagens antigas.
- Campo 4-3-3 preserva as ações e adiciona acesso ao perfil.
- Chave de cache atualizada para v59.

## Arquivos
- src/profile-image.ts: nome/avatar e PNG com dados D1.
- src/profile-ui.ts: imagem e botões nativos.
- src/squad-image.ts: miniaturas originais completas.
- src/handler.ts, src/index.ts, src/deferred.ts: fluxo e atualização no mesmo painel.
- tests/profile.test.ts e tests/squad.test.ts: validação.

## Publicação
Sem migrações D1 novas. Merge no GitHub não publica o Worker sem configuração Cloudflare. Após publicação, confirme /health versão 5.9.0 e teste /fut perfil, Atualizar e /fut time no Discord.

## Hotfix V5.9.1 — imagem quebrada no Discord
- O gerador 4-3-3 tenta manter as miniaturas originais. Quando uma delas causar falha no renderizador PNG, o Worker repete a renderização sem as imagens JPEG incorporadas, **mantendo o gramado, os nomes, os OVRs e os titulares**; não retorna uma imagem quebrada nesses casos.
- A resposta contém o cabeçalho X-Futstancy-Image-Mode: full ou fallback. Se o modo for fallback, a resposta não é colocada em cache para que uma próxima atualização possa restabelecer as miniaturas.
- A URL do campo ganhou chave v591 para invalidar a imagem anterior que o Discord tentou carregar.
- No perfil, se o titular de maior OVR não tem uma carta individual aprovada, o painel usa sua **foto original do catálogo** quando disponível. Não altera o inventário nem cria uma carta nova.
- Não foi possível consultar logs privados do Cloudflare a partir do GitHub. Este hotfix é preventivo: um deploy seguido de teste real no Discord continua necessário.
