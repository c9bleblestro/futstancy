import { getPlayer } from './catalog.ts';
import { SLOT_POSITION, timeRemaining, teamStrength } from './game.ts';
import { account, start, claim, daily, collectionPage, lineup, lineupPlayers, autoLineup, setSlot, createChallenge, resolveChallenge, openPack, marketPage, listCard, buyCard, cancelListing, leaderboard } from './storage.ts';
import { card, message, update, rows, button, GOLD, GREEN, ERROR, PURPLE } from './ui.ts';
import { SHOWCASE, type GalleryKind } from './editions.ts';
import { PACKS, PACK_TYPES, PACK_ODDS, TIER_NAMES, GALLERY_TIERS, drawEdition, editionArtUrl, assetArtUrl, galleryArtFiles, tierCount, type PackType } from './packs.ts';
import type { Env, Interaction, Option } from './types.ts';

const help = [
  '🎟️ **/fut iniciar** — clube + 11 jogadores iniciais',
  '🎁 **/fut obter** — carta grátis a cada 25 min',
  '💰 **/fut daily** — 350 coins a cada 20h',
  '📦 **/fut pacote** — loja de pacotes por raridade',
  '🗂️ **/fut colecao** — cartas com filtros de raridade',
  '🎨 **/fut artes** — biblioteca de todos os lotes e designs',
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

const COLLECTION_FILTERS=['todas','comum','prata','ouro','icone','lendario','eclipse','legado'] as const;
const isCollectionTier=(value:string):boolean=>COLLECTION_FILTERS.includes(value as typeof COLLECTION_FILTERS[number]);
const isPackType=(value:string):value is PackType=>Object.hasOwn(PACKS,value);

function showGallery(owner:string,page:number,kind:GalleryKind,tier='todas') {
  const selected=GALLERY_TIERS.includes(tier as typeof GALLERY_TIERS[number])?tier:'todas';
  const files=kind==='cards'?galleryArtFiles(selected as Parameters<typeof galleryArtFiles>[0]):SHOWCASE;
  const pages=Math.max(1,Math.ceil(files.length/6));
  const safe=Math.min(Math.max(0,Math.trunc(page)||0),pages-1);
  const heading=kind==='cards'?'Cartas · '+(TIER_NAMES[selected]??'Todas'):'Designs';
  const title='🎨 Galeria de artes — '+heading+' '+(safe+1)+'/'+pages;
  const info=kind==='cards'
    ? 'Lotes separados por raridade. Recortes são apenas prévias e não entram em pacotes; o jogo só entrega artes completas.'
    : 'Conceitos de interface. Os preços, saldos e resultados nas prévias são ilustrativos.';
  const controls=[
    button('◀ Anterior','art:'+owner+':'+kind+':'+selected+':'+(safe-1),2,safe===0),
    button('Próxima ▶','art:'+owner+':'+kind+':'+selected+':'+(safe+1),1,safe===pages-1),
    button(kind==='cards'?'Ver designs':'Ver cartas','art:'+owner+':'+(kind==='cards'?'designs':'cards')+':todas:0',2),
  ];
  if(kind==='cards') controls.push(button('Todas','art:'+owner+':cards:todas:0'),
    ...GALLERY_TIERS.map(t=>button(TIER_NAMES[t],'art:'+owner+':cards:'+t+':0')));
  return card(title,info,PURPLE,true,rows(controls),files.slice(safe*6,safe*6+6).map(assetArtUrl));
}

async function showCollection(env:Env,owner:string,page:number,tier='todas'){
  const selected=isCollectionTier(tier)?tier:'todas';
  const data=await collectionPage(env.DB,owner,page,selected);
  const safe=Math.min(Math.max(0,page),data.pages-1);
  const lines=data.cards.map((c,index)=>{
    const p=getPlayer(c.player_key);
    const name=p?p.name+' · '+p.pos+' · '+p.ovr+' OVR':c.player_key;
    return (safe*6+index+1)+'. **'+name+'** · **'+(TIER_NAMES[c.tier]??c.tier)+'**\n  Edição: '+
      c.edition.replace(/_/g,' ')+' · ID: '+String.fromCharCode(96)+c.id+String.fromCharCode(96);
  });
  const controls=[
    button('◀ Anterior','col:'+owner+':'+selected+':'+(safe-1),2,safe===0),
    button('Próxima ▶','col:'+owner+':'+selected+':'+(safe+1),2,safe>=data.pages-1),
    ...COLLECTION_FILTERS.map(t=>button(TIER_NAMES[t],'col:'+owner+':'+t+':0')),
  ];
  return card('🗂️ Sua coleção · '+TIER_NAMES[selected],
    (lines.join('\n\n')||'Nenhuma carta nesta raridade.')+'\n\n**'+data.total+' cartas** · Página '+(safe+1)+'/'+data.pages,
    PURPLE,true,rows(controls),data.cards.map(c=>editionArtUrl(c.player_key,c.edition)).filter(Boolean));
}

async function showTeam(env:Env,owner:string) {
  const all=await lineup(env.DB,owner);
  const players=lineupPlayers(all);
  const lines=SLOT_POSITION.map((pos,index)=>{
    const c=all.find(x=>x.slot===index+1),p=c?getPlayer(c.player_key):null;
    return '**'+(index+1)+'. '+pos+'** · '+(p?p.name+' ('+p.ovr+' OVR) · '+(TIER_NAMES[c?.tier??'legado']??'Clássica'):'Vaga vazia');
  });
  const description=lines.join('\n')+'\n\n**Força total:** '+(players?teamStrength(players)+' OVR':'Incompleta')+
    '\n\nTroque titulares com **/fut escalar** ou use a autoescalação.';
  return card('⚽ Sua equipe — 4-3-3',description,PURPLE,true,rows([button('⚙️ Autoescalar','auto:'+owner,1)]),
    [...all].sort((a,b)=>a.slot-b.slot).map(c=>editionArtUrl(c.player_key,c.edition)).filter(Boolean));
}

async function showMarket(env:Env,tier='todas') {
  const selected=isCollectionTier(tier)?tier:'todas';
  const listings=await marketPage(env.DB,selected);
  const filters=COLLECTION_FILTERS.map(t=>button(TIER_NAMES[t],'mkt:'+t));
  if(!listings.length)return card('🛒 Mercado · '+TIER_NAMES[selected],
    'Nenhuma carta anunciada nesta raridade. Use **/fut vender** para anunciar uma carta.',GOLD,false,rows(filters),[]);
  const content=listings.map((l,i)=>{
    const p=getPlayer(l.player_key);
    return '**'+(i+1)+'.** '+(p?p.name+' · '+p.ovr+' OVR':'Jogador')+' · **'+(TIER_NAMES[l.tier]??l.tier)+
      '**\n💰 **'+l.price.toLocaleString('pt-BR')+' coins** · Código: '+String.fromCharCode(96)+l.id+String.fromCharCode(96);
  }).join('\n\n');
  return card('🛒 Mercado · '+TIER_NAMES[selected],
    content+'\n\nUse **Comprar** ou **/fut comprar**. Taxa de 5% cobrada do vendedor.',
    GOLD,false,rows([...listings.map((l,i)=>button('Comprar '+(i+1),'buy:'+l.id,3)),...filters]),
    listings.map(l=>editionArtUrl(l.player_key,l.edition)).filter(Boolean));
}

function showPacks(owner:string,coins:number){
  const lines=PACK_TYPES.map(t=>{
    const p=PACKS[t];
    const pool=t==='misto'?'todas as raridades':tierCount(t).full+' artes completas';
    return '**'+p.label+'** — **'+p.cost.toLocaleString('pt-BR')+' coins** · '+p.description+' · '+pool;
  });
  const odds=PACK_ODDS.map(o=>TIER_NAMES[o.tier]+' '+o.percent+'%').join(' · ');
  return card('📦 Loja de pacotes por raridade',
    'Saldo: **'+coins.toLocaleString('pt-BR')+' coins**\nCada pacote dá **3 cartas** exclusivamente da raridade escolhida (exceto Misto).\n\n'+
    lines.join('\n')+'\n\n**Chances por carta no Misto:** '+odds+
    '\n\nPremium ainda possui somente prévias e não é sorteado. Você pode receber exemplares repetidos.',
    GOLD,true,rows(PACK_TYPES.map(t=>button('Abrir '+TIER_NAMES[t],'pack:'+owner+':'+t,3,PACKS[t].cost>coins))),[]);
}

function showOpenedPack(type:PackType,result:Awaited<ReturnType<typeof openPack>>){
  const lines=result.cards.map(c=>'• **'+c.player.name+'** · '+c.player.pos+' · '+c.player.ovr+' OVR · '+TIER_NAMES[c.tier]+
    '\n  Edição: '+c.edition.replace(/_/g,' ')+' · ID: '+String.fromCharCode(96)+c.id+String.fromCharCode(96));
  return card('📦 '+PACKS[type].label+' aberto!',
    'Você gastou **'+result.cost.toLocaleString('pt-BR')+' coins** e recebeu:\n\n'+lines.join('\n\n')+
    '\n\nCada edição e arte fica salva no seu inventário. Veja **/fut colecao**.',
    GOLD,false,[],result.cards.map(c=>editionArtUrl(c.player.key,c.edition)));
}

export async function handleInteraction(i: Interaction, env: Env): Promise<object> {
  const uid = actorId(i);
  if (!uid) return message('Não consegui identificar seu usuário do Discord.', true);

  if (i.type === 3) {
    const id = i.data?.custom_id ?? '';
    if (id.startsWith('col:')) {
      const [,owner,part3,part4]=id.split(':');
      if(uid!==owner)return message('Essa coleção pertence a outro jogador.',true);
      const tier=part4===undefined?'todas':part3;
      const page=Number(part4===undefined?part3:part4);
      if(!isCollectionTier(tier))return message('Filtro de raridade inválido.',true);
      return showCollection(env,uid,Number.isFinite(page)?page:0,tier);
    }
    if(id.startsWith('art:')) {
      const [,owner,kind,part4,part5]=id.split(':');
      if(uid!==owner)return message('Esta galeria pertence a outro jogador.',true);
      if(kind!=='cards'&&kind!=='designs')return message('Categoria inválida.',true);
      const tier=part5===undefined?'todas':part4;
      const page=Number(part5===undefined?part4:part5);
      return showGallery(uid,Number.isFinite(page)?page:0,kind,tier);
    }
    if(id.startsWith('pack:')) {
      const [,owner,type]=id.split(':');
      if(owner!==uid)return message('Esta loja pertence a outro jogador.',true);
      if(!isPackType(type))return message('Pacote inválido.',true);
      if(!await account(env.DB,uid))return needStart();
      const result=await openPack(env.DB,uid,type);
      if(!result.ok)return message('Saldo insuficiente. O pacote '+PACKS[type].label+' custa '+PACKS[type].cost.toLocaleString('pt-BR')+' coins.',true);
      return showOpenedPack(type,result);
    }
    if(id.startsWith('mkt:')) {
      const tier=id.slice(4);
      if(!isCollectionTier(tier))return message('Filtro inválido.',true);
      return showMarket(env,tier);
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
  if (action === 'artes') return showGallery(uid,0,'cards');
  if (action === 'ranking') {
    const top = await leaderboard(env.DB);
    const out = top.map((a, n) => `**${n + 1}º** ${tag(a.user_id)} — **${a.wins * 3 + a.draws} pts** (${a.wins}V/${a.draws}E/${a.losses}D)`).join('\n');
    return card('🏆 Ranking global de clubes', out || 'Ninguém jogou ainda. Seja o primeiro!', GOLD, false);
  }
  if (action === 'mercado') return showMarket(env,String(getOption(args,'raridade')??'todas'));

  const me = await account(env.DB, uid);
  if (!me) return needStart();

  if (action === 'perfil') {
    const games = me.wins + me.draws + me.losses;
    return card('🪪 Seu perfil de treinador', `${tag(uid)}\n\n🪙 **${me.coins.toLocaleString('pt-BR')} coins**\n⚔️ Partidas: **${games}**\n🏆 Vitórias: **${me.wins}**\n🤝 Empates: **${me.draws}**\n❌ Derrotas: **${me.losses}**\n⚽ Gols: **${me.goals_for}** feitos · **${me.goals_against}** sofridos\n📊 Pontos: **${me.wins * 3 + me.draws}**`);
  }
  if(action==='obter') {
    const drop=drawEdition('misto');
    const result=await claim(env.DB,uid,drop.player,drop.edition);
    return result.ok
      ? card('🎁 Jogador contratado!','**'+drop.player.name+'** · '+drop.player.pos+' · '+drop.player.ovr+' OVR\n'+
          '**'+TIER_NAMES[drop.tier]+'** · Edição: '+drop.edition.replace(/_/g,' ')+
          '\n🌍 '+drop.player.country+'\n🆔 ID: '+String.fromCharCode(96)+result.cardId+String.fromCharCode(96)+
          '\n\nPróxima carta em **25 minutos**.',GOLD,false,[],[editionArtUrl(drop.player.key,drop.edition)])
      : card('⏳ Aguarde para obter outra carta','Faltam **'+timeRemaining(result.left)+'** para o próximo jogador.',ERROR);
  }
  if (action === 'daily') {
    const result = await daily(env.DB, uid);
    return result.ok ? card('💰 Recompensa diária!', `Você ganhou **350 coins**!\nSaldo: **${result.coins.toLocaleString('pt-BR')}** coins`, GOLD, false)
      : card('⏳ Daily indisponível', `Volte em **${timeRemaining(result.left)}**. Seu saldo: **${result.coins.toLocaleString('pt-BR')} coins**.`);
  }
  if(action==='pacote') {
    const requested=getOption(args,'tipo');
    if(requested===undefined)return showPacks(uid,me.coins);
    const type=String(requested);
    if(!isPackType(type))return message('Tipo de pacote inválido.',true);
    const result=await openPack(env.DB,uid,type);
    return result.ok?showOpenedPack(type,result):
      card('💸 Saldo insuficiente','Pacote '+PACKS[type].label+': **'+PACKS[type].cost.toLocaleString('pt-BR')+
        ' coins** necessários.\nUse **/fut daily** ou jogue partidas.',ERROR);
  }
  if(action==='colecao')return showCollection(env,uid,0,String(getOption(args,'raridade')??'todas'));
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
    ? card('✅ Transferência concluída!',
        'Você contratou **'+(result.player?.name??'jogador')+'** · '+(TIER_NAMES[result.tier??'legado']??'Clássica')+
        ' por **'+result.price?.toLocaleString('pt-BR')+' coins**!\nA carta manteve sua edição original e entrou na coleção.',
        GREEN,true,[],result.player?[editionArtUrl(result.player.key,result.edition??'legado')]:[])
    : card('❌ Compra não realizada','Confira o saldo, se o anúncio ainda existe e se a carta não é sua.',ERROR);
}
