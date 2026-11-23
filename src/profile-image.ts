import {getPlayer} from './catalog.ts';
import {account,lineup} from './storage.ts';
import {approvedArt,font} from './squad-image.ts';
import {buildPremiumProfileSvg} from './profile-art-v60.ts';
import {editionArtUrl} from './packs.ts';
import type {Account,Env,LineupRow} from './types.ts';

export type DiscordIdentity={name:string;avatarUrl:string|null};
export type ProfileImages={avatar?:string|null;star?:string|null;featuredPlayerKey?:string};
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
  pictures:ProfileImages={}):string {
  return buildPremiumProfileSvg(me,rows,identity,pictures);
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
  // A miniatura deve ser de uma carta original aprovada e realmente possuída.
  // Se o maior OVR só tem foto de catálogo, selecionamos outro titular com arte
  // e mantemos o maior OVR verdadeiro indicado no painel.
  const featured=[...rows]
    .sort((a,b)=>(getPlayer(b.player_key)?.ovr??0)-(getPlayer(a.player_key)?.ovr??0))
    .find(row=>editionArtUrl(row.player_key,row.edition).includes('/assets/editions/'));
  const [id,art]=await Promise.all([
    discordIdentity(owner,guild,env),
    featured?approvedArt(featured.player_key,featured.edition):Promise.resolve(null),
  ]);
  const identity=(id.name==='Treinador'&&fallbacks.name)?{...id,name:cut(fallbacks.name)}:id;
  if(!identity.avatarUrl && (fallbacks.avatar||fallbacks.guildAvatar)){
    const fallback=await discordIdentity(owner,guild,{...env,DISCORD_BOT_TOKEN:undefined},
      fetch,fallbacks);
    identity.avatarUrl=fallback.avatarUrl;
  }
  const avatar=await avatarPicture(identity.avatarUrl);
  // Só miniaturas completas originais, nunca retrato solto em lugar da carta.
  const svg=buildProfileSvg(me,rows,identity,{
    avatar,star:art,featuredPlayerKey:featured?.player_key,
  });
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
