import {font} from './squad-image.ts';

/** Mercado V6: versão em SVG rasterizada como PNG pelo Worker.
 * Composição baseada na arte aprovada (estádio noturno, ouro e ciano).
 * Só elementos decorativos: nenhum valor inventado em anúncios.
 */
export function buildMarketBannerSvg():string{
  const lamps=[...Array(20)].map((_,i)=>{
    const x=930+i*26,y=30-(i%5)*3;
    return '<circle cx="'+x+'" cy="'+y+'" r="'+(i%3===0?5:3)+'" fill="#f8f7eb" opacity=".88"/>';
  }).join('');
  const dots=[...Array(45)].map((_,i)=>{
    const x=615+(i*97)%890,y=15+(i*43)%360;
    return '<circle cx="'+x+'" cy="'+y+'" r="1.5" fill="#ebc978" opacity=".35"/>';
  }).join('');
  const card=(x:number,y:number,w:number,h:number,color:string,stroke:string,glow:string,shadow=false)=>
    '<g transform="translate('+x+' '+y+')">'+
    (shadow?'<path d="M22 9H'+(w-21)+'L'+w+' 44V'+(h-31)+'L'+(w-20)+' '+h+'H19L0 '+(h-28)+'V46Z" fill="'+glow+'" opacity=".30" filter="url(#bigGlow)"/>':'')+
    '<path d="M26 5H'+(w-26)+'L'+w+' 39V'+(h-38)+'L'+(w-23)+' '+h+'H21L0 '+(h-34)+'V42Z" fill="'+color+'" stroke="'+stroke+'" stroke-width="5"/>'+
    '<path d="M30 20H'+(w-33)+'L'+(w-15)+' 48V'+(h-48)+'L'+(w-35)+' '+(h-18)+'H32L16 '+(h-52)+'V48Z" stroke="'+stroke+'" stroke-opacity=".5" stroke-width="2" fill="none"/>'+
    '<path d="M32 70L'+(w-34)+' 26L'+(w-8)+' 93L45 '+(h-48)+'Z" fill="'+stroke+'" opacity=".11"/>'+
    // silhouette: visible as collectible footballer card but not a fictional player
    '<circle cx="'+(w/2)+'" cy="111" r="30" fill="#020b12" opacity=".9"/>'+
    '<path d="M'+(w/2-66)+' '+(h-71)+'Q'+(w/2-55)+' 159 '+(w/2)+' 159Q'+
      (w/2+57)+' 159 '+(w/2+70)+' '+(h-71)+'V'+(h-43)+'H'+(w/2-66)+'Z" fill="#031019" opacity=".88"/>'+
    '<path d="M'+(w/2-51)+' '+(h-50)+'L'+(w/2+57)+' '+(h-50)+
      '" stroke="'+stroke+'" stroke-width="3" stroke-opacity=".45"/>'+
    '</g>';
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1520" height="400" viewBox="0 0 1520 400">',
    '<defs>',
    '<linearGradient id="bg" x2=".95" y2="1"><stop stop-color="#000b17"/><stop offset=".48" stop-color="#031a29"/><stop offset="1" stop-color="#1a191b"/></linearGradient>',
    '<radialGradient id="goldLight"><stop stop-color="#ffd975" stop-opacity=".46"/><stop offset="1" stop-color="#ffd975" stop-opacity="0"/></radialGradient>',
    '<radialGradient id="cyanLight"><stop stop-color="#1cf8ed" stop-opacity=".37"/><stop offset="1" stop-color="#12f0e1" stop-opacity="0"/></radialGradient>',
    '<linearGradient id="gold"><stop stop-color="#ffe8a0"/><stop offset=".45" stop-color="#d79931"/><stop offset=".8" stop-color="#a66c18"/><stop offset="1" stop-color="#fde1a4"/></linearGradient>',
    '<linearGradient id="silver"><stop stop-color="#f7fcff"/><stop offset=".6" stop-color="#d5dce7"/><stop offset="1" stop-color="#6f93a5"/></linearGradient>',
    '<linearGradient id="cardG" x2=".7" y2="1"><stop stop-color="#624316"/><stop offset=".4" stop-color="#0f121a"/><stop offset="1" stop-color="#392516"/></linearGradient>',
    '<linearGradient id="cardB" x2=".7" y2="1"><stop stop-color="#06545a"/><stop offset=".4" stop-color="#091f28"/><stop offset="1" stop-color="#01313d"/></linearGradient>',
    '<linearGradient id="cardS" x2=".7" y2="1"><stop stop-color="#929ba8"/><stop offset=".4" stop-color="#28323c"/><stop offset="1" stop-color="#667784"/></linearGradient>',
    '<filter id="bigGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="15"/></filter>',
    '</defs>',
    '<rect width="1520" height="400" fill="url(#bg)"/>',
    '<ellipse cx="1190" cy="112" rx="440" ry="270" fill="url(#goldLight)"/>',
    '<ellipse cx="900" cy="314" rx="500" ry="220" fill="url(#cyanLight)"/>',
    '<path d="M0 343Q430 287 792 352T1520 295" fill="none" stroke="#04ceca" stroke-width="5" opacity=".7"/>',
    '<path d="M0 364Q710 319 1244 350T1520 348" stroke="#f1bc58" stroke-width="2" opacity=".65"/>',
    '<path d="M0 0L190 0L0 155Z" fill="#9e7028" opacity=".15"/>',
    '<path d="M660 0L879 0L621 398L536 398Z" fill="#e5b95c" opacity=".11"/>',
    '<path d="M1520 0L1381 0L1520 155Z" fill="#24d3c6" opacity=".08"/>',
    lamps,dots,
    '<path d="M66 37V322" stroke="url(#gold)" stroke-width="9"/>',
    '<path d="M71 37V319" stroke="#fff1ba" stroke-width="2" opacity=".76"/>',
    '<path d="M91 34H545" stroke="#edb34e" stroke-opacity=".22"/>',
    '<text x="104" y="79" fill="#f3c974" font-family="Lato" font-size="32" letter-spacing="4">FUTSTANCY  /  MERCADO</text>',
    '<text x="105" y="218" fill="url(#silver)" font-family="Lato" font-size="103" font-weight="700" letter-spacing="1">MERCADO</text>',
    '<text x="107" y="277" fill="#d9e8ec" font-family="Lato" font-size="30" letter-spacing="4">NEGOCIE. REFORCE. CONQUISTE.</text>',
    '<path d="M106 323H409L390 333H106Z" fill="url(#gold)"/>',
    card(834,114,149,236,'url(#cardB)','#20dddf','#12f5fa'),
    card(1152,139,140,217,'url(#cardS)','#dfe8ef','#ffffff'),
    card(956,45,215,309,'url(#cardG)','#e4b954','#ffcc5b',true),
    // gold coins on the podium
    '<ellipse cx="1146" cy="363" rx="335" ry="33" fill="#01121a" stroke="#d49e41" stroke-width="5"/>',
    '<ellipse cx="1146" cy="356" rx="334" ry="26" fill="none" stroke="#56f4e0" stroke-opacity=".46" stroke-width="3"/>',
    '<rect x="860" y="292" width="112" height="13" rx="5" fill="url(#gold)"/><rect x="860" y="305" width="112" height="13" rx="5" fill="#ab741a"/>',
    '<rect x="860" y="318" width="112" height="13" rx="5" fill="url(#gold)"/>',
    '<circle cx="994" cy="326" r="50" fill="#0b2024" stroke="#f9cb66" stroke-width="7"/>',
    '<circle cx="994" cy="326" r="37" fill="#08262c" stroke="#8f5d17" stroke-width="2"/>',
    '<text x="994" y="342" font-family="Lato" font-size="51" font-weight="700" text-anchor="middle" fill="#f9d57a">F</text>',
    '<g transform="translate(1320 45)" stroke="#49f4e9" stroke-width="5" fill="none" opacity=".95">',
    '<path d="M0 25H128L105 5M128 25L106 47"/><path d="M130 69H0L20 47M0 69L22 88"/>',
    '</g>',
    '</svg>',
  ].join('');
}
export async function renderMarketBannerImage():Promise<Response>{
  try{
    const [{Resvg},bytes]=await Promise.all([import('@cf-wasm/resvg/workerd'),font()]);
    const resvg=await Resvg.async(buildMarketBannerSvg(),{
      fitTo:{mode:'original'},
      font:{fontBuffers:[bytes],loadSystemFonts:false,defaultFontFamily:'Lato',sansSerifFamily:'Lato'},
    });
    return new Response(resvg.render().asPng() as Uint8Array<ArrayBuffer>,{
      headers:{'content-type':'image/png','cache-control':'public,max-age=86400',
        'x-content-type-options':'nosniff'},
    });
  }catch(error){
    console.error('[MARKET BANNER]',error instanceof Error?error.message:String(error));
    return new Response('Banner indisponível',{status:503});
  }
}
