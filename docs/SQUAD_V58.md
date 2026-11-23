# FUTSTANCY 5.8 — Campo tático do /fut time

## O que realmente foi implementado

- O comando `/fut time` exibe um painel público com um único campo tático 4-3-3, gerado pelo Worker a partir do lineup do membro no Cloudflare D1.
- Rota `GET /art/squad.png?user=<discord-id>&rev=...`, PNG 1024×1350 gerado via Resvg, com 11 miniaturas de cartas individuais aprovadas, nomes, OVR e posições sobre o gramado.
- A imagem não é um mockup estático. Cada solicitação busca os titulares reais. A chave `rev` muda quando a escalação muda, renovando o cache do Discord.
- Posições visuais: GOL, LE, ZAG, ZAG, LD, MC, MEI, MC, PE, ATA, PD. **Compatibilidade do jogo permanece por categorias GOL / ZAG / MEI / ATA**. LE e LD são rótulos táticos, sem inventar uma categoria nova no banco.
- Cartas sem arte completa aprovada recebem placeholder elegante no campo. Nenhuma carta antiga de moldura recortada é usada.
- O campo mostra OVR médio dos titulares escalados, 11 vagas e status de time completo.

## Controles em uma única mensagem

- `Gerenciar`: seleção nativa das 11 vagas e depois seleção paginada de até 20 cartas compatíveis, ordenadas por OVR, raridade e data.
- `Auto`: escala o melhor time possível com os dados reais e mantém os titulares compatíveis. Falhas aparecem de forma privada.
- `Resumo`: força do time, três maiores OVRs, menor OVR e vagas vazias. Não inventa química nem capitão.
- `Coleção`: abre o álbum existente e tem botão de volta ao time.
- `Ver titular`: seleciona a vaga ocupada e mostra a ficha individual da carta, seu ID/edição e um botão para substituí-la.
- Se duas cartas já escaladas de mesma posição forem trocadas entre slots, os titulares são permutados sem deixar uma vaga vazia.
- Botões e selects geram ACK rápido e editam a mensagem original pelo webhook do Discord; o painel é público, mas só o dono executa alterações. Outros usuários recebem erro privado.
- Há somente 11 slots; outras formações não foram habilitadas, para não alterar indevidamente o banco e a física do jogo.

## Arquitetura

- `src/squad-layout.ts`: coordenadas e mapeamento tático.
- `src/squad-image.ts`: PNG renderizado com cartas aprovadas e placeholders.
- `src/squad-ui.ts`: painéis e seletores por posição/carta.
- `src/handler.ts`: integração de `/fut time` com IDs `team:*`.
- `src/storage.ts`: troca segura dos titulares.
- `src/game.ts`: autoescalonar por OVR, raridade e aquisição.
- `src/deferred.ts`: ACK imediato para botões e selects do time.

## Publicação

Não altera banco, não precisa de nova migração D1. Precisa publicar Worker 5.8 na Cloudflare; GitHub Actions apenas validam o código e o build. Depois teste `/fut time` no Discord, confira imagem do campo e experimente `Gerenciar`, `Auto`, `Resumo`, `Ver titular` e `Coleção` no celular.