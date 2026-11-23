# FUTSTANCY V5 — Pacotes de raridade

## Artes e lotes

A biblioteca possui 75 imagens classificadas por nome da edição: Comum, Prata, Ouro, Premium, Ícone, Lendário e Eclipse. Destas, 53 são cartas individuais completas e entram nos sorteios. As 22 prévias/recortes continuam disponíveis somente no `/fut artes`. As 9 Premium existentes são prévias, portanto a loja ainda não oferece um pacote Premium.

Os nomes de arquivos existentes não são alterados. Cartas alternativas do mesmo atleta são edições independentes. O overall do atleta é um atributo separado da raridade visual: uma edição comum de um atleta de OVR alto é uma carta comum.

## Pacotes de 3 cartas

| Tipo | Preço em coins | Regra |
| --- | ---: | --- |
| Misto | 900 | Raridade sorteada por carta |
| Comum | 450 | 100% Comum |
| Prata | 900 | 100% Prata |
| Ouro | 2100 | 100% Ouro |
| Ícone | 4500 | 100% Ícone |
| Lendário | 8500 | 100% Lendário |
| Eclipse | 12500 | 100% Eclipse |

Chance por carta no Misto: Comum 55%, Prata 22%, Ouro 12%, Ícone 7%, Lendário 3% e Eclipse 1%. Uma vez escolhida a raridade, cada arte completa daquela categoria tem a mesma chance. Duplicatas podem ocorrer.

## Persistência e migração

A migração `0002_card_editions.sql` adiciona `edition` e `tier` com valor-padrão `legado`, preservando dados anteriores. Cada carta adquirida na V5 passa a ter esses dados gravados por ID. A transferência de propriedade no mercado não altera a edição.

**Ordem segura de publicação:** faça backup do D1, aplique a migração ao banco remoto, confira a tabela `cards`, implante o Worker novo, verifique `/health` e teste no Discord os fluxos `/fut obter`, `/fut pacote`, `/fut colecao`, `/fut time`, `/fut mercado` e `/fut comprar`. Atualizar só o código antes da migração pode causar erro nas consultas.

O deploy automático pela GitHub Actions não está ativado nesta atualização; o pull request não publica o Worker.
