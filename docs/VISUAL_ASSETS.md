# FUTSTANCY — BIBLIOTECA VISUAL v4

- **75** imagens de edições de jogador em `assets/editions/<jogador>/<edicao>.jpg`.
- **53** artes individuais e **22** recortes de montagem (prévia de baixa resolução).
- **61** artes de interface e conceitos em `assets/showcase/`.
- Todas as imagens originais pré-existentes foram preservadas em `assets/cards/` e `assets/ui/`.

## Integração
- `/s obter`, `/s pacote`, `/s colecao`, `/s mercado` e `/s time` utilizam as edições individuais quando disponíveis.
- `/s artes` permite consultar todos os lotes e os designs em 2 seções, com botões de paginação.
- Retratos sem edição individual aproveitável mantêm o cartão anterior.
- Cada carta na coleção e no mercado segue os dados da base D1; a imagem não altera nome, raridade, OVR, preço nem inventário.
- O exemplo gráfico de perfil e outros conceitos com números ilustrativos **não** são exibidos como se fossem resultados reais.

## Limitações
- As notas, times e escudos desenhados pelo gerador podem estar incorretos; **não** usar como fonte de atributos do jogo.
- É necessário revisar permissões de marcas, escudos e imagens de atletas antes de uso comercial.
- Cartas `cropped_preview` são mostradas somente na galeria de artes.
- A publicação na Cloudflare precisa ser confirmada depois que o GitHub Actions passar.
