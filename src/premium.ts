import type { Player } from './catalog.ts';

/**
 * Futstancy visual language v3 — original vector templates.
 * All figures are derived from supplied game state. Photos are CC-licensed
 * snapshots from assets/portraits, not copied EA FC/eFootball card art.
 */
const escape = (value: unknown, size=60) => String(value ?? '').replace(/[\r\n\t]/g,' ').slice(0,size)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const T=(x:number,y:number,v:unknown,sz=30,color='#f5f7ff',wt=800,anchor='start')=>`<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-family="Lato,sans-serif" font-size="${sz}" font-weight="${wt}">${escape(v)}</text>`;
const R=(x:number,y:number,w:number,h:number,r=20,fill='#111a2c',stroke='none',sw=1)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const L=(x1:number,y1:number,x2:number,y2:number,c='#3299ee',w=2,opacity=1)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" opacity="${opacity}"/>`;
const fmt=(n:number)=>Number.isFinite(n)?Math.max(0,Math.round(n)).toLocaleString('pt-BR'):'—';
let FRAME_TEXTURE: string | null = null;
export function setCardFrameTexture(encodedDataUrl:string|null){FRAME_TEXTURE=encodedDataUrl;}
const DEFINITIONS=`<defs>
  <linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#050a15"/><stop offset=".5" stop-color="#0c1730"/><stop offset="1" stop-color="#09091c"/></linearGradient>
  <linearGradient id="premium" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#050d20"/><stop offset=".42" stop-color="#0f2445"/><stop offset=".7" stop-color="#070d1e"/><stop offset="1" stop-color="#080917"/></linearGradient>
  <linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#9cf3ff"/><stop offset=".25" stop-color="#1d8cff"/><stop offset=".5" stop-color="#c2f5ff"/><stop offset=".75" stop-color="#1868ed"/><stop offset="1" stop-color="#47d9ff"/></linearGradient>
  <linearGradient id="amber" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff2bc"/><stop offset=".28" stop-color="#cb7823"/><stop offset=".53" stop-color="#fff2a6"/><stop offset=".77" stop-color="#8e4d13"/><stop offset="1" stop-color="#ffd991"/></linearGradient>
  <linearGradient id="purple" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0ccff"/><stop offset=".26" stop-color="#a21fff"/><stop offset=".52" stop-color="#e0a1ff"/><stop offset=".76" stop-color="#6717bf"/><stop offset="1" stop-color="#e49bff"/></linearGradient>
  <linearGradient id="silver" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8fbff"/><stop offset=".3" stop-color="#778caa"/><stop offset=".54" stop-color="#e2f2ff"/><stop offset=".78" stop-color="#435775"/><stop offset="1" stop-color="#f2f8ff"/></linearGradient>
  <linearGradient id="emerald" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b0fff9"/><stop offset=".3" stop-color="#07aaae"/><stop offset=".54" stop-color="#72faff"/><stop offset=".78" stop-color="#036464"/><stop offset="1" stop-color="#c8fff8"/></linearGradient>
  <linearGradient id="photoFade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#111425" stop-opacity="0"/><stop offset=".62" stop-color="#090f1e" stop-opacity=".06"/><stop offset="1" stop-color="#020612" stop-opacity=".92"/></linearGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#16233e"/><stop offset="1" stop-color="#0b1429"/></linearGradient>
  <radialGradient id="spot"><stop stop-color="#117ccb" stop-opacity=".4"/><stop offset="1" stop-color="#117ccb" stop-opacity="0"/></radialGradient>
  <radialGradient id="violetSpot"><stop stop-color="#8d1cff" stop-opacity=".48"/><stop offset="1" stop-color="#8d1cff" stop-opacity="0"/></radialGradient>
  <filter id="glow" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="7"/></filter>
  <filter id="softglow" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="3"/></filter>
  <pattern id="wire" width="90" height="90" patternUnits="userSpaceOnUse"><path d="M90 0H0V90" fill="none" stroke="#398dec" stroke-opacity=".06"/></pattern>
</defs>`;
export function canvas(w:number,h:number,body:string,kind:'blue'|'violet'='blue'){
  const lights=Array.from({length:12},(_,i)=>`<circle cx="${25+i*(w-50)/11}" cy="${h*.37+(i%3)*5}" r="6" fill="#9be8ff" opacity=".6"/><circle cx="${25+i*(w-50)/11}" cy="${h*.37+(i%3)*5}" r="12" fill="#2b99ff" opacity=".14"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${DEFINITIONS}${FRAME_TEXTURE?`<defs><image id="futCardFrame" width="260" height="350" href="${FRAME_TEXTURE}"/></defs>`:''}
    <rect width="${w}" height="${h}" fill="url(#background)"/>
    <rect width="${w}" height="${h}" fill="url(#wire)"/>
    <ellipse cx="${w*.56}" cy="${h*.34}" rx="${w*.64}" ry="${h*.48}" fill="url(#${kind==='blue'?'spot':'violetSpot'})"/>
    <path d="M0 ${h*.37} Q${w*.5} ${h*.25} ${w} ${h*.37}" stroke="#2b8ddb" stroke-width="18" opacity=".16" fill="none"/>
    <path d="M0 ${h*.38} Q${w*.5} ${h*.29} ${w} ${h*.38}" stroke="#a7eaff" stroke-width="3" opacity=".32" fill="none"/>
    ${lights}
    ${L(24,h-35,w-24,h-35,'#2cabff',2,.32)}
    ${body}</svg>`;
}
const themeFor=(p:Player)=>{
  // Different player cards get distinct moods; rarity text is still based on actual OVR.
  if(p.key==='vinicius'||p.key==='bellingham')return {name:'Í C O N E',stroke:'url(#ice)',accent:'#63dfff',shade:'#06346c'};
  if(p.key==='mbappe'||p.key==='kane')return {name:'L E N D Á R I O',stroke:'url(#amber)',accent:'#ffd27d',shade:'#443006'};
  if(p.key==='haaland')return {name:'Í C O N E',stroke:'url(#emerald)',accent:'#43f9dc',shade:'#005b63'};
  if(p.key==='salah')return {name:'Í C O N E',stroke:'url(#purple)',accent:'#db8fff',shade:'#522e6f'};
  if(p.ovr>=90)return {name:'Í C O N E',stroke:'url(#amber)',accent:'#ffd27d',shade:'#433007'};
  if(p.ovr>=86)return {name:'D I A M A N T E',stroke:'url(#purple)',accent:'#d28dff',shade:'#3e125c'};
  if(p.ovr>=80)return {name:'O U R O',stroke:'url(#ice)',accent:'#84c7ff',shade:'#0c345b'};
  return {name:'P R A T A',stroke:'url(#silver)',accent:'#d3e7ff',shade:'#263953'};
};
const flags:Record<string, [string,string,string]>= {
  Brasil:['#009b3a','#ffdf00','#002776'],
  Argentina:['#75bdf3','#ffffff','#75bdf3'],
  França:['#0c2c91','#fff','#e31b23'],
  Inglaterra:['#fff','#d22330','#fff'],
  Espanha:['#c4112e','#f9c632','#c4112e'],
  Noruega:['#ba1c31','#fff','#21468b'],
  Portugal:['#006600','#ff0000','#ffcc00'],
  Egito:['#cd1d2c','#fff','#000'],
  Bélgica:['#111','#f6d317','#ef233c'],
  Alemanha:['#111','#cc1c27','#f7ce3b'],
  Itália:['#009246','#fff','#ce2b37'],
  Uruguai:['#8ec5fa','#fff','#8ec5fa'],
  Marrocos:['#c1272d','#c1272d','#006233'],
  Holanda:['#ae1c28','#fff','#21468b']
};
function flag(country:string,x:number,y:number,w=34,h=22){
 const parts=flags[country]??['#0d4890','#e2efff','#0d4890'];
 let output=R(x,y,w,h,1,'#eaf3ff','#f5f5f5',1);
 if(country==='Brasil')return output+R(x,y,w,h,0,'#009739')+`<polygon points="${x+w*.5},${y+2} ${x+w-3},${y+h*.5} ${x+w*.5},${y+h-2} ${x+3},${y+h*.5}" fill="#fedf00"/><circle cx="${x+w*.5}" cy="${y+h*.5}" r="${h*.24}" fill="#002776"/>`;
 if(country==='Inglaterra')return output+R(x,y,w,h,0,'#fff')+R(x+w*.42,y,w*.16,h,0,'#c8102e')+R(x,y+h*.38,w,h*.24,0,'#c8102e');
 if(country==='Marrocos')return output+R(x,y,w,h,0,'#c1272d')+T(x+w*.5,y+h*.75,'★',h*.6,'#006233',900,'middle');
 if(country==='Noruega')return output+R(x,y,w,h,0,'#ba1c31')+R(x+w*.29,y,w*.27,h,0,'#fff')+R(x,y+h*.39,w,h*.28,0,'#fff')+R(x+w*.35,y,w*.15,h,0,'#00205b')+R(x,y+h*.45,w,h*.16,0,'#00205b');
 if(country==='França'||country==='Portugal'||country==='Itália'||country==='Bélgica') for(let i=0;i<3;i++)output+=R(x+w*i/3,y,w/3,h,0,parts[i]);
 else for(let i=0;i<3;i++)output+=R(x,y+h*i/3,w,h/3,0,parts[i]);
 return output;
}
function badge(x:number,y:number,label:string,value:string,width:number){return R(x,y,width,60,17,'url(#glass)','#2c4366',2)+T(x+18,y+25,label,15,'#a1b7d4',700)+T(x+width-18,y+45,value,27,'#f9fcff',900,'end');}
export function brand(w:number,section:string,subtitle:string,extra=''){
  return T(49,54,'FUTSTANCY',25,'#8edfff',900)+T(w-49,54,'SEASON 01  •  '+section,18,'#bcc7e4',700,'end')+
   L(45,77,w-45,77,'#356f9d',2,.7)+T(49,135,section,section.length>23?33:47,'#f8faff',900)+T(49,171,subtitle,23,'#bfcee8',600)+extra;
}
export function playerCard(p:Player,x:number,y:number,w:number,h:number,photo:string|null,id:string){
  const S=Math.min(w/260,h/350),theme=themeFor(p);const cardId=escape(id,30);
  const outer=`M55 13L130 0L205 13L248 50L240 289L130 350L20 289L12 50Z`;
  const inner=`M62 25L130 13L198 25L235 55L229 280L130 334L31 280L25 55Z`;
  const face=photo?`<image href="${photo}" x="35" y="57" width="190" height="237" preserveAspectRatio="xMidYMid slice" clip-path="url(#portrait${cardId})"/>`:
    `<circle cx="130" cy="165" r="70" fill="#193757"/><text x="130" y="188" font-size="68" text-anchor="middle" fill="#bfe8ff" font-weight="900">${escape(p.name.slice(0,1))}</text>`;
  const streaks=Array.from({length:8},(_,i)=>`<path d="M${i%2?235:29} ${88+i*23}l${i%2?-45:45} -${16+i*2}" stroke="${theme.accent}" stroke-width="${i%3+2}" opacity=".22"/>`).join('');
  const scale=`translate(${x},${y}) scale(${S})`;
  return `<g transform="${scale}">
  <defs><clipPath id="portrait${cardId}"><path d="M33 60L227 60L222 286L130 327L38 286Z"/></clipPath></defs>
  <path d="${outer}" fill="none" stroke="${theme.accent}" stroke-width="17" opacity=".5" filter="url(#glow)"/>
  <path d="${outer}" fill="#060d1b" stroke="${theme.stroke}" stroke-width="8"/>
  <path d="${inner}" fill="${theme.shade}" stroke="${theme.accent}" stroke-width="2"/>
  <path d="M60 37L129 23L199 37L223 62L208 275L129 322L47 275L36 62Z" fill="url(#premium)"/>
  ${streaks}${face}
  <path d="M34 64L225 64V289L130 331L35 289Z" fill="url(#photoFade)"/>
  ${FRAME_TEXTURE?'<use href="#futCardFrame"/>':''}
  <path d="M32 280L130 330L228 280" fill="none" stroke="${theme.accent}" stroke-width="4"/>
  ${R(27,67,57,78,6,'#06101cf4',theme.accent,1.2)}
  ${T(55,107,String(p.ovr),35,'#fff',900,'middle')}${T(55,132,p.pos,16,'#fff',900,'middle')}
  ${flag(p.country,28,152,39,26)}
  ${R(20,258,222,50,9,'#050a19ed',theme.accent,1.5)}
  ${T(131,291,p.name,p.name.length>18?16:p.name.length>13?19:23,'#fff',900,'middle')}
  ${R(65,308,130,25,12,'#081222',theme.accent,1)}${T(130,326,theme.name,13,theme.accent,900,'middle')}
  <path d="M112 337L130 324L148 337L130 350Z" fill="${theme.stroke}" stroke="#fff" stroke-width="1"/>
  <path d="M13 176L0 236L18 215M247 176L260 236L242 215" fill="${theme.stroke}" opacity=".77"/>
  </g>`;
}
function beamPanel(x:number,y:number,w:number,h:number,accent='#1e9ff9'){return R(x,y,w,h,24,'#07101fe6',accent,2)+R(x+9,y+9,w-18,h-18,18,'none','#27466a',1);}
export function collection(players:Player[],photos:(string|null)[],total:string,page:string){
 const w=1180,n=players.length,columns=3,rows=Math.ceil(n/3),size=n<=3?310:275;
 const gaps= n<=3?36:80;
 const startX= n<=3?Math.max(55,(w-n*size-(n-1)*gaps)/2):78;
 const startY=241;
 const height=rows<=1?710:1140;
 const cards=players.map((p,i)=>playerCard(p,startX+(i%3)*(size+gaps),startY+Math.floor(i/3)*395,size,370,photos[i],`col${i}`)).join('');
 const panel=beamPanel(29,210,1122,height-245,'#12639c')+
    T(53,201,'MEUS JOGADORES',19,'#9fcbf1',800)+
    badge(755,100,'CARTAS',total,177)+badge(950,100,'PÁGINA',page,186);
 const foot=T(590,height-53,'FILTRAR     •     ESCALAR     •     EVOLUIR',20,'#9dc5ea',800,'middle');
 return canvas(w,height,brand(w,'SUA COLEÇÃO','Todos os craques do seu clube em uma única galeria')+panel+cards+foot);
}
export function market(players:Player[],photos:(string|null)[],prices:number[],codes:string[]){
 const w=1180,n=players.length,h=Math.max(540,258+n*236);
 let rows='';
 for(let i=0;i<n;i++){
  const y=226+i*236,p=players[i];const color=themeFor(p).accent;
  rows+=beamPanel(35,y,1110,223,'#2c80ce')+
    playerCard(p,63,y+4,162,214,photos[i],`market${i}`)+
    T(275,y+61,p.name.toUpperCase(),p.name.length>20?26:33,'#fff',900)+
    badge(274,y+81,'OVR',String(p.ovr),135)+badge(427,y+81,'POS',p.pos,133)+badge(575,y+81,'RARIDADE',themeFor(p).name.replaceAll(' ',''),256)+
    R(270,y+155,520,50,13,'#101b31','#294e75',1)+T(292,y+188,fmt(prices[i])+' COINS',27,'#ffda7f',900)+
    R(856,y+85,258,48,14,'#122c55','#367cc3',1)+T(986,y+116,'COMPRA '+(i+1),22,'#d9efff',900,'middle')+
    T(869,y+176,'CÓDIGO: '+(codes[i]??'—').slice(0,16),16,'#9cb7d4',700);
 }
 if(!n)rows=beamPanel(35,226,1110,240,'#317aca')+T(590,370,'NENHUM JOGADOR À VENDA NO MOMENTO',30,'#cde7fc',800,'middle');
 const header=brand(w,'MERCADO DE TRANSFERÊNCIAS','Encontre os reforços que faltam para seu elenco')+badge(757,158,'MERCADO','ABERTO',180)+badge(957,158,'ANÚNCIOS',String(n),178);
 const min=Math.min(...prices),max=Math.max(...prices),footer=T(590,h-22,n?`MENOR PREÇO  ${fmt(min)}       •       MAIOR PREÇO  ${fmt(max)}`:'ANUNCIE O SEU PRIMEIRO JOGADOR',19,'#8edfff',800,'middle');
 return canvas(w,h,header+rows+footer);
}
export function team(players:(Player|null)[],photos:(string|null)[],power:string){
 const w=1180,h=1360;
 let field=beamPanel(35,205,1110,1093,'#13a6df');
 field+=R(67,251,1046,1000,35,'#042d2c','#5ccfe5',5);
 for(let i=0;i<9;i++)field+=R(83,278+i*108,1014,65,0,i%2?'#09403740':'#07564565');
 field+=`<path d="M87 740H1093M87 286H1093M87 1220H1093" fill="none" stroke="#a4faff" stroke-width="3" opacity=".35"/>`;
 field+=`<circle cx="590" cy="740" r="150" fill="none" stroke="#a4faff" stroke-width="3" opacity=".4"/>`;
 field+=`<rect x="308" y="280" width="564" height="175" fill="none" stroke="#a4faff" stroke-width="3" opacity=".35"/>`;
 field+=`<rect x="308" y="1050" width="564" height="174" fill="none" stroke="#a4faff" stroke-width="3" opacity=".35"/>`;
 const coords:[[number,number],...Array<[number,number]>]=[
  [495,1030],
  [98,840],[338,840],[646,840],[886,840],
  [212,606],[495,603],[778,606],
  [212,341],[495,333],[778,341]
 ];
 // Players are ordered according to the existing 4-3-3 positions, do not swap game state.
 for(let i=0;i<11;i++){const [x,y]=coords[i];if(players[i])field+=playerCard(players[i]!,x,y,170,227,photos[i]??null,`lineup${i}`);else field+=R(x,y,170,227,26,'#052e3b','#3c91aa',3)+T(x+85,y+115,'—',35,'#bfe9f2',700,'middle');}
 const header=brand(w,'SUA EQUIPE — 4-3-3','Seus onze titulares organizados no campo')+
   badge(795,95,'FORÇA TOTAL',power+' OVR',345);
 return canvas(w,h,field+header+T(590,1327,'FUTSTANCY FC   •   SUA ESCALAÇÃO TITULAR',20,'#96dcff',800,'middle'));
}
export function pack(players:Player[],photos:(string|null)[]){
 const w=1180,h=790,selected=[...players.keys()].sort((a,b)=>players[b].ovr-players[a].ovr);
 let body=brand(w,'PACOTE ABERTO!','Novas contratações para fortalecer sua equipe');
 body+=`<ellipse cx="590" cy="470" rx="470" ry="310" fill="url(#violetSpot)"/>`;
 for(let i=0;i<selected.length;i++){
   const idx=selected[i],p=players[idx],main=i===0;
   const x=main?398:i===1?100:836,y=main?180:313,ww=main?366:260,hh=main?492:350;
   body+=playerCard(p,x,y,ww,hh,photos[idx],`pack${idx}`);
 }
 body+=T(590,742,'3 NOVOS JOGADORES   •   VEJA SUA COLEÇÃO',23,'#ffd87d',900,'middle');
 return canvas(w,h,body,'violet');
}
export function obtained(player:Player,photo:string|null){
 const w=1180,h=800;
 const body=brand(w,'JOGADOR OBTIDO!','Uma nova estrela acabou de chegar ao seu clube')+
  `<ellipse cx="595" cy="465" rx="430" ry="340" fill="url(#violetSpot)"/>`+
  playerCard(player,398,162,385,518,photo,'newplayer')+
  T(109,403,'CONTRATAÇÃO',29,'#dfb8ff',900)+T(109,452,'CONFIRMADA',34,'#fff',900)+
  T(109,517,player.ovr+' OVR',42,'#ffd88b',900)+T(898,421,'FUTSTANCY',31,'#e0b9ff',900,'middle')+
  T(890,475,'NOVO',30,'#fff',800,'middle')+T(890,517,'REFORÇO',30,'#ffd47e',800,'middle')+
  T(590,752,'COLECIONE  •  EVOLUA  •  VENÇA',21,'#c1c8fa',900,'middle');
 return canvas(w,h,body,'violet');
}
export function score(home:string,away:string,a:string,b:string){
 const w=1180,h=610;
 const body=brand(w,'FIM DE JOGO','Uma partida histórica no Futstancy')+
  beamPanel(49,211,1082,304,'#2d7ed5')+
  T(225,289,home,32,'#e6f2ff',900,'middle')+T(950,289,away,32,'#e6f2ff',900,'middle')+
  T(590,420,`${a}   ×   ${b}`,112,'#ffe9ae',900,'middle')+
  T(590,565,'PARTIDA ENCERRADA   •   RESULTADO CONFIRMADO',24,'#8fd6fc',900,'middle');
 return canvas(w,h,body);
}
export function banner(title:string,subtitle:string){
 const w=1180,h=436;
 const t=escape(title,60),s=escape(subtitle,100),kind=/di[aá]ri|daily|recompensa|moeda|coins|pacote|contratad/i.test(t)?'violet':'blue';
 let body=T(52,54,'FUTSTANCY',25,'#8fe8ff',900)+L(48,78,1130,78,'#397ac2',3,.7)+
   beamPanel(40,115,1100,279,kind==='violet'?'#822cdb':'#1a83c9')+
   T(79,238,title,title.length>29?34:49,'#fff',900)+T(83,302,subtitle,subtitle.length>50?20:26,'#cbddfa',650)+
   T(89,362,'SEU CLUBE  •  SUA HISTÓRIA',20,'#91d7ff',850);
 body+=`<circle cx="1002" cy="249" r="107" fill="none" stroke="#9bdfff" stroke-width="4" opacity=".26"/><circle cx="1002" cy="249" r="57" fill="none" stroke="#9bdfff" stroke-width="4" opacity=".36"/>`;
 return canvas(w,h,body,kind);
}