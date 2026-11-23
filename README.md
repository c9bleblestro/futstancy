# ⚽ FUTSTANCY — futebol no Discord

**Bot independente do Savage:** comandos slash funcionam via Cloudflare Workers + D1. Para reconhecer mensagens comuns com prefixo S, o projeto inclui um serviço Discord Gateway persistente, que precisa ficar online numa hospedagem Node.js. O Worker e o Gateway compartilham a lógica do jogo.

> Estado do projeto: **MVP funcional de código**, pronto para configurar e publicar. Ainda não está conectado a um aplicativo Discord nem implantado na Cloudflare. Não inclua tokens em arquivos versionados. O Gateway precisa de processo persistente; o Worker Cloudflare é serverless.

## Slash `/fut` e prefixo de texto S

Agora há **dois formatos de comando**. Para usar mensagens normais no canal, escreva `Siniciar`, `Sobter`, `Sdaily`, `Spacote ouro`, `Scolecao`, `Smercado prata`, `Sdesafiar @membro` ou `Sajuda`. Também aceita espaço, como `S obter` ou `S pacote ouro`. O formato slash `/fut iniciar` continua disponível.

**Importante:** o prefixo só recebe mensagens quando **o Gateway Node.js está hospedado e conectado ao Discord**, e o Worker Cloudflare está atualizado. É obrigatório habilitar **Message Content Intent** no Discord Developer Portal → Bot. Um push ao GitHub não inicia esse receptor automaticamente.

Consulte **[docs/PREFIXO_S.md](docs/PREFIXO_S.md)** para ativação, secrets e hospedagem.
## 📚 V5.5 — Álbum público e interação sem mensagens duplicadas

Os comandos slash voltaram para **`/fut`**; S é exclusivo de mensagens normais (`Sobter`, `Scolecao`). As respostas principais são públicas, e botões/menus editam o painel original (callback UPDATE_MESSAGE) em vez de criar outra mensagem. Erros de permissão continuam privados para proteger o painel do dono.

## 📚 V5.4 — Álbum de jogadores

O comando **`/fut colecao`** (e `Scolecao` quando o Gateway estiver ativado) agora exibe um **álbum interativo com 8 cartas por página**. O visual tem uma grade de imagens, progresso real de atletas descobertos, seletor de cartas e filtro de raridade. A lista extensa de IDs foi removida da tela principal.

Selecionar uma carta abre sua ficha individual com arte, edição, ID e status; dela é possível escalar o jogador ou anunciar uma carta disponível. O mercado mantém o preço fixo e a taxa de 5%. A interface foi inspirada pelo formato de álbum enviado como referência, mas possui identidade própria FUTSTANCY.

Detalhes e restrições em [docs/ALBUM_V5_4.md](docs/ALBUM_V5_4.md).

## 📦 V5 — Loja de pacotes por raridade

A biblioteca original inclui **75 imagens** (53 completas jogáveis e 22 prévias arquivadas e ocultas); apenas as completas alimentam os pacotes **Comum (450), Prata (900), Ouro (2.100), Ícone (4.500), Lendário (8.500), Eclipse (12.500)** e **Misto (900)**, sempre com 3 cartas. Todos os valores em coins.

No Misto, as chances por carta são: **55% Comum, 22% Prata, 12% Ouro, 7% Ícone, 3% Lendário e 1% Eclipse**. Pacotes específicos garantem sua raridade. Artes Premium (recortadas) não são sorteadas. Cartas repetidas podem vir.

Use `/fut pacote` para ver a loja, `/fut pacote tipo:...` para comprar diretamente, `/fut colecao raridade:...` para filtrar seu inventário e `/fut artes` para navegar pelos lotes separados por raridade.

**Migrações obrigatórias:** antes de implantar o Worker V5.3, aplique `migrations/0002_card_editions.sql` e `migrations/0003_text_prefix.sql` no banco D1 (por exemplo via `npm run db:remote`). As cartas antigas mantêm os mesmos IDs, donos e saldos, sendo marcadas com raridade/edição `legado`. Não implante o Worker novo antes da migração.

## O que existe na primeira versão

| Comando | Funcionalidade |
| --- | --- |
| `/fut iniciar` | Cria clube e entrega **11 titulares** e 1.500 coins |
| `/fut obter` | Ganha uma carta aleatória a cada **25 minutos** |
| `/fut daily` | Resgata **350 coins** a cada **20 horas** |
| `/fut pacote` | Loja de **7 pacotes** (Misto + 6 raridades), com 3 cartas por abertura |
| `/fut colecao` | Inventário com filtro de raridade, edições persistentes e IDs próprios |
| `/fut time` | Equipe 4-3-3, posição por posição e overall |
| `/fut auto` | Escala automaticamente os melhores jogadores por posição |
| `/fut escalar` | Troca manualmente um titular usando ID e posição |
| `/fut desafiar` | PvP por botões Aceitar/Recusar, força influencia resultado, recompensa em coins |
| `/fut perfil` | Vitórias, derrotas, empates, gols e coins |
| `/fut ranking` | Pontuação global (3 por vitória, 1 por empate) |
| `/fut mercado` | Lista as cartas à venda com botão de compra |
| `/fut vender` | Anuncia carta fora da escalação por 100–200.000 coins |
| `/fut comprar` | Compra por código de anúncio; taxa de 5% na venda |
| `/fut cancelar` | Retira anúncio próprio, sem custo |
| `/fut ajuda` | Guia do bot |

São **60 atletas** no catálogo, com OVR **inventado exclusivamente para este jogo**. A V5 usa imagens completas próprias, armazenando a edição e a raridade em cada carta. Os recortes são exibidos somente na galeria; a interface utiliza Components V2.

As coleções, moedas, resultados e transferências ficam no Cloudflare D1, compartilhados pelos servidores onde o bot for instalado.

## 📱 Colocar online pelo Android, sem terminal

**Antes:** o código precisa estar no repositório `c9bleblestro/futstancy` no GitHub. Se você recebeu um ZIP, primeiro extraia-o e envie **os arquivos e pastas**, não o arquivo `.zip` fechado, para o repositório. A estrutura deve ter `package.json`, `wrangler.jsonc`, `src/` e `migrations/` na raiz.

1. Entre em **https://discord.com/developers/applications**, clique em **New Application** e crie **Futstancy**. Em **General Information**, copie **Application ID** e **Public Key**. Na aba **Bot**, gere e copie o **Token**. Não envie o token em mensagens ou GitHub.
2. Entre em **https://dash.cloudflare.com** → **Workers & Pages** → **Create** → **Import a repository**. Conecte o GitHub e selecione `c9bleblestro/futstancy`.
3. A configuração `wrangler.jsonc` define o Worker e o banco **D1**. A Cloudflare pode provisionar o banco automaticamente na primeira implantação. Se o formulário pedir comandos: **Build command:** vazio ou `npm run typecheck`; **Deploy command:** `npm run deploy`; instalação de dependências: `npm install`.
4. Na Cloudflare, abra seu Worker → **Settings → Variables and Secrets** e adicione três secrets: `DISCORD_PUBLIC_KEY` (Public Key), `DISCORD_APPLICATION_ID` (Application ID) e `DISCORD_BOT_TOKEN` (Bot Token). Cole os valores somente no painel da Cloudflare. Confira se a publicação está com o D1 vinculado e se a migração criou as tabelas (o script de deploy executa `wrangler d1 migrations apply DB --remote`).
5. A Cloudflare criará uma URL parecida com `https://futstancy.SEUSUBDOMINIO.workers.dev`. Abra `/health` para testar a API. No **Discord Developer Portal → General Information**, cole a URL acrescentando **`/interactions`** no campo **Interactions Endpoint URL** e salve. Discord envia PING e o Worker valida a assinatura criptográfica.
6. Em **Discord Developer Portal → Installation**, configure **Guild Install** com os escopos **`applications.commands` e `bot`**. Para o prefixo em texto, conceda **View Channels, Send Messages e Read Message History**. Ative **Message Content Intent** em **Bot**. Gere o link de instalação, abra no celular e adicione ao servidor.
7. Os slash commands serão registrados automaticamente durante a validação da URL **se os três secrets já estiverem configurados**. Caso contrário, a tarefa agendada tentará registrar a cada **15 minutos** até obter sucesso. O registro global pode levar algum tempo para aparecer no Discord.
8. No servidor use **`/fut iniciar`** e depois **`/fut desafiar`** para testar com um segundo usuário.

**Repositório oficial:** https://github.com/c9bleblestro/futstancy

**Importante:** as atualizações do repositório serão publicadas automaticamente se você ativar **Workers Builds** com a branch principal. O banco D1 permanece como serviço separado e não deve ser destruído em atualizações.

## Desenvolvedor / testes

```bash
npm install
npm run typecheck
npm test
npm run db:local
npm run dev
```

Deploy com o Wrangler já autenticado:

```bash
npm run deploy
npm run gateway:start  # execute separadamente em hospedagem Node persistente
```

- `src/index.ts`: endpoint, assinatura Ed25519, PING, agendamento de registro de comandos.
- `src/handler.ts`: comandos e botões.
- `src/storage.ts`: operação atômica de moedas, mercado, elencos e partidas.
- `src/catalog.ts`: jogadores e OVR fictícios do jogo.
- `src/game.ts`: posição, sorteio e simulador de partidas.
- `migrations/0001_init.sql`: tabelas do D1.
- `tests/`: testes de lógica, banco SQLite e segurança do endpoint.

## Segurança / limitações

- **Nunca** publique Bot Token, chaves privadas, credenciais D1 ou `.dev.vars` no GitHub. A Public Key do Discord, isoladamente, é pública, mas o Bot Token é secreto.
- O endpoint de interação usa assinatura **Ed25519** e timestamp para rejeitar requisições forjadas.
- Coins, leilões, escalações e desafios têm validações no banco; SQLite/D1 executa os batches de operação em transação.
- Não armazena tokens pessoais de usuários; utiliza somente os IDs do Discord, dados de clube e partidas.
- O serviço Gateway lê somente mensagens comuns de servidores que iniciam com um comando reconhecido pelo prefixo S. Ignora mensagens de bots e não acessa voz.
- **Fase 2 sugerida:** cartas ilustradas originais, formações alternativas, campeonatos automáticos, temporadas e dashboard.
- O deploy na Cloudflare, a ativação do Message Content Intent e a hospedagem do Gateway requerem configurações e credenciais próprias; um push ao GitHub não os executa.

Você pode administrar o projeto pelo celular. O Worker pode caber nas cotas gratuitas da Cloudflare; o receptor de mensagens com Gateway exige um serviço Node.js persistente, que pode ter custo de hospedagem.
