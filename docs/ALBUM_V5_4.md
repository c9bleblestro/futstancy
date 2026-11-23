# FUTSTANCY V5.4 — Álbum interativo de cartas

## Referência estética
A coleção foi reorganizada a partir do conceito de álbum/pokedex enviado pelo usuário, mas com identidade própria de futebol. Não copia as cartas, desenhos nem a marca do outro bot.

## O que mudou no /s colecao e Scolecao
- Agora mostra 8 artes individuais reais por página na grade Media Gallery do Discord, no lugar de 6 cartas seguidas de um bloco enorme de nomes e IDs.
- O cabeçalho usa o estilo FUTSTANCY e um painel azul-turquesa. A grade vem antes do texto.
- O resumo mostra quantidade de exemplares, atletas distintos descobertos e progresso real em relação ao catálogo de 60 jogadores; legado conta para o progresso.
- Uma lista de seleção nativa permite escolher qualquer uma das 8 cartas e abrir sua ficha individual.
- Outro menu nativo filtra por Comum, Prata, Ouro, Ícone, Lendário, Eclipse, Clássica ou Todas.
- Botões: anterior, próxima página, mercado e galeria de artes.
- A ficha mostra arte vinculada à edição, nome, posição, OVR, país, raridade, edição, situação e ID único.
- Na ficha, selecionar vaga compatível escala o jogador. O botão de anunciar abre formulário com preço (100–200000 coins), cobrando 5% quando vendida.
- Checagem de proprietário impede que outro membro opere cartas de terceiros; venda/escalação reutilizam as validações existentes no D1.
- Cartas repetidas continuam como exemplares próprios e podem ser selecionadas por seus IDs; progressão conta atletas distintos.

## Sobre o que não mudou
- Pacotes, raridades, coins, disputa de partidas, mercado e banco D1 permanecem como estavam.
- Não foi criado álbum com cartas não descobertas ou arte estática simulando a coleção de alguém.
- Não altera as imagens dos jogadores, apenas o modo de apresentá-las.
- O código usa componentes Discord V2 (Container, Media Gallery, Select Menus, Buttons e modal de preço com Label).

## Publicação
Esta versão está no pull request #2, branch `feat/v5-rarity-packs`. Ainda precisa de merge, migração D1 e publicação do Worker na Cloudflare para aparecer aos membros do Discord. O push sozinho não faz deploy.