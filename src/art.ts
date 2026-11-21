import { getPlayer, type Player } from './catalog.ts';

const wiki:Record<string,string> = {
  courtois:'Thibaut Courtois', alisson:'Alisson Becker', ederson:'Ederson (footballer, born 1993)',
  donnarumma:'Gianluigi Donnarumma', terstegen:'Marc-André ter Stegen', unai:'Unai Simón',
  bento:'Bento (footballer, born 1999)', mamardashvili:'Giorgi Mamardashvili',
  vandijk:'Virgil van Dijk', rudiger:'Antonio Rüdiger', saliba:'William Saliba',
  dias:'Rúben Dias', hakimi:'Achraf Hakimi', militao:'Éder Militão',
  araujo:'Ronald Araújo', gabriel:'Gabriel Magalhães', carvajal:'Dani Carvajal',
  bremer:'Bremer (footballer, born 1997)', renan:'Renan Lodi', danilo:'Danilo (footballer, born July 1991)',
  casemiro:'Casemiro', rodri:'Rodri (footballer, born 1996)', bellingham:'Jude Bellingham',
  debruyne:'Kevin De Bruyne', pedri:'Pedri', valverde:'Federico Valverde',
  bruno:'Bruno Fernandes', musiala:'Jamal Musiala', macallister:'Alexis Mac Allister',
  paqueta:'Lucas Paquetá', gerson:'Gerson (footballer, born 1997)', joaogomes:'João Gomes (footballer, born 2001)',
  mbappe:'Kylian Mbappé', haaland:'Erling Haaland', vinicius:'Vinícius Júnior',
  salah:'Mohamed Salah', kane:'Harry Kane', lamine:'Lamine Yamal', raphinha:'Raphinha (footballer, born 1996)',
  lautaro:'Lautaro Martínez', saka:'Bukayo Saka', leao:'Rafael Leão', richarlison:'Richarlison',
  endrick:'Endrick (footballer, born 2006)'
};
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const safe=(s:string,n=36)=>esc(s.replace(/[\r\n\t]/g,' ').slice(0,n));
const label=(x:number,y:number,s:string,size=30,color='#ffffff',anchor='start')=>'<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-family="sans-serif" font-weight="900" font-size="'+size+'" fill="'+color+'">'+safe(s,50)+'</text>';
const shell=(w:number,h:number,parts:string)=>'<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><defs><linearGradient id="bg"><stop stop-color="#050b1c"/><stop offset="1" stop-color="#132f6c"/></linearGradient><linearGradient id="gold"><stop stop-color="#fff5bf"/><stop offset=".45" stop-color="#b9a4ff"/><stop offset="1" stop-color="#51d9ff"/></linearGradient></defs><rect width="'+w+'" height="'+h+'" fill="url(#bg)"/>'+parts+'</svg>';

const knownPhotos=new Map<string,string|null>();
async function photoUrl(key:string):Promise<string|null>{
  if(!Object.hasOwn(wiki,key))return null;
  if(knownPhotos.has(key))return knownPhotos.get(key)??null;
  try{
    const api=new URL('https://en.wikipedia.org/w/api.php');
    api.searchParams.set('action','query');api.searchParams.set('format','json');
    api.searchParams.set('prop','pageimages');api.searchParams.set('pithumbsize','450');
    api.searchParams.set('titles',wiki[key]);
    const r=await fetch(api.toString());
    if(!r.ok)return null;
    const data=await r.json() as {query?:{pages?:Record<string,{thumbnail?:{source?:string}}>}}};
    const found=Object.values(data.query?.pages??{})[0]?.thumbnail?.source??null;
    const url=found&&found.startsWith('https://upload.wikimedia.org/')?found:null;
    knownPhotos.set(key,url);return url;
  }catch{return null;}
}
async function photoData(key:string):Promise<string|null>{
  const url=await photoUrl(key);if(!url)return null;
  try{
    const r=await fetch(url);if(!r.ok)return null;
    const mime=(r.headers.get('content-type')??'').split(';')[0];
    if(!['image/jpeg','image/png','image/webp'].includes(mime))return null;
    const bytes=new Uint8Array(await r.arrayBuffer());
    if(bytes.length>900000)return null;
    let binary='';for(let i=0;i<bytes.length;i+=10000)binary+=String.fromCharCode(...bytes.subarray(i,i+10000));
    return 'data:'+mime+';base64,'+btoa(binary);
  }catch{return null;}
}
async function playerSvg(player:Player):Promise<string>{
  const accent=player.ovr>=90?'#f7d18b':player.ovr>=86?'#92dcff':player.ovr>=80?'#f0c76c':'#d3d9e7';
  const rarity=player.ovr>=90?'ÍCONE':player.ovr>=86?'DIAMANTE':player.ovr>=80?'OURO':'PRATA';
  const photo=await photoData(player.key);
  const image=photo
    ? '<image href="'+photo+'" x="142" y="230" width="458" height="450" preserveAspectRatio="xMidYMid slice" clip-path="url(#portrait)"/>'
    : '<circle cx="380" cy="390" r="88" fill="#526481"/><path d="M230 660q25-185 150-185t150 185" fill="#526481"/>';
  return shell(740,960,
    '<defs><clipPath id="portrait"><rect x="142" y="230" width="458" height="450" rx="30"/></clipPath></defs>'+
    '<path d="M115 120L370 25L625 120L680 650L570 860L370 930L170 860L60 650Z" fill="#081328" stroke="url(#gold)" stroke-width="15"/>'+
    '<path d="M132 140L370 58L608 140L645 650L549 831L370 898L191 831L95 650Z" fill="#122445" stroke="#62d2ff" stroke-width="4"/>'+
    '<rect x="140" y="232" width="462" height="445" rx="30" fill="#263757"/>'+image+
    '<rect x="125" y="685" width="490" height="105" rx="18" fill="#081425"/>'+
    label(370,745,player.name,player.name.length>18?33:41,'#ffffff','middle')+
    label(370,781,rarity,24,accent,'middle')+
    '<rect x="90" y="145" width="125" height="122" rx="25" fill="#071222"/>'+
    label(152,205,String(player.ovr),61,'#ffffff','middle')+label(152,248,player.pos,30,'#fee6a2','middle')+
    label(370,110,'F U T S T A N C Y',28,'#d8f2ff','middle')+
    label(370,857,player.country,30,'#d9e6fa','middle'));
}
function bannerSvg(u:URL):string{
  const title=u.searchParams.get('t')??'FUTSTANCY', sub=u.searchParams.get('s')??'FUTEBOL NO DISCORD';
  return shell(1100,590,
    '<path d="M60 505H1040M60 105H1040" stroke="#5ed0ff" stroke-width="5"/>'+
    '<circle cx="930" cy="300" r="186" stroke="#9e89ec" stroke-width="12" fill="#182b53"/>'+
    '<circle cx="930" cy="300" r="94" stroke="#8ee5ff" stroke-width="12" fill="none"/>'+
    label(75,95,'FUTSTANCY',33,'#9edbff')+
    label(75,270,title,58)+label(75,350,sub,32,'#d6e4ff')+
    label(75,530,'COLECIONE   •   COMPITA   •   VENÇA',26,'#ffdf99'));
}
function teamSvg(u:URL):string{
  const slots=(u.searchParams.get('slots')??'').split('||').filter(Boolean).slice(0,11);
  const coords=[[500,530],[160,415],[390,415],[610,415],[840,415],[250,270],[500,270],[750,270],[250,135],[500,115],[750,135]];
  const blocks=slots.map((s,i)=>{
    const [x,y]=coords[i]??[500,330];
    return '<rect x="'+(x-90)+'" y="'+(y-33)+'" width="180" height="82" rx="18" fill="#081526" stroke="#a7dcff" stroke-width="3"/>'+
    label(x,y+3,s.slice(0,17),17,'#ffffff','middle')+
    label(x,y+29,((s.match(/\d{2,3}\s*OVR/)||[])[0]??''),14,'#f7d596','middle');
  }).join('');
  return shell(1000,680,
    '<rect x="50" y="68" width="900" height="570" rx="38" fill="#07482c" stroke="#61d5ff" stroke-width="7"/>'+
    '<rect x="130" y="100" width="740" height="508" fill="none" stroke="#97f3e9" stroke-width="4" opacity=".45"/>'+
    '<circle cx="500" cy="350" r="88" fill="none" stroke="#97f3e9" stroke-width="4" opacity=".45"/>'+
    label(500,52,'FUTSTANCY • FORMAÇÃO 4-3-3',32,'#ffffff','middle')+blocks);
}
function scoreSvg(u:URL):string{
  const home=u.searchParams.get('sh')??'0',away=u.searchParams.get('sa')??'0';
  return shell(1000,530,
    '<rect x="70" y="95" width="860" height="305" rx="35" fill="#0a172d" stroke="#67d8ff" stroke-width="6"/>'+
    label(500,75,'FUTSTANCY • FIM DE JOGO',30,'#b7e8ff','middle')+
    label(500,305,home+'  ×  '+away,120,'#ffffff','middle')+
    label(500,468,'PARTIDA ENCERRADA',32,'#f7d28b','middle'));
}
async function raster(svg:string):Promise<Response>{
  const {Resvg}=await import('@cf-wasm/resvg/workerd');
  const instance=await Resvg.async(svg,{fitTo:{mode:'width',value:850}});
  const bytes=instance.render().asPng() as Uint8Array<ArrayBuffer>;
  return new Response(bytes,{headers:{'content-type':'image/png','cache-control':'public, max-age=7200','x-content-type-options':'nosniff'}});
}
export async function renderArt(req:Request):Promise<Response|null>{
  const u=new URL(req.url);
  if(!u.pathname.startsWith('/art/'))return null;
  if(u.pathname==='/art/player.png'){
    const player=getPlayer(u.searchParams.get('k')??'');
    if(!player)return new Response('Jogador não encontrado',{status:404});
    try{return await raster(await playerSvg(player))}
    catch(error){
      console.error('[ART PLAYER]',error);
      const image=await photoUrl(player.key);
      return image?Response.redirect(image,302):new Response('Imagem indisponível',{status:503});
    }
  }
  try{
    if(u.pathname==='/art/banner.png')return await raster(bannerSvg(u));
    if(u.pathname==='/art/team.png')return await raster(teamSvg(u));
    if(u.pathname==='/art/score.png')return await raster(scoreSvg(u));
  }catch(error){console.error('[ART]',error);return new Response('Imagem indisponível',{status:503});}
  return null;
}
