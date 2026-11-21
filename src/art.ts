import { getPlayer, type Player } from './catalog.ts';
import * as premium from './premium.ts';

/** Public-domain/CC portraits are stored in assets/portraits with PHOTO_CREDITS.md.
 * This view composes actual game data over our original Futstancy vector layouts.
 */
const ASSET_ROOT='https://raw.githubusercontent.com/c9bleblestro/futstancy/main/assets/portraits/';
const inFlight=new Map<string,Promise<string|null>>();
async function downloadPortrait(player:Player):Promise<string|null>{
  const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),6000);
  try{
    const response=await fetch(ASSET_ROOT+encodeURIComponent(player.key)+'.jpg',{
      signal:ctrl.signal,headers:{Accept:'image/jpeg'}
    });
    if(!response.ok||!(response.headers.get('content-type')??'').startsWith('image/jpeg'))return null;
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.length===0||bytes.length>170000)return null;
    let binary='';
    for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return 'data:image/jpeg;base64,'+btoa(binary);
  }catch(err){
    console.warn('[PLAYER PHOTO]',player.key,err instanceof Error?err.message:String(err));
    return null;
  }finally{clearTimeout(timeout);}
}
function portrait(p:Player):Promise<string|null>{
  const cached=inFlight.get(p.key);if(cached)return cached;
  const task=downloadPortrait(p);
  inFlight.set(p.key,task);
  void task.then(value=>{if(!value)inFlight.delete(p.key);});
  return task;
}
function selectPlayers(url:URL,limit:number):Player[]{
  return (url.searchParams.get('k')??'').split(',').slice(0,limit)
    .map(key=>getPlayer(key)).filter((p):p is Player=>Boolean(p));
}
let framePromise:Promise<string|null>|undefined;
async function cardFrame():Promise<string|null>{
  if(!framePromise)framePromise=(async()=>{
    try{
      const response=await fetch('https://raw.githubusercontent.com/c9bleblestro/futstancy/main/assets/design/card-frame.png');
      if(!response.ok)return null;
      const data=new Uint8Array(await response.arrayBuffer());
      if(data.byteLength===0||data.byteLength>200000)return null;
      let binary='';
      for(let i=0;i<data.length;i+=8192)binary+=String.fromCharCode(...data.subarray(i,i+8192));
      return 'data:image/png;base64,'+btoa(binary);
    }catch(e){console.warn('[CARD FRAME]',e instanceof Error?e.message:String(e));return null;}
  })();
  return framePromise;
}
let fontTask:Promise<Uint8Array>|undefined;
async function font():Promise<Uint8Array>{
  if(!fontTask)fontTask=(async()=>{
    const response=await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Bold.ttf');
    if(!response.ok)throw Error('Não foi possível carregar fonte Futstancy. HTTP '+response.status);
    const data=new Uint8Array(await response.arrayBuffer());
    if(data.length>1200000)throw Error('Fonte muito grande');
    return data;
  })().catch(err=>{fontTask=undefined;throw err});
  return fontTask;
}
async function render(svg:string):Promise<Response>{
  const {Resvg}=await import('@cf-wasm/resvg/workerd');
  const [f,frameTexture]=await Promise.all([font(),cardFrame()]);
  premium.setCardFrameTexture(frameTexture);
  const instance=await Resvg.async(svg,{fitTo:{mode:'original'},font:{fontBuffers:[f],loadSystemFonts:false,defaultFontFamily:'Lato',sansSerifFamily:'Lato'}});
  const png=instance.render().asPng() as Uint8Array<ArrayBuffer>;
  return new Response(png,{headers:{'content-type':'image/png','cache-control':'public, max-age=3600','x-content-type-options':'nosniff'}});
}
export async function renderArt(req:Request):Promise<Response|null>{
  const url=new URL(req.url),route=url.pathname;
  if(!route.startsWith('/art/'))return null;
  if(url.search.length>2000)return new Response('Parâmetros grandes demais',{status:400});
  try{
    if(route==='/art/player.png'){
      const p=getPlayer(url.searchParams.get('k')??'');
      return p?await render(premium.obtained(p,await portrait(p))):new Response('Jogador não encontrado',{status:404});
    }
    if(route==='/art/collection.png'){
      const players=selectPlayers(url,6);const portraits=await Promise.all(players.map(portrait));
      return await render(premium.collection(players,portraits,url.searchParams.get('total')??String(players.length),url.searchParams.get('page')??'1'));
    }
    if(route==='/art/market.png'){
      const players=selectPlayers(url,8),portraits=await Promise.all(players.map(portrait));
      const prices=(url.searchParams.get('prices')??'').split(',').slice(0,8).map(Number);
      const codes=(url.searchParams.get('codes')??'').split(',').slice(0,8);
      return await render(premium.market(players,portraits,prices,codes));
    }
    if(route==='/art/pack.png'){
      const players=selectPlayers(url,3),portraits=await Promise.all(players.map(portrait));
      return await render(premium.pack(players,portraits));
    }
    if(route==='/art/team.png'){
      const keys=(url.searchParams.get('k')??'').split(',').slice(0,11);
      const players=keys.map(key=>getPlayer(key)??null);
      const portraits=await Promise.all(players.map(p=>p?portrait(p):Promise.resolve(null)));
      return await render(premium.team(players,portraits,url.searchParams.get('power')??'--'));
    }
    if(route==='/art/score.png')return await render(premium.score(url.searchParams.get('home')??'CASA',url.searchParams.get('away')??'VISITANTE',url.searchParams.get('sh')??'0',url.searchParams.get('sa')??'0'));
    if(route==='/art/banner.png')return await render(premium.banner(url.searchParams.get('t')??'FUTSTANCY',url.searchParams.get('s')??'Seu clube. Sua história.'));
    return null;
  }catch(err){
    console.error('[FUTSTANCY PREMIUM ART]',route,err instanceof Error?err.message:String(err));
    return new Response('Imagem temporariamente indisponível',{status:503});
  }
}