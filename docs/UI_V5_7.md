# FUTSTANCY V5.7 — Artes de sistemas

## Objetivo
Trocar os banners genéricos e repetitivos por oito artes editoriais de futebol.

## Sistemas ilustrados
- Perfil: treinador diante do estádio, ciano.
- Mercado: contrato e bola, ouro/ciano.
- Pacotes: envelope futurista, turquesa.
- Time: quadro tático, verde/ciano.
- Partidas: palco PvP, azul/roxo.
- Ranking: troféu e estádio, dourado.
- Recompensas: moedas em destaque, dourado.
- Clube e Ajuda: fachada de estádio e escudo fictício, azul.

Os títulos ilustrativos ficam na imagem; valores reais, moedas e estatísticas são
exibidos separadamente nos componentes do Discord. Botões e seletores permanecem funcionais.

Os JPGs têm resolução 800×200 e ficam em assets/ui/v57/.
scripts/render_ui_banners.py gera os arquivos; a automação
.github/workflows/ui-banners.yml publica automaticamente após merge à main.

## Regras preservadas
- As cartas aprovadas em assets/editions/ não foram alteradas.
- Coleção, ficha de cartas e galeria de artes não recebem banners extras.
- Imagens de jogadores do time e mercado aparecem em galeria separada.
- Nenhuma arte contém moedas, OVR, resultados ou rankings inventados.
- A interface continua com Discord Components V2, botões e atualização no mesmo painel.
- Comando slash /fut; prefixo de texto S via Gateway.

## Publicação
É preciso concluir a Action de publicação de JPGs e atualizar o Worker da Cloudflare.
Uma Action de teste aprovada não é um deploy; confirme /health e a exibição no Discord.