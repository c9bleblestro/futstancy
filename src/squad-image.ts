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
async function font():Promise<Uint8Array>{
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
async function approvedArt(playerKey:string,edition:string):Promise<string|null>{
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
  const blocks=TACTICAL_433.map(slot=>{
    const row=bySlot.get(slot.slot);
    const p=row?getPlayer(row.player_key):null;
    const x=slot.x-75,y=slot.y-99;
    const art=row?images[row.id]:undefined;
    const name=p?p.name.slice(0,16):'VAGA VAZIA';
    const tint=art?'#33e0ba':p?'#6caab0':'#5a7a7f';
    const artLayer=art
      ? '<image x="'+(x+4)+'" y="'+(y+5)+'" width="142" height="149" preserveAspectRatio="xMidYMid slice" href="'+art+'"/>'
      : '<rect x="'+(x+5)+'" y="'+(y+5)+'" width="140" height="149" rx="11" fill="#162a33"/>'+
        '<path d="M'+(slot.x-24)+' '+(y+80)+'h48M'+slot.x+' '+(y+56)+'v48" stroke="#508b8a" stroke-width="3" opacity=".45"/>';
    return '<g>'+
      '<rect x="'+(x-2)+'" y="'+(y-2)+'" width="154" height="202" rx="15" fill="#03151c" fill-opacity=".66" stroke="'+tint+'" stroke-width="2"/>'+
      '<rect x="'+(x+4)+'" y="'+(y+5)+'" width="142" height="149" rx="11" fill="#0e2930"/>'+
      artLayer+
      '<rect x="'+(x+4)+'" y="'+(y+137)+'" width="142" height="18" fill="#05171b" fill-opacity=".83"/>'+
      '<rect x="'+(x+7)+'" y="'+(y+8)+'" width="49" height="25" rx="6" fill="#07252b" stroke="#83e9da" stroke-width="1"/>'+
      '<text x="'+(x+31)+'" y="'+(y+26)+'" font-size="17" text-anchor="middle" fill="#d5fff5">'+xml(slot.role)+'</text>'+
      '<text x="'+slot.x+'" y="'+(y+174)+'" font-size="16" text-anchor="middle" fill="#f3fff9">'+xml(name)+'</text>'+
      '<text x="'+slot.x+'" y="'+(y+192)+'" font-size="14" text-anchor="middle" fill="#6ce4d2">'+
      (p?xml(String(p.ovr))+' OVR':'TOQUE PARA ESCALAR')+'</text>'+
    '</g>';
  }).join('');
  const missing=11-stats.occupied;
  return [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1350" viewBox="0 0 1024 1350">',
  '<defs>',
    '<linearGradient id="bg" x2="1" y2="1"><stop offset="0" stop-color="#061721"/><stop offset=".52" stop-color="#103334"/><stop offset="1" stop-color="#07111d"/></linearGradient>',
    '<linearGradient id="grass" x2="0" y2="1"><stop offset="0" stop-color="#135e54"/><stop offset=".5" stop-color="#0e5148"/><stop offset="1" stop-color="#083c3d"/></linearGradient>',
    '<linearGradient id="glass" x2="0" y2="1"><stop stop-color="#42cdbf" stop-opacity=".20"/><stop offset="1" stop-color="#064a49" stop-opacity=".10"/></linearGradient>',
    '<pattern id="stripes" width="1024" height="160" patternUnits="userSpaceOnUse"><rect width="1024" height="80" fill="#37ffcc" opacity=".035"/></pattern>',
  '</defs>',
  '<rect width="1024" height="1350" fill="url(#bg)"/>',
  '<rect x="25" y="22" width="974" height="1305" rx="29" fill="none" stroke="#5ff3d4" stroke-opacity=".31" stroke-width="2"/>',
  '<text x="66" y="86" font-family="Lato" font-weight="700" font-size="34" letter-spacing="3" fill="#effffc">FUTSTANCY</text>',
  '<text x="66" y="125" font-family="Lato" font-size="17" fill="#70cbbc">CLUBE  /  ESCALACAO TATICA</text>',
  '<rect x="674" y="62" width="267" height="61" rx="14" fill="#16393e" stroke="#3b9d98"/>',
  '<text x="808" y="101" font-family="Lato" font-size="28" text-anchor="middle" fill="#d6fff4">4 - 3 - 3</text>',
  '<rect x="51" y="165" width="922" height="1076" rx="23" fill="url(#grass)" stroke="#3aa99a" stroke-width="3"/>',
  '<rect x="54" y="168" width="916" height="1070" rx="20" fill="url(#stripes)"/>',
  '<g stroke="#b8ffea" stroke-opacity=".41" fill="none" stroke-width="3">',
  '<rect x="76" y="189" width="872" height="1030" rx="8"/><path d="M76 704H948"/><circle cx="512" cy="704" r="115"/>',
  '<circle cx="512" cy="704" r="4" fill="#c0fff3"/>',
  '<path d="M339 189V353H685V189 M394 189V243H630V189 M339 1219V1055H685V1219 M394 1219V1165H630V1219"/>',
  '</g>',
  '<rect x="77" y="189" width="870" height="1030" fill="url(#glass)"/>',
  blocks,
  '<rect x="51" y="1257" width="922" height="53" rx="13" fill="#123039" stroke="#3c7b7c"/>',
  '<text x="81" y="1292" fill="#d4fcf1" font-family="Lato" font-size="23">',stats.occupied,'/11 TITULARES</text>',
  '<text x="500" y="1292" fill="#a5f4e7" font-family="Lato" font-size="21">OVR MEDIO ',stats.ovr||'--','</text>',
  '<text x="944" y="1292" text-anchor="end" fill="',missing?'#ffd68a':'#68efc5','" font-family="Lato" font-size="21">',missing?missing+' VAGAS':'COMPLETO','</text>',
  '</svg>',
  ].join('');
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
  const svg=buildSquadSvg(rows,images);
  try{
    const [{Resvg},bytes]=await Promise.all([import('@cf-wasm/resvg/workerd'),font()]);
    const instance=await Resvg.async(svg,{
      fitTo:{mode:'original'},
      font:{fontBuffers:[bytes],loadSystemFonts:false,defaultFontFamily:'Lato',sansSerifFamily:'Lato'},
    });
    const png=instance.render().asPng() as Uint8Array<ArrayBuffer>;
    return new Response(png,{headers:{
      'content-type':'image/png','cache-control':'public,max-age=60',
      'x-content-type-options':'nosniff',
    }});
  }catch(error){
    console.error('[SQUAD IMAGE]',error instanceof Error?error.message:String(error));
    return new Response('Campo temporariamente indisponível',{status:503});
  }
}
