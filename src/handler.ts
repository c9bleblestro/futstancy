import { getPlayer, playerLabel, drawPlayer } from './catalog.ts';
import { SLOT_POSITION, PACK_COST, timeRemaining, teamStrength } from './game.ts';
import { account, start, claim, daily, collectionPage, lineup, lineupPlayers, autoLineup, setSlot, createChallenge, resolveChallenge, openPack, marketPage, listCard, buyCard, cancelListing, leaderboard } from './storage.ts';
import { card, message, update, rows, button, GOLD, GREEN, ERROR, PURPLE } from './ui.ts';
import type { Env, Interaction, Option } from './types.ts';

const help = [
  '🎟️ **/fut iniciar** — clube + 11 jogadores iniciais',
  '🎁 **/fut obter** — carta grátis a cada 25 min',
  '💰 **/fut daily** — 350 coins a cada 20h',
  '📦 **/fut pacote** — 3 cartas por 900 coins',
  '🗂️ **/fut colecao** — cartas e seus IDs',
  '📋 **/fut time** — escalação titular 4-3-3',
  '⚙️ **/fut auto** — melhor escalação automática',
  '🔄 **/fut escalar** — trocar um titular pelo ID',
  '⚔️ **/fut desafiar** — partida com outro membro',
  '🛒 **/fut mercado** — jogadores à venda',
  '🏷️ **/fut vender** — anuncie carta fora do time',
  '🪙 **/fut comprar** — compre pelo código',
  '🚫 **/fut cancelar** — retire seu anúncio',
  '🏆 **/fut ranking** / **/fut perfil** — resultados',
].join('\n');

function getOption(options: Option[], name: string): string | number | undefined {
  return options.find(x => x.name === name)?.value;
}
function actorId(i: Interaction): string | null { return i.member?.user?.id ?? i.user?.id ?? null; }
const tag = (id: string) => `<@${id}>`;
const needStart = () => card('⚽ Primeiro, crie seu clube', 'Use **/fut iniciar** para receber seus 11 jogadores e começar com 1.500 coins.');

async function showCollection(env: Env, owner: string, page: number) {
  const data = await collectionPage(env.DB, owner, page);
  const safePage = Math.min(Math.max(0, page), data.pages - 1);
  const lines = data.cards.map((row, index) => {
    const p = getPlayer(row.player_key);
    return `${safePage * 6 + index + 1}. ${p ? playerLabel(p) : row.player_key}\n    ID: \`${row.id}\``;
  });
  return card('🗂️ Sua coleção', `${lines.join('\n\n') || 'Nenhuma carta encontrada.'}\n\n**${data.total} cartas** · Página ${safePage + 1}/${data.pages}`, PURPLE, true,
    rows([
      button('◀ Anterior', `col:${owner}:${safePage - 1}`, 2, safePage === 0),
      button('Próxima ▶', `col:${owner}:${safePage + 1}`, 2, safePage >= data.pages - 1),
    ]));
}

async function showTeam(env: Env, owner: string) {
  const all = await lineup(env.DB, owner);
  const players = lineupPlayers(all);
  const lines = SLOT_POSITION.map((pos, index) => {
    const row = all.find(e => e.slot === index + 1);
    const p = row && getPlayer(row.player_key);
    return `**${index + 1}. ${pos}** · ${p ? `${p.name} (${p.ovr} OVR)` : 'Vaga vazia'}`;
  });
  return card('⚽ Sua equipe — 4-3-3', `${lines.join('\n')}\n\n**Força total:** ${players ? teamStrength(players) + ' OVR' : 'Incompleta'}\n\nTroque titulares com **/fut escalar**, ou use **Autoescalação**.`, PURPLE, true,
    rows([button('⚙️ Autoescalar', `auto:${owner}`, 1)]));
}

async function showMarket(env: Env) {
  const listings = await marketPage(env.DB);
  if (!listings.length) return card('🛒 Mercado de transferências', 'Sem cartas anunciadas. Use **/fut vender** para ser o primeiro vendedor.', GOLD, false);
  const text = listings.map((l, i) => {
    const player = getPlayer(l.player_key);
    return `**${i + 1}.** ${player ? playerLabel(player) : 'Jogador'}\n💰 **${l.price.toLocaleString('pt-BR')} coins** · Código: \`${l.id}\``;
  }).join('\n\n');
  return card('🛒 Mercado de transferências', `${text}\n\nClique em **Comprar** ou use **/fut comprar**. A venda cobra taxa de 5% do vendedor.`, GOLD, false,
    rows(listings.map((l, i) => button(`Comprar ${i + 1}`, `buy:${l.id}`, 3))));
}

export async function handleInteraction(i: Interaction, env: Env): Promise<object> {
  const uid = actorId(i);
  if (!uid) return message('Não consegui identificar seu usuário do Discord.', true);

  if (i.type === 3) {
    const id = i.data?.custom_id ?? '';
    if (id.startsWith('col:')) {
      const [, owner, page] = id.split(':');
      if (uid !== owner) return message('Essa coleção pertence a outro jogador.', true);
      return showCollection(env, uid, Number(page) || 0);
    }
    if (id.startsWith('auto:')) {
      if (uid !== id.slice(5)) return message('Esse time não é seu.', true);
      const ok = await autoLineup(env.DB, uid);
      return ok ? showTeam(env, uid) : message('Você precisa ter 1 GOL, 4 ZAG, 3 MEI e 3 ATA na coleção.', true);
    }
    if (id.startsWith('match:')) {
      const [, action, matchId] = id.split(':');
      if (!['accept', 'decline'].includes(action) || !/^[a-f0-9]{16}$/.test(matchId ?? '')) return message('Convite inválido.', true);
      const r = await resolveChallenge(env.DB, matchId, uid, action === 'accept');
      if (r.state === 'recusado') return update('🚫 Desafio recusado', 'O adversário recusou a partida.', ERROR);
      if (r.state === 'concluído' && r.match) {
        return update('🏟️ FIM DE JOGO',
          `${tag(r.match.home_id)} **${r.match.score_home} × ${r.match.score_away}** ${tag(r.match.away_id)}\n\n⭐ Força: ${r.powerHome} vs. ${r.powerAway}\n🪙 Vitória: 180 coins · Empate: 80 coins · Derrota: 40 coins\n\nVeja a classificação em **/fut ranking**!`, GREEN);
      }
      return message(`❌ ${r.state}`, true);
    }
    if (id.startsWith('buy:')) return handleBuy(env, uid, id.slice(4));
    return message('Esse botão não pertence ao Futstancy.', true);
  }

  if (i.type !== 2 || i.data?.name !== 'fut') return message('Comando não reconhecido.', true);
  if (!i.guild_id) return message('Use o Futstancy em um servidor do Discord.', true);
  const opt = i.data.options?.[0];
  const action = opt?.name ?? 'ajuda';
  const args = opt?.options ?? [];

  if (action === 'ajuda') return card('⚽ FUTSTANCY — Guia do treinador', help, PURPLE, false);
  if (action === 'iniciar') {
    const made = await start(env.DB, uid);
    return made
      ? card('🎉 Seu clube nasceu!', 'Você recebeu **11 jogadores titulares**, a formação **4-3-3** e **1.500 coins**!\n\nUse **/fut time** para conhecer o elenco e **/fut obter** para ganhar sua próxima carta.', GREEN, false)
      : card('⚽ Clube já criado', 'Você já tem um clube. Use **/fut time**, **/fut colecao** ou **/fut perfil** para continuar.');
  }
  if (action === 'ranking') {
    const top = await leaderboard(env.DB);
    const out = top.map((a, n) => `**${n + 1}º** ${tag(a.user_id)} — **${a.wins * 3 + a.draws} pts** (${a.wins}V/${a.draws}E/${a.losses}D)`).join('\n');
    return card('🏆 Ranking global de clubes', out || 'Ninguém jogou ainda. Seja o primeiro!', GOLD, false);
  }
  if (action === 'mercado') return showMarket(env);

  const me = await account(env.DB, uid);
  if (!me) return needStart();

  if (action === 'perfil') {
    const games = me.wins + me.draws + me.losses;
    return card('🪪 Seu perfil de treinador', `${tag(uid)}\n\n🪙 **${me.coins.toLocaleString('pt-BR')} coins**\n⚔️ Partidas: **${games}**\n🏆 Vitórias: **${me.wins}**\n🤝 Empates: **${me.draws}**\n❌ Derrotas: **${me.losses}**\n⚽ Gols: **${me.goals_for}** feitos · **${me.goals_against}** sofridos\n📊 Pontos: **${me.wins * 3 + me.draws}**`);
  }
  if (action === 'obter') {
    const player = drawPlayer();
    const result = await claim(env.DB, uid, player);
    return result.ok ? card('🎁 Jogador contratado!', `${playerLabel(player)}\n🌍 ${player.country}\n🆔 ID da carta: \`${result.cardId}\`\n\nPróxima carta em **25 minutos**.`, player.ovr >= 90 ? GOLD : PURPLE, false)
      : card('⏳ Aguarde para obter outra carta', `Faltam **${timeRemaining(result.left)}** para o próximo jogador.`, ERROR);
  }
  if (action === 'daily') {
    const result = await daily(env.DB, uid);
    return result.ok ? card('💰 Recompensa diária!', `Você ganhou **350 coins**!\nSaldo: **${result.coins.toLocaleString('pt-BR')}** coins`, GOLD, false)
      : card('⏳ Daily indisponível', `Volte em **${timeRemaining(result.left)}**. Seu saldo: **${result.coins.toLocaleString('pt-BR')} coins**.`);
  }
  if (action === 'pacote') {
    const result = await openPack(env.DB, uid);
    return result.ok ? card('📦 Pacote aberto!', `Você gastou **${PACK_COST} coins** e recebeu:\n\n${result.players.map(p => playerLabel(p)).join('\n')}\n\nVeja seus IDs em **/fut colecao**.`, GOLD, false)
      : card('💸 Saldo insuficiente', `Você precisa de **${PACK_COST} coins**. Use **/fut daily** ou ganhe partidas.`, ERROR);
  }
  if (action === 'colecao') return showCollection(env, uid, 0);
  if (action === 'time') return showTeam(env, uid);
  if (action === 'auto') {
    const success = await autoLineup(env.DB, uid);
    return success ? showTeam(env, uid) : message('Faltam jogadores para completar o 4-3-3 (1 GOL, 4 ZAG, 3 MEI, 3 ATA).');
  }
  if (action === 'escalar') {
    const id = String(getOption(args, 'id') ?? '').trim();
    const slot = Number(getOption(args, 'vaga'));
    if (!/^[a-f0-9]{16}$/.test(id)) return message('ID inválido. Copie o ID de **/fut colecao**.');
    return message(await setSlot(env.DB, uid, id, slot));
  }
  if (action === 'desafiar') {
    const opponent = String(getOption(args, 'membro') ?? '');
    if (!/^\d{15,22}$/.test(opponent) || uid === opponent) return message('Escolha um adversário válido diferente de você.');
    const other = await account(env.DB, opponent);
    if (!other) return message('Seu adversário ainda não criou um clube com **/fut iniciar**.');
    const [myLineup, theirLineup] = await Promise.all([lineup(env.DB, uid), lineup(env.DB, opponent)]);
    const home = lineupPlayers(myLineup);
    const away = lineupPlayers(theirLineup);
    if (!home || !away) return message('Os dois jogadores precisam de 11 titulares válidos. Use **/fut auto**.');
    const match = await createChallenge(env.DB, uid, opponent);
    return card('⚔️ Desafio Futstancy!', `${tag(uid)} desafiou ${tag(opponent)} para uma partida!\n\n🏆 **${teamStrength(home)} OVR vs ${teamStrength(away)} OVR**\n⏱️ Convite válido por **15 minutos**.\n\nApenas o desafiado pode aceitar.`, GOLD, false,
      rows([button('⚽ Aceitar desafio', `match:accept:${match.id}`, 3), button('❌ Recusar', `match:decline:${match.id}`, 4)]));
  }
  if (action === 'vender') {
    const id = String(getOption(args, 'id') ?? '');
    const price = Number(getOption(args, 'preco'));
    if (!/^[a-f0-9]{16}$/.test(id)) return message('ID de carta inválido. Consulte **/fut colecao**.');
    const result = await listCard(env.DB, uid, id, price);
    return result.ok ? card('🏷️ Carta anunciada!', `Preço: **${price.toLocaleString('pt-BR')} coins**\nCódigo: \`${result.id}\`\n\nTaxa de venda: **5%**. Para cancelar: **/fut cancelar**.`, GREEN, true)
      : message('Não foi possível anunciar. Verifique se a carta é sua, não está escalada e ainda não está no mercado.');
  }
  if (action === 'comprar') return handleBuy(env, uid, String(getOption(args, 'codigo') ?? ''));
  if (action === 'cancelar') {
    const ok = await cancelListing(env.DB, uid, String(getOption(args, 'codigo') ?? ''));
    return message(ok ? '✅ Anúncio cancelado! A carta está disponível novamente.' : '❌ Código inválido ou anúncio não é seu/foi encerrado.');
  }
  return message('Comando não encontrado. Use **/fut ajuda**.');
}

async function handleBuy(env: Env, uid: string, id: string) {
  if (!/^[a-f0-9]{16}$/.test(id)) return message('Código de anúncio inválido.');
  if (!await account(env.DB, uid)) return needStart();
  const result = await buyCard(env.DB, uid, id);
  return result.ok
    ? card('✅ Transferência concluída!', `Você contratou **${result.player?.name ?? 'jogador'}** por **${result.price?.toLocaleString('pt-BR')} coins**!\nA carta entrou na sua coleção.`, GREEN)
    : card('❌ Compra não realizada', 'Confira seu saldo, se o anúncio ainda está disponível e se você não está tentando comprar sua própria carta.', ERROR);
}
