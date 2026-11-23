import {getPlayer} from './catalog.ts';
import {lineup} from './storage.ts';
import {editionArtUrl} from './packs.ts';
import {TACTICAL_433,squadStats} from './squad-layout.ts';
import type {Env,LineupRow} from './types.ts';

const FONT_URL='https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Bold.ttf';
const MAX_IMAGE_BYTES=360000;
const CACHE_TTL=5*60*1000;
const imageCache=new Map<string,{data:string;at:number}>();
let fontPromise:Promise<Uint8Array>|undefined;
const xml=(input:unknown)=>String(input??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function base64(bytes:Uint8Array):string{
  let data='';
  for(let i=0;i<bytes.length;i+=8192)data+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(data);
}
export async function font():Promise<Uint8Array>{
  if(!fontPromise)fontPromise=(async()=>{
    const response=await fetch(FONT_URL,{signal:AbortSignal.timeout(7000)});
    if(!response.ok)throw Error('Fonte indisponível');
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.length<1000||bytes.length>1300000)throw Error('Tamanho inválido da fonte');
    return bytes;
  })().catch(e=>{fontPromise=undefined;throw e});
  return fontPromise;
}
/** Apenas artes completas; nunca molduras antigas, recortes ou prévias. */
export async function approvedArt(playerKey:string,edition:string):Promise<string|null>{
  const url=editionArtUrl(playerKey,edition);
  if(!/^https:\/\/raw\.githubusercontent\.com\/c9bleblestro\/futstancy\/main\/assets\/editions\//.test(url))
    return null;
  const cached=imageCache.get(url),now=Date.now();
  if(cached&&now-cached.at<CACHE_TTL)return cached.data;
  try{
    const response=await fetch(url,{signal:AbortSignal.timeout(6500),headers:{Accept:'image/jpeg'}});
    const len=Number(response.headers.get('content-length')??0);
    if(!response.ok||(len&&len>MAX_IMAGE_BYTES))return null;
    if(!/image\/jpe?g/i.test(response.headers.get('content-type')??''))return null;
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.length<500||bytes.length>MAX_IMAGE_BYTES)return null;
    const result='data:image/jpeg;base64,'+base64(bytes);
    if(imageCache.size>40)imageCache.delete(imageCache.keys().next().value!);
    imageCache.set(url,{data:result,at:now});
    return result;
  }catch{return null;}
}

export function buildSquadSvg(rows:LineupRow[],images:Readonly<Record<string,string>>={}):string{
  const bySlot=new Map(rows.map(r=>[r.slot,r]));
  const stats=squadStats(rows);
  // Cada arte é a carta ORIGINAL COMPLETA, reduzida sem recorte nem moldura gerada.
  // Labels de posição são externos; nunca desenhamos por cima dos atributos da carta.
  const blocks=TACTICAL_433.map(slot=>{
    const row=bySlot.get(slot.slot);
    const p=row?getPlayer(row.player_key):null;
    const art=row?images[row.id]:undefined;
    const x=slot.x-73,y=slot.y-99;
    const name=p?p.name.slice(0,17):'VAGA LIVRE';
    const short=p?p.name.split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase():'＋';
    const miniature=art
      ? '<image x="'+x+'" y="'+y+'" width="146" height="184" preserveAspectRatio="xMidYMid meet" href="'+art+'"/>'
      : '<g><circle cx="'+slot.x+'" cy="'+(y+89)+'" r="57" fill="#0e2c35" stroke="#3b9999" stroke-width="2" stroke-dasharray="'+(p?'5 8':'7 9')+'"/>'+
        '<text x="'+slot.x+'" y="'+(y+102)+'" font-family="Lato" font-size="39" text-anchor="middle" fill="#79cfc8">'+xml(short)+'</text>'+
        '<text x="'+slot.x+'" y="'+(y+145)+'" font-family="Lato" font-size="12" text-anchor="middle" fill="#80afa9">'+(p?'ARTE INDISPONIVEL':'SEM TITULAR')+'</text></g>';
    return [
      '<g>',
      '<ellipse cx="',slot.x,'" cy="',slot.y+77,'" rx="67" ry="15" fill="#001b23" opacity=".6"/>',
      '<path d="M',slot.x-47,' ',y+176,'h94" stroke="#40edce" stroke-width="2" stroke-opacity=".55"/>',
      miniature,
      '<rect x="',slot.x-27,'" y="',y-9,'" width="54" height="24" rx="10" fill="#031923" stroke="#57d7cb" stroke-opacity=".85"/>',
      '<text x="',slot.x,'" y="',y+9,'" font-family="Lato" font-size="16" text-anchor="middle" fill="#e7fff9">',xml(slot.role),'</text>',
      '<text x="',slot.x,'" y="',y+202,'" font-family="Lato" font-size="16" text-anchor="middle" fill="#f1fffa">',xml(name),'</text>',
      '<text x="',slot.x,'" y="',y+219,'" font-family="Lato" font-size="15" text-anchor="middle" fill="#70e9d3">',p?xml(p.ovr)+' OVR':'ESCALAR','</text>',
      '</g>'
    ].join('');
  }).join('');
  const missing=11-stats.occupied;
  return [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1350" viewBox="0 0 1024 1350">',
  '<defs>',
    '<linearGradient id="bg" x2="1" y2="1"><stop offset="0" stop-color="#03121b"/><stop offset=".55" stop-color="#092a2f"/><stop offset="1" stop-color="#030c18"/></linearGradient>',
    '<linearGradient id="grass" x2="0" y2="1"><stop offset="0" stop-color="#0c413d"/><stop offset=".48" stop-color="#0a3838"/><stop offset="1" stop-color="#072928"/></linearGradient>',
    '<linearGradient id="glass" x2="0" y2="1"><stop stop-color="#42cdbf" stop-opacity=".20"/><stop offset="1" stop-color="#064a49" stop-opacity=".10"/></linearGradient>',
    '<pattern id="stripes" width="1024" height="160" patternUnits="userSpaceOnUse"><rect width="1024" height="80" fill="#37ffcc" opacity=".055"/></pattern>',
  '</defs>',
  '<rect width="1024" height="1350" fill="url(#bg)"/><path d="M610 0L820 0L160 1350H0Z" fill="#1ffff2" opacity=".025"/><path d="M1010 0H1024V550L690 0Z" fill="#35ffe3" opacity=".035"/>',
  '<rect x="25" y="22" width="974" height="1305" rx="29" fill="none" stroke="#5ff3d4" stroke-opacity=".31" stroke-width="2"/>',
  '<text x="66" y="86" font-family="Lato" font-weight="700" font-size="44" letter-spacing="3" fill="#effffc">FUTSTANCY</text>',
  '<text x="66" y="125" font-family="Lato" font-size="17" fill="#70cbbc">CLUBE  /  ESCALACAO TATICA</text>',
  '<rect x="674" y="62" width="267" height="61" rx="14" fill="#16393e" stroke="#3b9d98"/>',
  '<text x="808" y="101" font-family="Lato" font-size="28" text-anchor="middle" fill="#d6fff4">4 - 3 - 3</text>',
  '<rect x="51" y="165" width="922" height="1076" rx="23" fill="url(#grass)" stroke="#38e5cb" stroke-opacity=".8" stroke-width="3"/>',
  '<rect x="54" y="168" width="916" height="1070" rx="20" fill="url(#stripes)"/>',
  '<g stroke="#b8ffea" stroke-opacity=".41" fill="none" stroke-width="3">',
  '<rect x="76" y="189" width="872" height="1030" rx="8"/><path d="M76 704H948"/><circle cx="512" cy="704" r="115"/>',
  '<circle cx="512" cy="704" r="4" fill="#c0fff3"/>',
  '<path d="M339 189V353H685V189 M394 189V243H630V189 M339 1219V1055H685V1219 M394 1219V1165H630V1219"/>',
  '</g>',
  '<rect x="77" y="189" width="870" height="1030" fill="url(#glass)" opacity=".7"/>',
  blocks,
  '<rect x="51" y="1274" width="922" height="53" rx="13" fill="#123039" stroke="#3c7b7c"/>',
  '<text x="81" y="1310" fill="#d4fcf1" font-family="Lato" font-size="23">',stats.occupied,'/11 TITULARES</text>',
  '<text x="500" y="1292" fill="#a5f4e7" font-family="Lato" font-size="21">OVR MEDIO ',stats.ovr||'--','</text>',
  '<text x="944" y="1292" text-anchor="end" fill="',missing?'#ffd68a':'#68efc5','" font-family="Lato" font-size="21">',missing?missing+' VAGAS':'COMPLETO','</text>',
  '</svg>',
  ].join('');
}

/**
 * Resvg pode rejeitar uma miniatura externa mesmo quando o SVG do gramado é válido.
 * O segundo render mantém a formação, nomes e OVRs visíveis, sem imagem quebrada.
 */
export async function renderSquadWithFallback<T>(
  rows:LineupRow[],images:Readonly<Record<string,string>>,
  renderer:(svg:string)=>Promise<T>
):Promise<{png:T;mode:'full'|'fallback'}>{
  try{
    return {png:await renderer(buildSquadSvg(rows,images)),mode:'full'};
  }catch(error){
    console.warn('[SQUAD IMAGE] Miniaturas não processadas; usando campo seguro:',
      error instanceof Error?error.message:String(error));
    return {png:await renderer(buildSquadSvg(rows,{})),mode:'fallback'};
  }
}

export async function renderSquadImage(req:Request,env:Env):Promise<Response>{
  const url=new URL(req.url),owner=url.searchParams.get('user')??'';
  if(!/^\d{15,22}$/.test(owner))return new Response('Jogador inválido',{status:400});
  const rows=await lineup(env.DB,owner);
  const images:Record<string,string>={};
  await Promise.all(rows.map(async row=>{
    const art=await approvedArt(row.player_key,row.edition);
    if(art)images[row.id]=art;
  }));
  try{
    const [{Resvg},bytes]=await Promise.all([import('@cf-wasm/resvg/workerd'),font()]);
    const result=await renderSquadWithFallback(rows,images,async svg=>{
      const instance=await Resvg.async(svg,{
        fitTo:{mode:'original'},
        font:{fontBuffers:[bytes],loadSystemFonts:false,defaultFontFamily:'Lato',sansSerifFamily:'Lato'},
      });
      return instance.render().asPng() as Uint8Array<ArrayBuffer>;
    });
    return new Response(result.png,{headers:{
      'content-type':'image/png',
      'cache-control':result.mode==='full'?'public,max-age=45':'no-store',
      'x-futstancy-image-mode':result.mode,
      'x-content-type-options':'nosniff',
    }});
  }catch(error){
    console.error('[SQUAD IMAGE]',error instanceof Error?error.message:String(error));
    return new Response('Campo temporariamente indisponível',{status:503});
  }
}
