# FUTSTANCY — BIBLIOTECA VISUAL v4

- **75** imagens de edições de jogador em `assets/editions/<jogador>/<edicao>.jpg`.
- **53** artes individuais completas liberadas. As outras **22** prévias recortadas permanecem arquivadas no repositório, mas foram removidas da galeria e de todos os sorteios.
- **61** artes de interface e conceitos em `assets/showcase/`.
- Os arquivos antigos em `assets/cards/` foram preservados apenas como histórico. **Não são usados em nenhuma tela nem como fallback**, pois apresentam foto recortada sobre uma moldura genérica.

## Integração
- `/fut obter`, `/fut pacote`, `/fut colecao`, `/fut mercado` e `/fut time` utilizam as edições individuais quando disponíveis.
- `/fut artes` permite consultar todos os lotes e os designs em 2 seções, com botões de paginação.
- Retratos sem edição individual aproveitável mantêm o cartão anterior.
- Cada carta na coleção e no mercado segue os dados da base D1; a imagem não altera nome, raridade, OVR, preço nem inventário.
- O exemplo gráfico de perfil e outros conceitos com números ilustrativos **não** são exibidos como se fossem resultados reais.

## Limitações
- As notas, times e escudos desenhados pelo gerador podem estar incorretos; **não** usar como fonte de atributos do jogo.
- É necessário revisar permissões de marcas, escudos e imagens de atletas antes de uso comercial.
- Cartas `cropped_preview` não são mostradas no bot; a galeria apresenta apenas artes completas. Jogadores sem uma arte individual aprovada são apresentados apenas em texto, preservando suas cartas e atributos.
- A publicação na Cloudflare precisa ser confirmada depois que o GitHub Actions passar.
