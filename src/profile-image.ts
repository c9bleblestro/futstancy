import {getPlayer} from './catalog.ts';
import {account,lineup} from './storage.ts';
import {approvedArt,font} from './squad-image.ts';
import {squadStats} from './squad-layout.ts';
import type {Account,Env,LineupRow} from './types.ts';

export type DiscordIdentity={name:string;avatarUrl:string|null};
export type ProfileImages={avatar?:string|null;star?:string|null};
type FetchFn=(input:string,init?:RequestInit)=>Promise<Response>;
const escapeXml=(input:unknown)=>String(input??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const validHash=(s:string)=>/^(?:a_)?[a-f0-9]{32}$/i.test(s);
const cut=(value:string,n=25)=>value.trim().replace(/[\r\n\t]/g,' ').slice(0,n)||'Treinador';
const fmt=(n:number)=>Number(n).toLocaleString('pt-BR');
const avatarsRoot='https://cdn.discordapp.com';
const sizeAvatar=256;
const timeoutMs=5000;
function userAvatar(userId:string,hash:string):string{
  return avatarsRoot+'/avatars/'+userId+'/'+hash+'.png?size='+sizeAvatar;
}
function guildAvatar(guildId:string,userId:string,hash:string):string{
  return avatarsRoot+'/guilds/'+guildId+'/users/'+userId+'/avatars/'+hash+'.png?size='+sizeAvatar;
}
async function discordJson(url:string,token:string,fetcher:FetchFn):Promise<any|null>{
  try{
    const response=await fetcher(url,{headers:{Authorization:'Bot '+token,Accept:'application/json'},
      signal:AbortSignal.timeout(timeoutMs)});
    if(!response.ok)return null;
    return await response.json();
  }catch{return null;}
}
/** Discord REST é a fonte de nome/avatar; os dados do jogo sempre vêm do D1. */
export async function discordIdentity(userId:string,guildId:string,env:Env,fetcher:FetchFn=fetch,
  fallback:{name?:string;avatar?:string;guildAvatar?:string}={}):Promise<DiscordIdentity>{
  if(!/^\d{15,22}$/.test(userId))return {name:'Treinador',avatarUrl:null};
  const token=env.DISCORD_BOT_TOKEN??'';
  const [u,m]=token?await Promise.all([
    discordJson('https://discord.com/api/v10/users/'+userId,token,fetcher),
    /^\d{15,22}$/.test(guildId)
      ?discordJson('https://discord.com/api/v10/guilds/'+guildId+'/members/'+userId,token,fetcher)
      :Promise.resolve(null),
  ]):[null,null];
  const name=cut(m?.nick??u?.global_name??u?.username??fallback.name??'Treinador');
  const memberHash=String(m?.avatar??fallback.guildAvatar??'');
  const globalHash=String(u?.avatar??fallback.avatar??'');
  const avatarUrl=validHash(memberHash)&&/^\d{15,22}$/.test(guildId)
    ?guildAvatar(guildId,userId,memberHash)
    :validHash(globalHash)?userAvatar(userId,globalHash):null;
  return {name,avatarUrl};
}
function binary64(bytes:Uint8Array):string{
  let binary='';
  for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
}
/** Só carrega imagem da CDN do Discord, em PNG/JPEG, com limite rígido. */
async function avatarPicture(url:string|null,fetcher:FetchFn=fetch):Promise<string|null>{
  if(!url||!/^https:\/\/cdn\.discordapp\.com\/(?:avatars|guilds)\//.test(url))return null;
  try{
    const res=await fetcher(url,{headers:{Accept:'image/png,image/jpeg'},
      signal:AbortSignal.timeout(timeoutMs)});
    if(!res.ok||!/image\/(?:png|jpe?g)/i.test(res.headers.get('content-type')??''))return null;
    const len=Number(res.headers.get('content-length')??'0');
    if(len>350000)return null;
    const buf=new Uint8Array(await res.arrayBuffer());
    if(buf.length<40||buf.length>350000)return null;
    return 'data:'+(res.headers.get('content-type')??'image/png')+';base64,'+binary64(buf);
  }catch{return null;}
}

export function buildProfileSvg(me:Account,rows:LineupRow[],identity:DiscordIdentity,
  pictures:ProfileImages={}):string{
  const played=me.wins+me.draws+me.losses;
  const points=me.wins*3+me.draws;
  const percent=played?Math.round(me.wins/played*100):0;
  const stats=squadStats(rows);
  const best=[...rows].sort((a,b)=>(getPlayer(b.player_key)?.ovr??0)-(getPlayer(a.player_key)?.ovr??0))[0];
  const star=best?getPlayer(best.player_key):null;
  const avatar=pictures.avatar
    ? '<image href="'+pictures.avatar+'" x="101" y="197" width="170" height="170" preserveAspectRatio="xMidYMid slice" clip-path="url(#roundAvatar)"/>'
    : '<g><circle cx="186" cy="282" r="85" fill="#184744"/>'+
      '<circle cx="186" cy="257" r="31" fill="#57bbae"/>'+
      '<path d="M120 337Q120 289 186 289Q252 289 252 337Z" fill="#57bbae"/></g>';
  const hero=pictures.star&&star
    ? '<image href="'+pictures.star+'" x="711" y="950" width="227" height="265" preserveAspectRatio="xMidYMid meet"/>'
    : '<g><path d="M766 1006L881 1006L899 1039L879 1163L821 1204L764 1163L745 1039Z" fill="#102c35" stroke="#43afa4" stroke-width="3"/>'+
      '<text x="821" y="1108" text-anchor="middle" font-family="Lato" font-size="35" fill="#74cabd">F</text>'+
      '<text x="821" y="1153" text-anchor="middle" font-family="Lato" font-size="13" fill="#abccc5">SEM ARTE</text></g>';
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1250" viewBox="0 0 1024 1250">',
    '<defs>',
    '<linearGradient id="bg" x2=".9" y2="1"><stop stop-color="#021019"/><stop offset=".54" stop-color="#092932"/><stop offset="1" stop-color="#020d14"/></linearGradient>',
    '<linearGradient id="panel" x2="1" y2="1"><stop stop-color="#0c3038"/><stop offset="1" stop-color="#061a23"/></linearGradient>',
    '<linearGradient id="gold" x2="1" y2="1"><stop stop-color="#f9dc8c"/><stop offset="1" stop-color="#b07e34"/></linearGradient>',
    '<linearGradient id="teal" x2="1" y2="1"><stop stop-color="#40f4da"/><stop offset="1" stop-color="#0e7e83"/></linearGradient>',
    '<clipPath id="roundAvatar"><circle cx="186" cy="282" r="85"/></clipPath>',
    '</defs>',
    '<rect width="1024" height="1250" fill="url(#bg)"/>',
    '<path d="M720 0L993 0L470 865L295 865Z" fill="#13fff0" opacity=".025"/>',
    '<path d="M0 0H1024L878 141H0Z" fill="#0a1e29" opacity=".9"/>',
    '<path d="M0 142H1024" stroke="#3cead2" stroke-opacity=".4" stroke-width="2"/>',
    '<text x="72" y="91" font-family="Lato" font-weight="700" font-size="58" fill="#f5fffd" letter-spacing="3">FUTSTANCY</text>',
    '<text x="75" y="122" font-family="Lato" font-size="20" fill="#75e4d6" letter-spacing="4">PERFIL DO TREINADOR</text>',
    '<path d="M884 60H955L936 85H865Z" fill="#20dbca"/><path d="M900 97H961L950 109H886Z" fill="#44ffff" opacity=".5"/>',
    '<rect x="45" y="173" width="934" height="225" rx="22" fill="url(#panel)" stroke="#3ed6c2" stroke-opacity=".73" stroke-width="2"/>',
    '<circle cx="186" cy="282" r="92" fill="#092b35" stroke="#4ee8d3" stroke-width="4"/>',avatar,
    '<circle cx="186" cy="282" r="85" fill="none" stroke="#66fce1" stroke-opacity=".4"/>',
    '<text x="314" y="254" font-family="Lato" font-size="40" font-weight="700" fill="#f8fffd">',escapeXml(cut(identity.name,24)),'</text>',
    '<text x="317" y="303" font-family="Lato" font-size="19" fill="#a7ced2">TREINADOR FUTSTANCY</text>',
    '<text x="317" y="338" font-family="Lato" font-size="18" fill="#9cdace">ID  ',escapeXml(me.user_id),'</text>',
    '<path d="M315 353H918" stroke="#3ae4c8" stroke-opacity=".3"/>',
    '<rect x="45" y="421" width="934" height="146" rx="21" fill="url(#panel)" stroke="#40bda9" stroke-opacity=".65" stroke-width="2"/>',
    '<circle cx="136" cy="494" r="38" fill="#8b652a" stroke="#f7cf71" stroke-width="4"/>',
    '<circle cx="136" cy="494" r="27" fill="#c8993b"/><text x="136" y="505" text-anchor="middle" font-family="Lato" font-size="31" fill="#fff3c6">F</text>',
    '<text x="209" y="480" font-family="Lato" font-size="20" fill="#adf8e5" letter-spacing="1.5">SALDO DA CARTEIRA</text>',
    '<text x="208" y="536" font-family="Lato" font-size="55" font-weight="700" fill="#f8fffa">',fmt(me.coins),'</text>',
    '<text x="892" y="523" font-family="Lato" font-size="20" text-anchor="end" fill="#e5c57a">COINS</text>',
    '<rect x="45" y="589" width="934" height="220" rx="21" fill="url(#panel)" stroke="#3b8c8c" stroke-opacity=".8" stroke-width="2"/>',
    '<text x="77" y="632" font-family="Lato" font-size="22" fill="#aafbec" letter-spacing="2">DESEMPENHO</text>',
    '<text x="78" y="687" font-family="Lato" font-size="20" fill="#a4cbd0">PARTIDAS</text>',
    '<text x="78" y="747" font-family="Lato" font-size="50" fill="#ffffff">',fmt(played),'</text>',
    '<text x="307" y="687" font-family="Lato" font-size="20" fill="#99d7c3">VITORIAS</text>',
    '<text x="307" y="747" font-family="Lato" font-size="50" fill="#56edb5">',fmt(me.wins),'</text>',
    '<text x="528" y="687" font-family="Lato" font-size="20" fill="#c8d0e0">EMPATES</text>',
    '<text x="528" y="747" font-family="Lato" font-size="50" fill="#f1f4f5">',fmt(me.draws),'</text>',
    '<text x="746" y="687" font-family="Lato" font-size="20" fill="#f0b6b8">DERROTAS</text>',
    '<text x="746" y="747" font-family="Lato" font-size="50" fill="#ff8989">',fmt(me.losses),'</text>',
    '<path d="M264 655V770M484 655V770M700 655V770" stroke="#54b3aa" stroke-opacity=".3"/>',
    '<rect x="45" y="831" width="934" height="117" rx="20" fill="url(#panel)" stroke="#3a928f" stroke-opacity=".65" stroke-width="2"/>',
    '<text x="80" y="868" font-family="Lato" font-size="17" fill="#a3dcd3">APROVEITAMENTO</text>',
    '<text x="80" y="918" font-family="Lato" font-size="43" fill="#62f5d8">',percent,'%','</text>',
    '<text x="357" y="868" font-family="Lato" font-size="17" fill="#a3dcd3">GOLS MARCADOS</text>',
    '<text x="357" y="918" font-family="Lato" font-size="42" fill="#ffffff">',fmt(me.goals_for),'</text>',
    '<text x="696" y="868" font-family="Lato" font-size="17" fill="#a3dcd3">GOLS SOFRIDOS</text>',
    '<text x="696" y="918" font-family="Lato" font-size="42" fill="#ffffff">',fmt(me.goals_against),'</text>',
    '<rect x="45" y="968" width="934" height="254" rx="21" fill="url(#panel)" stroke="#4bb5a7" stroke-opacity=".68" stroke-width="2"/>',
    '<text x="77" y="1005" font-family="Lato" font-size="24" fill="#eafffb">ELENCO TITULAR</text>',
    '<text x="78" y="1049" font-family="Lato" font-size="17" fill="#96d9cd">FORMACAO</text>',
    '<text x="77" y="1101" font-family="Lato" font-size="45" fill="#fff">4 - 3 - 3</text>',
    '<text x="78" y="1140" font-family="Lato" font-size="17" fill="#96d9cd">OVR MEDIO</text>',
    '<text x="78" y="1191" font-family="Lato" font-size="39" fill="#53e7c9">',stats.ovr||'--','</text>',
    '<text x="300" y="1140" font-family="Lato" font-size="17" fill="#96d9cd">TITULARES</text>',
    '<text x="300" y="1191" font-family="Lato" font-size="39" fill="#fff">',stats.occupied,'/11</text>',
    '<path d="M660 991V1206" stroke="#5ef4e7" stroke-opacity=".4"/>',
    '<text x="815" y="1000" font-family="Lato" font-size="19" text-anchor="middle" fill="#f7e2a5">MELHOR TITULAR</text>',
    hero,
    '<text x="815" y="1214" font-family="Lato" font-size="16" text-anchor="middle" fill="#f4fff9">',star?escapeXml(cut(star.name,16)):'SEM TITULAR','</text>',
    '<text x="76" y="785" font-family="Lato" font-size="13" fill="#7eaaa9">PONTOS NA TABELA  ',fmt(points),'</text>',
    '</svg>'
  ].join('');
}
export async function renderProfileImage(req:Request,env:Env):Promise<Response>{
  const url=new URL(req.url),owner=url.searchParams.get('user')??'';
  if(!/^\d{15,22}$/.test(owner))return new Response('ID do treinador inválido',{status:400});
  const [me,rows]=await Promise.all([account(env.DB,owner),lineup(env.DB,owner)]);
  if(!me)return new Response('Treinador não encontrado',{status:404});
  const guild=url.searchParams.get('guild')??'';
  const fallbacks={
    name:url.searchParams.get('name')??undefined,
    avatar:url.searchParams.get('avatar')??undefined,
    guildAvatar:url.searchParams.get('gavatar')??undefined,
  };
  const best=[...rows].sort((a,b)=>(getPlayer(b.player_key)?.ovr??0)-(getPlayer(a.player_key)?.ovr??0))[0];
  const [id,photo,art]=await Promise.all([
    discordIdentity(owner,guild,env),
    Promise.resolve(null), // avatar carregado após a identidade ser resolvida
    best?approvedArt(best.player_key,best.edition):Promise.resolve(null),
  ]);
  const identity=(id.name==='Treinador'&&fallbacks.name)?{...id,name:cut(fallbacks.name)}:id;
  if(!identity.avatarUrl && (fallbacks.avatar||fallbacks.guildAvatar)){
    const fallback=await discordIdentity(owner,guild,{...env,DISCORD_BOT_TOKEN:undefined},
      fetch,fallbacks);
    identity.avatarUrl=fallback.avatarUrl;
  }
  const avatar=await avatarPicture(identity.avatarUrl);
  const svg=buildProfileSvg(me,rows,identity,{avatar,star:art});
  try{
    const [{Resvg},bytes]=await Promise.all([import('@cf-wasm/resvg/workerd'),font()]);
    const result=await Resvg.async(svg,{fitTo:{mode:'original'},
      font:{fontBuffers:[bytes],loadSystemFonts:false,defaultFontFamily:'Lato',sansSerifFamily:'Lato'}});
    return new Response(result.render().asPng() as Uint8Array<ArrayBuffer>,{
      headers:{'content-type':'image/png','cache-control':'public,max-age=40',
        'x-content-type-options':'nosniff'},
    });
  }catch(err){
    console.error('[PROFILE IMAGE]',err instanceof Error?err.message:String(err));
    return new Response('Perfil temporariamente indisponível',{status:503});
  }
}
