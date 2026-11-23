import { getPlayer, PLAYERS } from './catalog.ts';
import { COMMAND_ROOT } from './commands.ts';
import { SLOT_POSITION, timeRemaining, teamStrength } from './game.ts';
import { account, start, claim, daily, collectionPage, ALBUM_PAGE_SIZE, lineup, lineupPlayers, autoLineup, setSlot, createChallenge, resolveChallenge, openPack, marketPage, listCard, buyCard, cancelListing, leaderboard } from './storage.ts';
import { card, message, update, rows, button, stringSelect, GOLD, GREEN, ERROR, PURPLE } from './ui.ts';
import { SHOWCASE, type GalleryKind } from './editions.ts';
import { PACKS, PACK_TYPES, PACK_ODDS, PLAYABLE_ARTS, TIER_NAMES, GALLERY_TIERS, drawEdition, editionArtUrl, assetArtUrl, galleryArtFiles, tierCount, type PackType } from './packs.ts';
import type { Env, Interaction, Option } from './types.ts';

const help = [
  '-# Prefixo: **Sobter**, **Spacote ouro**, **Scolecao**  ·  Slash: **/s obter**',
  '### 🎮 COMEÇAR A JOGAR',
  '**/s iniciar**  ›  Crie seu clube com 11 jogadores e 1.500 coins',
  '**/s obter**  ›  Carta gratuita a cada 25 minutos',
  '**/s daily**  ›  Receba 350 coins a cada 20 horas',
  '',
  '### ✨ CARTAS E PACOTES',
  '**/s pacote**  ›  Loja com 7 pacotes de raridades',
  '**/s colecao**  ›  Suas cartas e edições permanentes',
  '**/s artes**  ›  Galeria dos lotes e designs',
  '',
  '### ⚽ CLUBE E PARTIDAS',
  '**/s time**  ›  Veja os 11 titulares do 4-3-3',
  '**/s auto**  ›  Monte o melhor time disponível',
  '**/s escalar**  ›  Troque um titular pelo ID da carta',
  '**/s desafiar**  ›  Jogue contra outro membro',
  '**/s perfil**  ›  Estatísticas e saldo do treinador',
  '**/s ranking**  ›  Os 10 melhores clubes',
  '',
  '### 💠 TRANSFERÊNCIAS',
  '**/s mercado**  ›  Cartas anunciadas',
  '**/s vender**  ›  Venda cartas fora do time',
  '**/s comprar**  ›  Contrate pelo código do anúncio',
  '**/s cancelar**  ›  Cancele um anúncio próprio',
].join('\n');

function getOption(options: Option[], name: string): string | number | undefined {
  return options.find(x => x.name === name)?.value;
}
function actorId(i: Interaction): string | null { return i.member?.user?.id ?? i.user?.id ?? null; }
const tag = (id: string) => `<@${id}>`;
const needStart = () => card('⚽ Primeiro, crie seu clube', 'Use **/s iniciar** para receber seus 11 jogadores e começar com 1.500 coins.');

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

const ALBUM_FILTERS:readonly {value:string;label:string}[]=[
  {value:'todas',label:'Todas as cartas'},
  {value:'comum',label:'Comum'},
  {value:'prata',label:'Prata'},
  {value:'ouro',label:'Ouro'},
  {value:'icone',label:'Ícone'},
  {value:'lendario',label:'Lendário'},
  {value:'eclipse',label:'Eclipse'},
  {value:'legado',label:'Clássicas'},
];

async function showCollection(env:Env,owner:string,page:number,tier='todas'){
  const selected=isCollectionTier(tier)?tier:'todas';
  const data=await collectionPage(env.DB,owner,page,selected);
  const safe=Math.min(Math.max(0,Number.isFinite(page)?Math.trunc(page):0),data.pages-1);
  const available=(selected==='todas'||selected==='legado')?PLAYERS.length:
    new Set(PLAYABLE_ARTS.filter(a=>a.tier===selected).map(a=>a.player.key)).size;
  const progress=available?Math.min(12,Math.round(data.discovered/available*12)):0;
  const meter=available?'▰'.repeat(progress)+'▱'.repeat(12-progress):'';
  const summary='**'+data.total+' cartas** no inventário  ·  **'+data.discovered+
    (available?'/'+available:'')+' atletas descobertos'+
    '\n'+(available?meter+'   '+Math.min(100,Math.round(data.discovered/available*100))+'%\n':'')+
    '-# '+TIER_NAMES[selected]+'  •  Página '+(safe+1)+'/'+data.pages+
    '  •  '+ALBUM_PAGE_SIZE+' cartas por página\n\n'+
    (data.cards.length?'**Escolha uma carta no menu abaixo** para consultar atributos, ID e ações.':
      'Nenhuma carta nesta categoria. Conquiste cartas com /s obter ou /s pacote.')+
    '\n-# Repetidas contam como cartas, mas não aumentam os atletas descobertos.';
  const pick=data.cards.length?[stringSelect('colview:'+owner+':'+selected+':'+safe,
    '🃏 Escolher carta e abrir detalhes',
    data.cards.map((c,i)=>{
      const player=getPlayer(c.player_key);
      return {label:'#'+String(safe*ALBUM_PAGE_SIZE+i+1).padStart(2,'0')+' · '+(player?.name??'Jogador'),
        value:c.id,
        description:(player?.pos??'--')+' · '+(player?.ovr??'--')+' OVR · '+(TIER_NAMES[c.tier]??c.tier)};
    }))]:[];
  const filter=stringSelect('colfilter:'+owner,'✨ Filtrar por raridade',
    ALBUM_FILTERS.map(item=>({label:item.label,value:item.value,default:item.value===selected})));
  const actions=rows([
    button('◀ Anterior','col:'+owner+':'+selected+':'+(safe-1),2,safe===0),
    button('Próxima página ▶','col:'+owner+':'+selected+':'+(safe+1),1,safe>=data.pages-1),
    button('🛒 Mercado','mkt:todas',2),
    button('🎨 Galeria','art:'+owner+':cards:todas:0',2),
  ]);
  return card('📚 Álbum Futstancy',summary,PURPLE,true,[...pick,filter,...actions],
    data.cards.map(c=>editionArtUrl(c.player_key,c.edition)).filter(Boolean));
}

async function showCollectionCard(env:Env,owner:string,cardId:string,tier='todas',page=0){
  if(!/^[a-f0-9]{16}$/.test(cardId))return message('ID de carta inválido.');
  const row=await env.DB.prepare('SELECT * FROM cards WHERE owner_id=? AND id=?')
    .bind(owner,cardId).first<import('./types.ts').CardRow>();
  if(!row)return message('Esta carta não pertence à sua coleção.');
  const p=getPlayer(row.player_key);
  if(!p)return message('Jogador não está presente no catálogo.');
  const [team,listed]=await Promise.all([
    lineup(env.DB,owner),
    env.DB.prepare("SELECT id FROM market WHERE card_id=? AND seller_id=? AND status='active'")
      .bind(cardId,owner).first<{id:string}>(),
  ]);
  const slot=team.find(c=>c.id===cardId)?.slot;
  const status=listed?'🛒 Anunciada no mercado':slot?'✅ Titular na vaga '+slot:'Disponível';
  const detail='**'+p.name+'**   •   '+p.ovr+' OVR\n'+
    '-# '+p.country+'   |   '+p.pos+'   |   '+(TIER_NAMES[row.tier]??row.tier)+'\n\n'+
    '**EDIÇÃO**   '+row.edition.replace(/_/g,' ')+'\n'+
    '**SITUAÇÃO**   '+status+'\n'+
    '**ID DO EXEMPLAR**\n'+String.fromCharCode(96)+row.id+String.fromCharCode(96)+
    '\n\n-# Esta arte pertence a este exemplar e não muda ao navegar ou negociar.';
  const positions=SLOT_POSITION.flatMap((pos,index)=>pos===p.pos?
    [{label:'Vaga '+(index+1)+' · '+pos,value:String(index+1)}]:[]);
  const place=!listed&&positions.length?
    [stringSelect('colslot:'+owner+':'+cardId+':'+tier+':'+page,
      '⚽ Escolher posição para escalar',positions)]:[];
  const actions=rows([
    button('← Voltar ao álbum','col:'+owner+':'+tier+':'+page,2),
    button('🏷️ Anunciar no mercado','colsell:'+owner+':'+cardId+':'+tier+':'+page,1,Boolean(listed||slot)),
  ]);
  return card('🃏 Ficha da carta',detail,PURPLE,true,[...place,...actions],
    [editionArtUrl(row.player_key,row.edition)]);
}

async function showTeam(env:Env,owner:string){
  const all=await lineup(env.DB,owner);
  const players=lineupPlayers(all);
  const format=(start:number,end:number)=>{
    return Array.from({length:end-start},(_,i)=>{
      const slot=start+i,c=all.find(x=>x.slot===slot+1),p=c?getPlayer(c.player_key):null;
      return String(slot+1).padStart(2,'0')+'.  '+(p?'**'+p.name+'**  ·  '+p.ovr+' OVR':'*Vaga vazia*');
    }).join('\n');
  };
  const description='**FORMAÇÃO 4-3-3**   •   **'+(players?teamStrength(players)+' OVR':'Escalação incompleta')+'**\n\n'+
    '**🧤 GOLEIRO**\n'+format(0,1)+'\n\n'+
    '**🛡️ DEFESA**\n'+format(1,5)+'\n\n'+
    '**🎯 MEIO-CAMPO**\n'+format(5,8)+'\n\n'+
    '**⚡ ATAQUE**\n'+format(8,11)+'\n\n'+
    '-# Altere titulares em /s escalar ou monte seu melhor elenco abaixo.';
  return card('⚽ Seu time titular',description,PURPLE,true,
    rows([button('⚙️ Melhor escalação','auto:'+owner,1)]),
    [...all].sort((a,b)=>a.slot-b.slot).map(c=>editionArtUrl(c.player_key,c.edition)).filter(Boolean));
}

async function showMarket(env:Env,tier='todas'){
  const selected=isCollectionTier(tier)?tier:'todas';
  const listings=await marketPage(env.DB,selected);
  const filters=COLLECTION_FILTERS.map(t=>button(TIER_NAMES[t],'mkt:'+t));
  if(!listings.length)return card('🛒 Mercado de transferências',
    '**NENHUM ANÚNCIO ENCONTRADO**\n\nNão existem cartas à venda na raridade **'+TIER_NAMES[selected]+'**.\n'+
    '-# Quer vender uma carta? Use /s vender.',GOLD,false,rows(filters),[]);
  const content=listings.map((l,i)=>{
    const p=getPlayer(l.player_key);
    return '**'+String(i+1).padStart(2,'0')+'  ·  '+(p?.name??'Jogador')+'**   •   '+(TIER_NAMES[l.tier]??l.tier)+
      '\n-# '+(p?.pos??'---')+'   |   '+(p?.ovr??'—')+' OVR   |   '+l.edition.replace(/_/g,' ')+
      '\n🪙 **'+l.price.toLocaleString('pt-BR')+' coins**   •   '+String.fromCharCode(96)+l.id+String.fromCharCode(96);
  }).join('\n\n');
  return card('🛒 Mercado de transferências',
    '**'+listings.length+' anúncios recentes**   •   Raridade: **'+TIER_NAMES[selected]+'**\n\n'+
    content+'\n\n-# Taxa de 5% cobrada do vendedor. Confira o código antes de comprar.',
    GOLD,false,rows([...listings.map((l,i)=>button('Comprar #'+(i+1),'buy:'+l.id,3)),...filters]),
    listings.map(l=>editionArtUrl(l.player_key,l.edition)).filter(Boolean));
}

function showPacks(owner:string,coins:number){
  const lines=PACK_TYPES.map(t=>{
    const p=PACKS[t];
    const pool=t==='misto'?'raridades variadas':tierCount(t).full+' artes jogáveis';
    return '**'+p.label+'**   •   **'+p.cost.toLocaleString('pt-BR')+' coins**\n'+
      '-# '+p.description+'   ·   '+pool;
  });
  const odds=PACK_ODDS.map(o=>TIER_NAMES[o.tier]+' '+o.percent+'%').join('  ·  ');
  return card('📦 Central de pacotes',
    '**SEU SALDO**   🪙 '+coins.toLocaleString('pt-BR')+' coins'+
    '\n-# Todo pacote contém 3 cartas. Selecione um abaixo para abrir.\n\n'+
    lines.join('\n\n')+'\n\n'+
    '**CHANCES DO MISTO (POR CARTA)**\n-# '+odds+
    '\n\n-# Edições Premium ainda não estão disponíveis nos sorteios. Repetidas são possíveis.',
    GOLD,true,rows(PACK_TYPES.map(t=>button('Abrir '+TIER_NAMES[t],'pack:'+owner+':'+t,PACKS[t].cost<=coins?3:2,PACKS[t].cost>coins))),[]);
}

function showOpenedPack(type:PackType,result:Awaited<ReturnType<typeof openPack>>){
  const lines=result.cards.map((c,i)=>'**'+String(i+1).padStart(2,'0')+'  ·  '+c.player.name+'**\n'+
    '-# '+c.player.pos+'   |   '+c.player.ovr+' OVR   |   '+TIER_NAMES[c.tier]+
    '   •   '+c.edition.replace(/_/g,' ')+
    '\n-# ID: '+String.fromCharCode(96)+c.id+String.fromCharCode(96));
  return card('📦 '+PACKS[type].label+' aberto!',
    '**3 cartas adicionadas à sua coleção.**\n'+
    '🪙 Valor pago: **'+result.cost.toLocaleString('pt-BR')+' coins**\n\n'+
    lines.join('\n\n')+'\n\n-# As edições ficam associadas aos IDs. Veja /s colecao.',
    GOLD,false,[],result.cards.map(c=>editionArtUrl(c.player.key,c.edition)));
}

export async function handleInteraction(i: Interaction, env: Env): Promise<object> {
  const uid = actorId(i);
  if (!uid) return message('Não consegui identificar seu usuário do Discord.', true);

  if(i.type===5 && (i.data?.custom_id??'').startsWith('colprice:')){
    const [,owner,cardId,tier,pageRaw]=(i.data?.custom_id??'').split(':');
    if(uid!==owner)return message('Este anúncio não pertence a você.');
    const rawPrice=i.data?.components?.flatMap(row=>row.components??[])
      .find(input=>input.custom_id==='price')?.value??'';
    if(!/^\d{3,6}$/.test(rawPrice))return message('Informe um valor inteiro de 100 a 200000 coins.');
    const price=Number(rawPrice);
    if(!Number.isInteger(price)||price<100||price>200000)
      return message('O preço deve ficar entre 100 e 200.000 coins.');
    const result=await listCard(env.DB,uid,cardId,price);
    const safePage=Math.max(0,Math.trunc(Number(pageRaw)||0));
    return result.ok
      ? card('✅ Carta anunciada',
          'Seu exemplar está disponível no mercado!\n\n**Preço:** '+price.toLocaleString('pt-BR')+
          ' coins\n**Você receberá:** '+Math.floor(price*0.95).toLocaleString('pt-BR')+
          ' coins\n**Código:** '+String.fromCharCode(96)+result.id+String.fromCharCode(96),
          GREEN,true,rows([button('← Voltar ao álbum','col:'+owner+':'+tier+':'+safePage,2)]),[])
      : message('Não foi possível anunciar. Confira se a carta é sua, não está escalada nem anunciada.');
  }

  if (i.type === 3) {
    const id = i.data?.custom_id ?? '';
    if(id.startsWith('colview:')){
      const [,owner,tier,pageRaw]=id.split(':');
      if(uid!==owner)return message('Essa coleção pertence a outro jogador.',true);
      if(!isCollectionTier(tier))return message('Filtro inválido.',true);
      const cardId=i.data?.values?.[0]??'';
      return showCollectionCard(env,uid,cardId,tier,Math.max(0,Math.trunc(Number(pageRaw)||0)));
    }
    if(id.startsWith('colfilter:')){
      const owner=id.slice('colfilter:'.length);
      if(uid!==owner)return message('Essa coleção pertence a outro jogador.',true);
      const tier=i.data?.values?.[0]??'todas';
      if(!isCollectionTier(tier))return message('Filtro de raridade inválido.',true);
      return showCollection(env,uid,0,tier);
    }
    if(id.startsWith('colslot:')){
      const [,owner,cardId,tier,pageRaw]=id.split(':');
      if(uid!==owner)return message('Essa carta pertence a outro jogador.',true);
      if(!isCollectionTier(tier)||!/^[a-f0-9]{16}$/.test(cardId))
        return message('Carta inválida.',true);
      const slot=Number(i.data?.values?.[0]??'');
      if(!Number.isInteger(slot)||slot<1||slot>11)return message('Posição inválida.',true);
      const result=await setSlot(env.DB,uid,cardId,slot);
      if(!result.startsWith('✅'))return message(result,true);
      return showCollectionCard(env,uid,cardId,tier,Math.max(0,Math.trunc(Number(pageRaw)||0)));
    }
    if(id.startsWith('colsell:')){
      const [,owner,cardId,tier,pageRaw]=id.split(':');
      if(uid!==owner)return message('Essa carta pertence a outro jogador.',true);
      if(!isCollectionTier(tier)||!/^[a-f0-9]{16}$/.test(cardId))
        return message('Carta inválida.',true);
      return {type:9,data:{
        custom_id:'colprice:'+owner+':'+cardId+':'+tier+':'+Math.max(0,Math.trunc(Number(pageRaw)||0)),
        title:'Anunciar carta no mercado',
        components:[{type:1,components:[{
          type:4,custom_id:'price',label:'Preço (100 a 200000 coins)',
          placeholder:'1500',style:1,min_length:3,max_length:6,required:true,
        }]}],
      }};
    }
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
      if(r.state==='concluído'&&r.match) {
        const result=r.match;
        const summary='**MANDANTE**  '+tag(result.home_id)+'\n'+
          '# '+result.score_home+'   ×   '+result.score_away+'\n'+
          '**VISITANTE**  '+tag(result.away_id)+'\n\n'+
          '**⭐ FORÇA DAS EQUIPES**\n'+r.powerHome+' OVR  ×  '+r.powerAway+' OVR\n\n'+
          '🪙 **RECOMPENSAS**\nVitória: 180  ·  Empate: 80  ·  Derrota: 40 coins\n\n'+
          '-# Confira sua posição em /s ranking.';
        return update('🏟️ Resultado da partida',summary,GREEN,[]);
      }
      return message(`❌ ${r.state}`, true);
    }
    if (id.startsWith('buy:')) return handleBuy(env, uid, id.slice(4));
    return message('Esse botão não pertence ao Futstancy.', true);
  }

  if (i.type !== 2 || i.data?.name !== COMMAND_ROOT) return message('Comando não reconhecido.', true);
  if (!i.guild_id) return message('Use o Futstancy em um servidor do Discord.', true);
  const opt = i.data.options?.[0];
  const action = opt?.name ?? 'ajuda';
  const args = opt?.options ?? [];

  if (action === 'ajuda') return card('⚽ FUTSTANCY — Guia do treinador', help, PURPLE, false);
  if(action==='iniciar'){
    const made=await start(env.DB,uid);
    return made
      ? card('🎉 Bem-vindo ao seu clube',
          '**SEU CLUBE ESTÁ PRONTO PARA JOGAR.**\n\n'+
          '🪙 **1.500 coins** de saldo inicial\n'+
          '🃏 **11 cartas** de jogadores\n'+
          '⚽ **4-3-3** já escalado\n\n'+
          '**PRÓXIMOS PASSOS**\n'+
          'Use **/s time** para conhecer os titulares e **/s obter** para ganhar outra carta.',
          GREEN,false)
      : card('⚽ Clube já existente',
          'Sua equipe e seu progresso estão preservados.\n\n'+
          '**/s time**  ›  Titulares\n**/s colecao**  ›  Suas cartas\n**/s perfil**  ›  Saldo e estatísticas.',
          PURPLE,true);
  }
  if (action === 'artes') return showGallery(uid,0,'cards');
  if(action==='ranking'){
    const top=await leaderboard(env.DB);
    const medals=['🥇','🥈','🥉'];
    const entries=top.map((a,n)=>{
      const pts=a.wins*3+a.draws;
      return (medals[n]??('**'+(n+1)+'º**'))+'  '+tag(a.user_id)+
        '\n-# '+pts+' PTS   •   '+a.wins+'V  '+a.draws+'E  '+a.losses+'D';
    });
    return card('🏆 Ranking de clubes',
      '**TABELA GERAL**   •   Top 10 treinadores\n'+
      '-# Vitória +3 pts  ·  Empate +1 pt  ·  Derrota +0 pt\n\n'+
      (entries.join('\n\n')||'Nenhum clube disputou partidas ainda.')+
      '\n\n-# A classificação considera todos os clubes cadastrados no bot.',
      GOLD,false);
  }
  if (action === 'mercado') return showMarket(env,String(getOption(args,'raridade')??'todas'));

  const me = await account(env.DB, uid);
  if (!me) return needStart();

  if(action==='perfil'){
    const games=me.wins+me.draws+me.losses;
    const points=me.wins*3+me.draws;
    const pct=games?Math.round(me.wins/games*100):0;
    return card('🪪 Perfil do treinador',
      '### '+tag(uid)+'\n\n'+
      '**🪙 CARTEIRA**\n'+
      '**'+me.coins.toLocaleString('pt-BR')+' coins** disponíveis\n\n'+
      '**🏟️ DESEMPENHO**\n'+
      '**'+games+'** partidas   •   **'+points+'** pontos   •   **'+pct+'%** de vitórias\n'+
      '🟢 '+me.wins+' vitórias   ⚪ '+me.draws+' empates   🔴 '+me.losses+' derrotas\n\n'+
      '**⚽ ESTATÍSTICAS**\n'+
      me.goals_for+' gols marcados   •   '+me.goals_against+' gols sofridos\n\n'+
      '-# Melhore a equipe com /s colecao e /s time.',
      PURPLE,true);
  }
  if(action==='obter'){
    const drop=drawEdition('misto');
    const result=await claim(env.DB,uid,drop.player,drop.edition);
    return result.ok
      ? card('🎁 Nova contratação!',
          '**'+drop.player.name+'**  ·  **'+drop.player.ovr+' OVR**\n'+
          '-# '+drop.player.pos+'   •   '+drop.player.country+'\n\n'+
          '**'+TIER_NAMES[drop.tier]+'**   ·   Edição: '+drop.edition.replace(/_/g,' ')+
          '\nID: '+String.fromCharCode(96)+result.cardId+String.fromCharCode(96)+
          '\n\n-# Uma nova carta grátis estará disponível em 25 minutos.',
          GOLD,false,[],[editionArtUrl(drop.player.key,drop.edition)])
      : card('⏳ Carta ainda indisponível',
          'Você já recebeu seu jogador gratuito.\n\n'+
          '**PRÓXIMA OBTENÇÃO**\n⏱️ **'+timeRemaining(result.left)+'**\n\n'+
          '-# Use /s colecao para acompanhar seus jogadores.',PURPLE);
  }
  if(action==='daily'){
    const result=await daily(env.DB,uid);
    return result.ok
      ? card('💰 Recompensa resgatada',
          '### +350 coins\nSua recompensa entrou na carteira!\n\n'+
          '**SALDO ATUAL**\n🪙 **'+result.coins.toLocaleString('pt-BR')+' coins**\n\n'+
          '-# Próximo resgate disponível em 20 horas.',GREEN,false)
      : card('⏳ Recompensa indisponível',
          '**PRÓXIMO RESGATE**\n⏱️ '+timeRemaining(result.left)+'\n\n'+
          '**SALDO ATUAL**\n🪙 '+result.coins.toLocaleString('pt-BR')+' coins',PURPLE);
  }
  if(action==='pacote') {
    const requested=getOption(args,'tipo');
    if(requested===undefined)return showPacks(uid,me.coins);
    const type=String(requested);
    if(!isPackType(type))return message('Tipo de pacote inválido.',true);
    const result=await openPack(env.DB,uid,type);
    return result.ok?showOpenedPack(type,result):
      card('💸 Saldo insuficiente','Pacote '+PACKS[type].label+': **'+PACKS[type].cost.toLocaleString('pt-BR')+
        ' coins** necessários.\nUse **/s daily** ou jogue partidas.',ERROR);
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
    if (!/^[a-f0-9]{16}$/.test(id)) return message('ID inválido. Copie o ID de **/s colecao**.');
    return message(await setSlot(env.DB, uid, id, slot));
  }
  if(action==='desafiar'){
    const opponent=String(getOption(args,'membro')??'');
    if(!/^\d{15,22}$/.test(opponent)||uid===opponent)return message('Selecione um adversário válido e diferente de você.');
    const other=await account(env.DB,opponent);
    if(!other)return message('O adversário ainda não criou o clube. Oriente-o a usar /s iniciar.');
    const [myLineup,theirLineup]=await Promise.all([lineup(env.DB,uid),lineup(env.DB,opponent)]);
    const home=lineupPlayers(myLineup),away=lineupPlayers(theirLineup);
    if(!home||!away)return message('Os dois clubes precisam de 11 titulares. Use /s auto.');
    const match=await createChallenge(env.DB,uid,opponent);
    return card('⚔️ Convite para partida',
      '**'+tag(uid)+'**\n### VS\n**'+tag(opponent)+'**\n\n'+
      '**FORÇA DOS CLUBES**\n'+teamStrength(home)+' OVR   ×   '+teamStrength(away)+' OVR\n\n'+
      '⏱️ **15 minutos** para responder\n'+
      '-# Apenas o adversário poderá aceitar ou recusar este duelo.',
      GOLD,false,rows([
        button('⚽ Aceitar partida','match:accept:'+match.id,3),
        button('✕ Recusar','match:decline:'+match.id,4),
      ]),[]);
  }
  if(action==='vender'){
    const id=String(getOption(args,'id')??'');
    const price=Number(getOption(args,'preco'));
    if(!/^[a-f0-9]{16}$/.test(id))return message('ID de carta inválido. Consulte /s colecao.');
    const result=await listCard(env.DB,uid,id,price);
    return result.ok
      ? card('🏷️ Anúncio publicado',
          'Sua carta está disponível no mercado.\n\n'+
          '**PREÇO DE VENDA**   🪙 '+price.toLocaleString('pt-BR')+' coins\n'+
          '**VALOR LÍQUIDO**   🪙 '+Math.floor(price*0.95).toLocaleString('pt-BR')+' coins\n'+
          '**CÓDIGO**   '+String.fromCharCode(96)+result.id+String.fromCharCode(96)+
          '\n\n-# Taxa de 5% ao vender. Para retirar, use /s cancelar.',
          GREEN,true,[],[])
      : message('Não foi possível anunciar. Verifique se a carta é sua, se está fora do time e se não possui outro anúncio.');
  }
  if (action === 'comprar') return handleBuy(env, uid, String(getOption(args, 'codigo') ?? ''));
  if(action==='cancelar'){
    const ok=await cancelListing(env.DB,uid,String(getOption(args,'codigo')??''));
    return ok
      ? card('✅ Anúncio cancelado',
          'A carta voltou a ficar disponível para seu clube.\n\n'+
          '-# Você pode escalá-la com /s escalar ou anunciá-la novamente.',GREEN,true,[],[])
      : card('❌ Não foi possível cancelar',
          'O código não existe, não pertence a você ou já foi encerrado.',ERROR,true,[],[]);
  }
  return message('Comando não encontrado. Use **/s ajuda**.');
}

async function handleBuy(env:Env,uid:string,id:string){
  if(!/^[a-f0-9]{16}$/.test(id))return message('Código de anúncio inválido.');
  if(!await account(env.DB,uid))return needStart();
  const result=await buyCard(env.DB,uid,id);
  return result.ok
    ? card('✅ Contratação concluída',
        '**'+(result.player?.name??'Jogador')+'** foi contratado!\n\n'+
        '**EDIÇÃO**   '+(TIER_NAMES[result.tier??'legado']??'Clássica')+'\n'+
        '**VALOR PAGO**   🪙 '+result.price?.toLocaleString('pt-BR')+' coins\n\n'+
        '-# A arte e a edição permanecem vinculadas ao exemplar. Confira /s colecao.',
        GREEN,true,[],result.player?[editionArtUrl(result.player.key,result.edition??'legado')]:[])
    : card('❌ Transferência não concluída',
        'Verifique se o anúncio está ativo, se você tem coins suficientes e se a carta não é sua.',
        ERROR,true,[],[]);
}
