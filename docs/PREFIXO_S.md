# FUTSTANCY V5.3 — prefixo S real no Discord

## Como usar

Mensagens comuns no canal (sem barra): `Siniciar`, `Sobter`, `Sdaily`, `Sajuda`, `Scolecao`, `Stime`, `Sauto`, `Sranking`, `Sperfil`, `Sartes`.

Com argumentos: `Spacote ouro`, `Spacote lendário`, `Scolecao prata`, `Smercado icone`, `Sescalar <ID-da-carta> 9`, `Sdesafiar @membro`, `Svender <ID> 1500`, `Scomprar <codigo>`, `Scancelar <codigo>`. Espaço após o S também é aceito: `S pacote ouro`, `S obter`.

Os slash commands continuam funcionando (`/s obter`, `/s pacote`, etc.). A resposta a uma mensagem comum é uma mensagem pública do bot, não ephemeral. O Gateway responde à mensagem do usuário com os mesmos painéis Components V2.

## Por que o prefixo não funcionava

Cloudflare Workers com endpoints de interações recebem slash commands e botões, mas **não recebem automaticamente MESSAGE_CREATE** de mensagens normais. Para usar prefixos de texto é necessário estar conectado ao Discord Gateway por WebSocket. A versão V5.3 acrescenta um processo Node.js para essa conexão e um endpoint HTTPS autenticado no Worker, reutilizando exatamente o mesmo código de inventário, economia e partidas.

## Configuração necessária (só no seu painel; não enviar secrets pelo chat)

1. No Discord Developer Portal → Applications → seu bot → Bot, ative **Message Content Intent** (privileged intent). Aplicações maiores podem precisar de aprovação do Discord. O bot precisa de `View Channel`, `Send Messages` e `Read Message History` nos canais em que você quer usar o prefixo.
2. Faça backup do banco D1. Na Cloudflare, **aplique as migrações 0002 e 0003 antes de publicar o novo Worker**, usando `npm run db:remote` no ambiente com Wrangler autenticado. O comando `npm run deploy` foi corrigido para migrar antes de publicar.
3. Na Cloudflare, configure `PREFIX_GATEWAY_SECRET` como secret com uma string aleatória de pelo menos 32 caracteres. Mantenha os secrets Discord existentes. Publique o Worker da branch atualizada e confira `/health` (versão 5.3.0). O endpoint protegido é `/prefix/execute`.
4. Crie um serviço **persistente Node.js** (Railway, Render com worker em execução, VPS ou equivalente) com o **mesmo repositório**. Configure o start command `npm run gateway:start` (ou `npm start`), Node 22 ou superior. O serviço não precisa expor porta HTTP: ele abre conexão WebSocket de saída para o Discord.
5. No serviço Gateway, defina **três variáveis secretas**: `DISCORD_BOT_TOKEN` (token do mesmo bot), `PREFIX_GATEWAY_SECRET` (idêntico ao da Cloudflare), `FUTSTANCY_WORKER_URL` (URL HTTPS completa do Worker com `/prefix/execute` no fim, ex.: `https://SEU-WORKER.workers.dev/prefix/execute`). Configure-as somente nos respectivos painéis.
6. Confira os logs do Gateway: ele deve anunciar `[PREFIX] Gateway conectado como ...; prefixo S ativado`. No canal do Discord, teste `Sajuda`, `Siniciar`, `Sobter`, `Scolecao` e `S pacote comum`.

## Segurança e funcionamento

- O Gateway recebe apenas eventos `MESSAGE_CREATE` de servidores, ignora bots e verifica primeiro se a mensagem começa com S e um subcomando válido. Não armazena mensagens comuns.
- Usa autorização HTTPS compartilhada com o Worker. Sem secret correto, o endpoint responde HTTP 401; sem configuração, HTTP 503.
- O Worker transforma comandos de texto em chamadas ao mesmo handler usado pelos slash commands. Os dados continuam no D1.
- A migração `0003_text_prefix.sql` guarda IDs de mensagens processadas para impedir execução duplicada (por exemplo duas cobranças por um mesmo evento). Para tentar de novo, envie uma **nova mensagem**.
- As respostas seguem `Components V2` e preservam os botões de coleção, compra, convites e galeria.
- A resposta à mensagem de texto é **pública**, porque respostas ephemeral são exclusivas de interações Discord.

## Solução de problemas

- **Slash funciona, prefixo não:** confirme que o Gateway está online, Message Content Intent ativo e o token pertence ao bot correto.
- **Gateway conecta, mas não responde:** confira `FUTSTANCY_WORKER_URL`, a secret nos dois serviços, a migração 0003 e permissões do canal.
- **Erro 401:** secret divergente.
- **Erro 503:** Worker sem `PREFIX_GATEWAY_SECRET`.
- **Erro 500:** verifique logs do Worker e migrações D1 (0002 e 0003).
- **Discord HTTP 403:** o bot não pode enviar respostas no canal.
- **O mesmo comando não responde pela segunda vez:** envie nova mensagem (cada MESSAGE_CREATE tem ID próprio; mensagens já processadas não são reexecutadas).

## Testes

Use `npm install`, `npm run typecheck`, `npm test`, `npm run gateway:check`, `npx wrangler deploy --dry-run`. Esses testes verificam código; **não substituem uma sessão real com Gateway hospedado no Discord**.