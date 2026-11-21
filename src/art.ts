import { getPlayer, type Player } from './catalog.ts';

/** Futstancy V2: all game displays are a single original PNG per Discord message. */
const encyclopedia: Record<string, string> = {
  courtois:'Thibaut Courtois', alisson:'Alisson Becker', ederson:'Ederson (footballer, born 1993)',
  donnarumma:'Gianluigi Donnarumma', terstegen:'Marc-André ter Stegen', unai:'Unai Simón',
  bento:'Bento (footballer, born 1999)', mamardashvili:'Giorgi Mamardashvili',
  vandijk:'Virgil van Dijk', rudiger:'Antonio Rüdiger', saliba:'William Saliba', dias:'Rúben Dias',
  hakimi:'Achraf Hakimi', militao:'Éder Militão', araujo:'Ronald Araújo', gabriel:'Gabriel Magalhães',
  carvajal:'Dani Carvajal', bremer:'Bremer (footballer, born 1997)', renan:'Renan Lodi',
  danilo:'Danilo (footballer, born July 1991)', casemiro:'Casemiro', rodri:'Rodri (footballer, born 1996)',
  bellingham:'Jude Bellingham', debruyne:'Kevin De Bruyne', pedri:'Pedri', valverde:'Federico Valverde',
  bruno:'Bruno Fernandes', musiala:'Jamal Musiala', macallister:'Alexis Mac Allister',
  paqueta:'Lucas Paquetá', gerson:'Gerson (footballer, born 1997)', joaogomes:'João Gomes (footballer, born 2001)',
  mbappe:'Kylian Mbappé', haaland:'Erling Haaland', vinicius:'Vinícius Júnior', salah:'Mohamed Salah',
  kane:'Harry Kane', lamine:'Lamine Yamal', raphinha:'Raphinha (footballer, born 1996)',
  lautaro:'Lautaro Martínez', saka:'Bukayo Saka', leao:'Rafael Leão', richarlison:'Richarlison',
  endrick:'Endrick (footballer, born 2006)',
};
const xml = (s: unknown) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const safe = (s: unknown, limit = 38) => xml(String(s ?? '').replace(/[\r\n\t]/g, ' ').slice(0, limit));
const fmt = (value: number) => Math.round(value).toLocaleString('pt-BR');
const txt = (x:number,y:number,value:unknown,size=30,fill='#ffffff',weight=800,anchor='start') =>
  `<text x="${x}" y="${y}" font-family="Lato,DejaVu Sans,sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${safe(value,55)}</text>`;
const box = (x:number,y:number,w:number,h:number,rad=16,fill='#131629',stroke='none',sw=1) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rad}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const stroke = (x1:number,y1:number,x2:number,y2:number,color='#8549cc',width=2,opacity=1) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`;
const palette = {bg:'#060915',mid:'#0d1025',purple:'#b566ff',violet:'#6d28d9',gold:'#ffcf78',ice:'#9de8ff',soft:'#c5bedb'};
const gradients = `<defs>
  <linearGradient id="bg" x2="1" y2="1"><stop stop-color="#060814"/><stop offset=".56" stop-color="#11102b"/><stop offset="1" stop-color="#151141"/></linearGradient>
  <linearGradient id="metal" x2="1" y2="1"><stop stop-color="#fff4bd"/><stop offset=".28" stop-color="#d7b363"/><stop offset=".53" stop-color="#744b9a"/><stop offset=".78" stop-color="#f7d586"/><stop offset="1" stop-color="#b89cff"/></linearGradient>
  <linearGradient id="electric" x2="1" y2="1"><stop stop-color="#c6a7ff"/><stop offset=".45" stop-color="#6232ee"/><stop offset="1" stop-color="#61d5ff"/></linearGradient>
  <linearGradient id="portrait" x2="0" y2="1"><stop stop-color="#140e2b" stop-opacity="0"/><stop offset=".66" stop-color="#130c27" stop-opacity=".1"/><stop offset="1" stop-color="#0a081e" stop-opacity="1"/></linearGradient>
  <radialGradient id="halo"><stop stop-color="#9757ff" stop-opacity=".5"/><stop offset="1" stop-color="#9757ff" stop-opacity="0"/></radialGradient>
  <pattern id="field" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M0 100V0H100" fill="none" stroke="#60f0ff" stroke-width="1" opacity=".09"/></pattern>
</defs>`;
const svg = (w:number,h:number,inner:string) => `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${gradients}<rect width="${w}" height="${h}" fill="url(#bg)"/><rect width="${w}" height="${h}" fill="url(#field)"/><ellipse cx="${w*.67}" cy="${h*.17}" rx="${w*.51}" ry="${h*.75}" fill="url(#halo)"/>${inner}</svg>`;
const brand = (w:number) => txt(40,50,'FUTSTANCY',24,palette.ice,900) + txt(w-40,49,'FUTSTANCY  •  SEASON 01',15,palette.soft,700,'end') + stroke(40,67,w-40,67,'#834cc9',2,.6);
const accentFor = (ovr:number) => ovr>=90?'#ffcf78':ovr>=86?'#b67cff':ovr>=80?'#87c9ff':'#b4bccf';
const category = (ovr:number) => ovr>=90?'LENDÁRIO':ovr>=86?'ÉPICO':ovr>=80?'OURO':'PRATA';
const defaultId = 'https://github.com/c9bleblestro/futstancy';

/** Wikimedia requires a descriptive User-Agent and may reject generic Cloudflare requests. */
const agent = 'Futstancy/2.0 ('+defaultId+'; contact: repository issues)';
const photos = new Map<string,Promise<string|null>>();
async function resolvePhoto(player:Player):Promise<string|null> {
  const title=encyclopedia[player.key];if(!title)return null;
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),7000);
  try {
    // Retratos com licencas verificadas, armazenados no proprio repositorio.
    // A API da Wikipedia nao e mais consultada para esses jogadores.
    const photoAsset='https://raw.githubusercontent.com/c9bleblestro/futstancy/main/assets/portraits/'+encodeURIComponent(player.key)+'.jpg';
    try {
      const own=await fetch(photoAsset,{signal:ctrl.signal,headers:{Accept:'image/jpeg'}});
      if(own.ok && (own.headers.get('content-type')??'').startsWith('image/jpeg')){
        const bytes=new Uint8Array(await own.arrayBuffer());
        if(bytes.byteLength>0 && bytes.byteLength<=150000){
          let binary='';
          for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
          return 'data:image/jpeg;base64,'+btoa(binary);
        }
      }
    }catch{ /* Fallback Wikimedia abaixo para fotos ainda ausentes. */ }
    const api=new URL('https://en.wikipedia.org/w/api.php');
    api.searchParams.set('action','query');api.searchParams.set('format','json');
    api.searchParams.set('prop','pageimages');api.searchParams.set('pithumbsize','240');api.searchParams.set('titles',title);
    const res=await fetch(api,{headers:{'User-Agent':agent,'Api-User-Agent':agent,'Accept':'application/json'},signal:ctrl.signal});
    if(!res.ok)return null;
    const json=await res.json() as {query?:{pages?:Record<string,{thumbnail?:{source?:string}}>}};
    const source=Object.values(json.query?.pages??{})[0]?.thumbnail?.source;
    if(!source||!source.startsWith('https://upload.wikimedia.org/'))return null;
    const image=await fetch(source,{headers:{'User-Agent':agent},signal:ctrl.signal});
    if(!image.ok)return null;
    const mime=image.headers.get('content-type')?.split(';')[0]??'';
    if(!['image/jpeg','image/png','image/webp'].includes(mime))return null;
    const len=Number(image.headers.get('content-length')??'0');if(len>600_000)return null;
    const bytes=new Uint8Array(await image.arrayBuffer());if(bytes.length>600_000)return null;
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return `data:${mime};base64,${btoa(binary)}`;
  }catch(err) {
    console.warn('[PORTRAIT]',player.key,err instanceof Error?err.message:String(err));return null;
  }finally{clearTimeout(timer);}
}
function playerPhoto(player:Player):Promise<string|null>{
  const current=photos.get(player.key);if(current)return current;
  const promise=resolvePhoto(player);
  photos.set(player.key,promise);
  // Temporary failures must be retriable on the next request.
  void promise.then(value=>{if(!value)photos.delete(player.key);});
  return promise;
}

/** Draws a reusable full mini-card in a 236×312 coordinate system. */
function playerTile(p:Player|null,x:number,y:number,w:number,h:number,photo:string|null,idx:number):string {
  const scale=Math.min(w/236,h/312);const a=p?accentFor(p.ovr):'#63718f';
  const name=p?.name??'Vaga vazia';
  const portraitId=`port-${idx}`;
  const photoNode=photo
    ? `<image href="${photo}" x="35" y="67" width="166" height="176" preserveAspectRatio="xMidYMid slice" clip-path="url(#${portraitId})"/>`
    : `<circle cx="118" cy="158" r="84" fill="#24134a"/><text x="118" y="185" font-family="Lato,sans-serif" font-size="76" text-anchor="middle" font-weight="900" fill="#9c7dd3">${safe(p?.name.split(' ').map(x=>x[0]).join('').slice(0,2)??'?',3)}</text>`;
  return `<g transform="translate(${x},${y}) scale(${scale})">
    <defs><clipPath id="${portraitId}"><rect x="35" y="67" width="166" height="176" rx="13"/></clipPath></defs>
    <path d="M33 5L118 -2L203 5L232 36L218 247L118 310L18 247L4 36Z" fill="#0c1021" stroke="${a}" stroke-width="5"/>
    <path d="M39 17L118 8L197 17L215 42L201 235L118 292L35 235L21 42Z" fill="#101229" stroke="#a166fa" stroke-width="1.5"/>
    <circle cx="118" cy="133" r="105" fill="url(#halo)"/>
    ${photoNode}<rect x="35" y="67" width="166" height="176" fill="url(#portrait)"/>
    ${box(21,41,74,76,13,'#080c1ddd')}${txt(58,79,String(p?.ovr??'--'),38,'#fff',900,'middle')}${txt(58,105,p?.pos??'--',17,a,900,'middle')}
    ${box(17,229,202,44,12,'#090b1fe8',a,1)}${txt(118,258,name,name.length>16?18:21,'#fff',900,'middle')}
    ${txt(118,293,category(p?.ovr??0),13,a,900,'middle')}
  </g>`;
}
function summaryTitle(title:string,subtitle:string,w:number):string{
  return brand(w)+txt(40,119,title,48,'#ffffff',900)+txt(42,155,subtitle,20,'#beb6da',600);
}
function listPlayers(u:URL):Player[]{
  return (u.searchParams.get('k')??'').split(',').slice(0,12).map(k=>getPlayer(k)).filter((p):p is Player=>Boolean(p));
}
async function portraitSet(players:Player[]):Promise<(string|null)[]> {
  return Promise.all(players.map(p=>playerPhoto(p)));
}
function artPlayer(p:Player,photo:string|null):string{
  const a=accentFor(p.ovr);
  const left=playerTile(p,58,118,550,727,photo,0);
  const body=brand(1190)+txt(646,185,'NOVA CONTRATAÇÃO',27,palette.purple,900)
    +txt(646,273,p.name,p.name.length>18?39:50,'#fff',900)
    +box(645,321,480,112,22,'#17112d','#6039a9',2)
    +txt(685,373,'OVR',24,palette.soft,700)+txt(1090,407,p.ovr,84,a,900,'end')
    +box(645,455,228,93,20,'#17112d','#5d4395',2)+txt(671,490,'POSIÇÃO',19,palette.soft,800)+txt(671,527,p.pos,34,'#fff',900)
    +box(895,455,230,93,20,'#17112d','#5d4395',2)+txt(920,490,'RARIDADE',19,palette.soft,800)+txt(920,527,category(p.ovr),27,a,900)
    +box(645,574,480,122,22,'#17112d','#5d4395',2)+txt(671,611,'NACIONALIDADE',18,palette.soft,800)+txt(671,657,p.country,34,'#fff',900)
    +stroke(645,738,1125,738,'#a365ff',2,.65)+txt(645,790,'CLUBE • COLEÇÃO • MERCADO',21,palette.ice,800)
    +txt(645,826,'Retrato: Wikimedia Commons, quando disponível',14,palette.soft,500);
  return svg(1190,885,left+body);
}
async function artCollection(u:URL):Promise<string>{
  const players=listPlayers(u).slice(0,8);const photos=await portraitSet(players);
  const total=u.searchParams.get('total')??String(players.length);
  const page=u.searchParams.get('page')??'1';
  const head=summaryTitle('MINHA COLEÇÃO','Todos os seus craques em uma única galeria',1180)
    +box(816,100,321,56,16,'#1e1538','#8045cb',2)
    +txt(840,137,`${total} CARTAS   •   PÁG. ${page}`,20,palette.gold,900);
  // Na ultima pagina (1 a 3 cartas), as cartas ficam maiores e centralizadas.
  const short=players.length>0 && players.length<=3;
  const tileW=short?312:244;
  const tileH=short?412:320;
  const gap=short?40:42;
  const totalWidth=short?players.length*tileW+(players.length-1)*gap:0;
  const margin=short?(1180-totalWidth)/2:47;
  const tiles=players.map((p,i)=>{
    const x=short?margin+i*(tileW+gap):47+(i%4)*286;
    const y=short?200:187+Math.floor(i/4)*332;
    return playerTile(p,x,y,tileW,tileH,photos[i],i);
  }).join('');
  const rest=players.length?tiles:txt(590,420,'Sua coleção está vazia',40,'#fff',800,'middle');
  const canvasHeight=short?690:883;
  return svg(1180,canvasHeight,head+rest+stroke(40,canvasHeight-29,1140,canvasHeight-29,'#8d51dc',2,.7)+txt(590,canvasHeight-10,'FUTSTANCY  •  COLECIONE  •  EVOLUA  •  VENÇA',13,palette.soft,700,'middle'));
}
async function artMarket(u:URL):Promise<string>{
  const players=listPlayers(u).slice(0,8);const photos=await portraitSet(players);
  const prices=(u.searchParams.get('prices')??'').split(',').slice(0,8).map(p=>Number(p));
  const head=summaryTitle('MERCADO DE TRANSFERÊNCIAS','Contrate reforços para dominar a temporada',1180)
    +box(833,103,300,50,16,'#1c1338','#7c3aed',2)+txt(983,136,'MERCADO ABERTO',21,'#9effd5',900,'middle');
  const tiles=players.map((p,i)=>{
    const x=43+(i%4)*286,y=182+Math.floor(i/4)*377;
    return playerTile(p,x,y,244,321,photos[i],i)
      +box(x,y+331,244,59,15,'#14132d','#6847b3',1.5)
      +txt(x+122,y+372,Number.isFinite(prices[i])?fmt(prices[i]):'---',27,palette.gold,900,'middle');
  }).join('');
  const fallback=txt(590,400,'Nenhuma carta anunciada no momento',34,palette.soft,800,'middle');
  const height=players.length>4?1000:665;
  return svg(1180,height,head+(players.length?tiles:fallback)+txt(42,height-18,'FUTSTANCY  •  Compre pelos botões e consulte os códigos abaixo',16,palette.soft,600));
}
async function artPack(u:URL):Promise<string>{
  const players=listPlayers(u).slice(0,3);const photos=await portraitSet(players);
  const head=summaryTitle('PACOTE ABERTO','Três novas cartas para seu elenco',1180);
  const tiles=players.map((p,i)=>playerTile(p,135+i*333,192,274,360,photos[i],i)).join('');
  return svg(1180,625,head+tiles+txt(590,591,'NOVOS JOGADORES  •  REVEJA A SUA COLEÇÃO',21,palette.gold,900,'middle'));
}
async function artTeam(u:URL):Promise<string>{
  const keys=(u.searchParams.get('k')??'').split(',').slice(0,11);
  const players=keys.map(k=>getPlayer(k)??null);
  const photos=await Promise.all(players.map(p=>p?playerPhoto(p):Promise.resolve(null)));
  const power=safe(u.searchParams.get('power')??'--',10);
  const positions:[[number,number],...Array<[number,number]>]=[
    [515,670],[115,505],[335,505],[695,505],[915,505],
    [225,335],[515,330],[805,335],[220,159],[515,150],[810,159],
  ];
  let pitch=box(35,95,1130,760,34,'#06352c','#25c6b0',3);
  pitch+=`<path d="M70 430H1130M70 110H1130M70 840H1130" stroke="#8dd9d3" stroke-width="3" opacity=".35"/>`;
  pitch+=`<circle cx="600" cy="452" r="114" fill="none" stroke="#8dd9d3" stroke-width="3" opacity=".35"/>`;
  pitch+=`<rect x="330" y="112" width="540" height="140" fill="none" stroke="#8dd9d3" stroke-width="3" opacity=".25"/>`;
  pitch+=`<rect x="330" y="685" width="540" height="140" fill="none" stroke="#8dd9d3" stroke-width="3" opacity=".25"/>`;
  let tiles='';
  for(let i=0;i<11;i++){const [x,y]=positions[i];tiles+=playerTile(players[i],x,y,172,226,photos[i],i)}
  const header=brand(1200)+box(407,45,390,60,20,'#0c0e22','#e7bd65',3)+txt(602,85,`FORÇA DO TIME  ${power} OVR`,27,'#ffe6a2',900,'middle');
  return svg(1200,906,pitch+tiles+header+txt(600,887,'4 - 3 - 3  •  FUTSTANCY FC',17,palette.ice,800,'middle'));
}
function artScore(u:URL):string{
  const sh=safe(u.searchParams.get('sh')??'0',3),sa=safe(u.searchParams.get('sa')??'0',3);
  const a=safe(u.searchParams.get('home')??'CASA',24),b=safe(u.searchParams.get('away')??'VISITANTE',24);
  return svg(1180,555,summaryTitle('RESULTADO FINAL','O apito final encerra mais um duelo',1180)
    +box(67,195,1046,263,35,'#0d0b22','#8e58ea',3)
    +txt(279,280,a,31,'#fff',900,'middle')+txt(900,280,b,31,'#fff',900,'middle')
    +txt(590,381,`${sh}   X   ${sa}`,95,palette.gold,900,'middle')
    +txt(590,507,'FUTSTANCY  •  PLAY FAIR  •  MATCHDAY',22,palette.ice,800,'middle'));
}
function artBanner(u:URL):string{
  const title=safe(u.searchParams.get('t')??'FUTSTANCY',35);
  const subtitle=safe(u.searchParams.get('s')??'Seu clube. Sua história.',80);
  return svg(1180,405,brand(1180)
    +`<circle cx="1020" cy="205" r="180" fill="none" stroke="#8a55ee" stroke-width="10" opacity=".35"/>`
    +`<circle cx="1020" cy="205" r="104" fill="none" stroke="#72cbf7" stroke-width="7" opacity=".25"/>`
    +txt(55,200,title,title.length>22?43:55,'#fff',900)
    +txt(58,262,subtitle,subtitle.length>46?23:28,palette.soft,600)
    +stroke(56,327,1100,327,'#b678ff',3,.75)
    +txt(58,366,'MONTE O TIME  •  VENÇA PARTIDAS  •  CONQUISTE O TOPO',19,palette.gold,800));
}

let fontPromise:Promise<Uint8Array>|undefined;
async function fontBytes():Promise<Uint8Array>{
  if(!fontPromise)fontPromise=(async()=>{
    const res=await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Bold.ttf');
    if(!res.ok)throw new Error(`Fonte HTTP ${res.status}`);
    const font=new Uint8Array(await res.arrayBuffer());
    if(font.byteLength>1_200_000)throw new Error('Fonte excessivamente grande');
    return font;
  })().catch(e=>{fontPromise=undefined;throw e});
  return fontPromise;
}
async function png(image:string):Promise<Response>{
  const { Resvg }=await import('@cf-wasm/resvg/workerd');
  const font=await fontBytes();
  const instance=await Resvg.async(image,{fitTo:{mode:'original'},font:{fontBuffers:[font],loadSystemFonts:false,defaultFontFamily:'Lato',sansSerifFamily:'Lato'}});
  const bytes=instance.render().asPng() as Uint8Array<ArrayBuffer>;
  return new Response(bytes,{headers:{'content-type':'image/png','cache-control':'public, max-age=3600','x-content-type-options':'nosniff'}});
}
export async function renderArt(req:Request):Promise<Response|null>{
  const u=new URL(req.url);
  if(!u.pathname.startsWith('/art/'))return null;
  // Keep GET URLs bounded: no API input is trusted merely because it comes from a rendered UI.
  if(u.search.length>2000)return new Response('Parâmetros grandes demais',{status:400});
  try {
    if(u.pathname==='/art/player.png'){
      const player=getPlayer(u.searchParams.get('k')??'');
      if(!player)return new Response('Jogador não encontrado',{status:404});
      return await png(artPlayer(player,await playerPhoto(player)));
    }
    if(u.pathname==='/art/collection.png')return await png(await artCollection(u));
    if(u.pathname==='/art/market.png')return await png(await artMarket(u));
    if(u.pathname==='/art/pack.png')return await png(await artPack(u));
    if(u.pathname==='/art/team.png')return await png(await artTeam(u));
    if(u.pathname==='/art/score.png')return await png(artScore(u));
    if(u.pathname==='/art/banner.png')return await png(artBanner(u));
    return null;
  }catch(error){
    console.error('[ART V2]',u.pathname,error instanceof Error?error.message:String(error));
    return new Response('Falha temporária ao renderizar imagem',{status:503});
  }
}
