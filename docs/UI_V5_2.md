# FUTSTANCY — Sistema visual V5.2

## Interface
- Container Discord Components V2 (tipo 17), com barra de cor adaptada ao comando.
- Cabeçalho de marca consistente, hierarquia de texto, informações legíveis e botões funcionais.
- Coleção e perfil em violeta; mercado e elenco em ciano; pacotes em dourado/violeta; conquista em verde; erros em vermelho; cooldown em âmbar.
- Visual das três cartas por pacote, de cada carta no inventário e dos titulares usa URLs reais das edições salvo no banco.
- Banners genéricos de status, perfil, ranking e ajuda foram retirados para não ocultar informações e não sugerir números fictícios.

## Telas
- /s ajuda: agrupado por começo, cartas, equipe, partidas e mercado.
- /s iniciar: 11 titulares, saldo inicial e próximos passos.
- /s obter: carta, raridade, OVR, edição e ID.
- /s daily: recompensa e saldo atual.
- /s pacote: catálogo por raridade, preço, total de cartas, odds e abertura.
- /s colecao e /s artes: cartões reais, filtros e paginação.
- /s time, /s auto e /s escalar: estrutura 4-3-3, escalação e ações.
- /s desafiar: adversários, força dos clubes, prazo e botões.
- /s perfil e /s ranking: estatísticas reais do banco D1.
- /s mercado, /s vender, /s comprar, /s cancelar: compra, venda, taxa e confirmação.

## Segurança e compatibilidade
- Sem embeds antigos; somente Components V2, com no máximo 10 filhos diretos por Container e 40 componentes por mensagem.
- Até 10 artes por galeria; até 11 fotos do time são paginadas em duas galerias.
- Os nomes, notas, moedas, resultados e IDs vêm dos dados reais do jogo, nunca de prints ou artes ilustrativas.
- Preserve o banco D1 e as cartas existentes. A migração V5 precisa ser executada antes da publicação no Worker.

## Publicação
Estas alterações existem na branch feat/v5-rarity-packs do GitHub. O sistema só chegará ao Discord após migração, deploy do Worker e conferência visual no servidor.