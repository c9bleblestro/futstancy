import {getPlayer} from './catalog.ts';
import {squadStats} from './squad-layout.ts';
import type {Account,LineupRow} from './types.ts';

type Identity={name:string;avatarUrl:string|null};
export type PremiumProfileMedia={
  avatar?:string|null;
  star?:string|null;
  featuredPlayerKey?:string;
};

/**
 * FUTSTANCY / Perfil - blueprint faithful to approved preview:
 * central brand, teal polygon panels, cyan edge/glow, compact gold coins,
 * performance grid, bottom squad panel with an UNMODIFIED full edition mini card.
 *
 * All dynamic text and imagery are supplied at render time. No buttons on PNG.
 */
const xml=(v:unknown)=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const short=(v:string,length=26)=>v.replace(/[\r\n\t]/g,' ').trim().slice(0,length);
const fmt=(n:number)=>Math.max(0,Math.trunc(Number(n)||0)).toLocaleString('pt-BR');
const t=(x:number,y:number,s:string,sz=22,color='#f3fffe',extra='')=>
  '<text x="'+x+'" y="'+y+'" fill="'+color+'" font-family="Lato" font-size="'+sz+
  '" '+extra+'>'+xml(s)+'</text>';
const P='#37fce4',FADE='#9fcfce',WHITE='#f5ffff',GOLD='#f2c46e';
function polygon(x:number,y:number,w:number,h:number,r=20,fill='url(#panel)',stroke='#4ff7e0'){
  const p='M'+(x+r)+' '+y+'H'+(x+w-r)+'L'+(x+w)+' '+(y+r)+
    'V'+(y+h-r)+'L'+(x+w-r)+' '+(y+h)+'H'+(x+r)+
    'L'+x+' '+(y+h-r)+'V'+(y+r)+'Z';
  return '<path d="'+p+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2.3"/>'+
    '<path d="M'+(x+r+12)+' '+(y+4)+'H'+(x+w-r-12)+
    '" stroke="#9bfff1" stroke-opacity=".57" stroke-width="2"/>';
}
const rules=(xs:number[],y1:number,y2:number)=>xs.map(x=>'<path d="M'+x+' '+y1+'V'+y2+
  '" stroke="#5debd9" stroke-opacity=".45" stroke-width="1.5"/>').join('');
const icon=(x:number,y:number,kind:'ball'|'goal'|'winner'|'people'|'chart'|'pitch')=>{
  const shape=kind==='ball'?'<circle cx="0" cy="0" r="16"/><path d="M-12 -5L-4 -13L6 -11L14 -2L10 9L0 15L-10 10L-12 -5M-4 -13L0 -4L9 -1M0 -4L-8 5L-2 11M9 -1L10 9"/>'
  :kind==='goal'?'<rect x="-18" y="-13" width="36" height="25"/><path d="M-18 -3H18M-7 -13V12M6 -13V12"/>'
  :kind==='winner'?'<path d="M-12 -14H12V-5Q12 6 0 9Q-12 6 -12 -5Z M-12 -9H-19V-4Q-19 3 -11 3M12 -9H19V-4Q19 3 11 3M0 9V15M-9 16H9"/>'
  :kind==='people'?'<circle cx="-12" cy="-8" r="6"/><circle cx="4" cy="-10" r="7"/><circle cx="18" cy="-7" r="5"/><path d="M-25 11Q-25 1 -14 1Q-6 1 -4 10M-9 12Q-9 -1 4 -1Q17 -1 17 12M18 0Q29 0 29 10"/>'
  :kind==='chart'?'<path d="M-16 12V-1H-9V12M-4 12V-11H3V12M8 12V-19H15V12"/>'
  :'<rect x="-19" y="-13" width="38" height="25"/><path d="M0 -13V12M-19 0H19"/><circle cx="0" cy="0" r="5"/>';
  return '<g transform="translate('+x+' '+y+')" fill="none" stroke="#69f6e8" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">'+shape+'</g>';
};

export function buildPremiumProfileSvg(me:Account,rows:LineupRow[],identity:Identity,
  media:PremiumProfileMedia={}):string{
  const played=me.wins+me.draws+me.losses;
  const points=me.wins*3+me.draws;
  const percent=played?Math.round(me.wins*100/played):0;
  const stats=squadStats(rows);
  const best=[...rows].sort((a,b)=>(getPlayer(b.player_key)?.ovr??0)-(getPlayer(a.player_key)?.ovr??0))[0];
  const top=best?getPlayer(best.player_key):null;
  const feature=media.featuredPlayerKey?getPlayer(media.featuredPlayerKey):top;
  const hasOriginalCard=Boolean(media.star&&feature);
  const avatar=media.avatar
    ? '<image x="98" y="152" width="172" height="172" href="'+media.avatar+
      '" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarCut)"/>'
    : '<circle cx="184" cy="238" r="85" fill="#0b3038"/>'+
      '<circle cx="184" cy="218" r="32" fill="#65d0c7"/>'+
      '<path d="M113 307Q113 260 184 260Q255 260 255 307Z" fill="#4baea7"/>';
  // Raw original card file, uniformly scaled: NO generated frame around the face.
  const miniCard=hasOriginalCard
    ? '<image x="716" y="950" width="232" height="240" href="'+media.star+
      '" preserveAspectRatio="xMidYMid meet"/>'
    : '<g><path d="M755 960H909L939 986V1156L916 1186H752L727 1158V986Z" fill="#05323c" stroke="#50cebf" stroke-width="2"/>'+
      t(834,1057,'F',59,'#68e8d8','text-anchor="middle" font-weight="700"')+
      t(833,1101,'SEM CARTA ORIGINAL',14,'#b5dcdb','text-anchor="middle"')+'</g>';
  const userName=short(identity.name||'Treinador',24);
  const holder=feature?short(feature.name,18):'Sem titular';
  const starRating=feature?String(feature.ovr)+' OVR':'';
  return [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1250" viewBox="0 0 1024 1250">',
  '<defs>',
  '<linearGradient id="bg" x2=".9" y2="1"><stop stop-color="#03101d"/><stop offset=".48" stop-color="#00262d"/><stop offset="1" stop-color="#020d19"/></linearGradient>',
  '<linearGradient id="panel" x2=".8" y2="1"><stop stop-color="#08434a"/><stop offset=".38" stop-color="#032e3a"/><stop offset="1" stop-color="#00222b"/></linearGradient>',
  '<linearGradient id="panelDeep" x2=".9" y2="1"><stop stop-color="#083842"/><stop offset="1" stop-color="#002129"/></linearGradient>',
  '<linearGradient id="coin" x2=".7" y2="1"><stop stop-color="#fff2ad"/><stop offset=".43" stop-color="#f1c361"/><stop offset="1" stop-color="#aa681c"/></linearGradient>',
  '<linearGradient id="edge" x2="1" y2="0"><stop stop-color="#08a99f"/><stop offset=".4" stop-color="#8bfff2"/><stop offset="1" stop-color="#08b7bc"/></linearGradient>',
  '<linearGradient id="light" x2="1" y2="1"><stop stop-color="#45fff0" stop-opacity=".2"/><stop offset="1" stop-color="#01e6cc" stop-opacity="0"/></linearGradient>',
  '<radialGradient id="flare"><stop stop-color="#6fffee" stop-opacity=".34"/><stop offset="1" stop-color="#0ef9dc" stop-opacity="0"/></radialGradient>',
  '<filter id="blur"><feGaussianBlur stdDeviation="15"/></filter>',
  '<clipPath id="avatarCut"><circle cx="184" cy="238" r="85"/></clipPath>',
  '</defs>',
  '<rect width="1024" height="1250" fill="url(#bg)"/>',
  '<path d="M0 60L230 0H330L18 168Z" fill="#4efcee" opacity=".05"/>',
  '<path d="M1024 0H889L785 138H1024Z" fill="#66f7e3" opacity=".05"/>',
  '<ellipse cx="200" cy="30" rx="310" ry="135" fill="url(#flare)"/>',
  '<ellipse cx="876" cy="16" rx="360" ry="146" fill="url(#flare)"/>',
  '<g stroke="#72fff5" stroke-opacity=".26" stroke-width="4"><path d="M0 17L80 0M942 0L1024 24"/></g>',
  // Stadium floodlights are intentional decorative elements, not fake data.
  '<g fill="#dbfffd" opacity=".87">',
  ...Array.from({length:9},(_,i)=>'<circle cx="'+(36+i*24)+'" cy="'+(i%2?16:22)+'" r="4"/>'),
  ...Array.from({length:9},(_,i)=>'<circle cx="'+(766+i*25)+'" cy="'+(i%2?22:16)+'" r="4"/>'),
  '</g>',
  '<path d="M290 34H330L313 57H270Z" fill="#19eee0"/>',
  '<path d="M312 61H343L330 75H296Z" fill="#0aa8ac"/>',
  t(344,70,'FUTSTANCY',62,WHITE,'font-weight="700" letter-spacing="4"'),
  '<path d="M337 96H393M756 96H815" stroke="url(#edge)" stroke-width="2"/>',
  t(575,106,'PERFIL DO TREINADOR',20,'#5dfff0','text-anchor="middle" letter-spacing="5"'),
  // Public profile hero panel, with exact spatial hierarchy of the approved preview.
  polygon(40,129,944,219,23),
  '<rect x="46" y="136" width="929" height="204" fill="url(#light)" opacity=".65"/>',
  '<circle cx="184" cy="238" r="95" fill="#3cfff2" opacity=".14" filter="url(#blur)"/>',
  '<circle cx="184" cy="238" r="91" fill="#042e34" stroke="#31fbe6" stroke-width="5"/>',
  avatar,
  '<circle cx="184" cy="238" r="85" fill="none" stroke="#befff7" stroke-opacity=".38" stroke-width="3"/>',
  '<path d="M308 168V307" stroke="#59f2e6" stroke-opacity=".6" stroke-width="1.6"/>',
  t(338,216,userName,41,WHITE,'font-weight="700"'),
  t(341,260,'TREINADOR FUTSTANCY',20,'#58ffed','letter-spacing="3"'),
  t(341,297,'ID '+me.user_id,20,'#c8e6e8'),
  '<path d="M346 316H858" stroke="#55e6d6" stroke-opacity=".35"/>',
  '<path d="M771 191L941 161L903 217H820L787 253H941L908 301H738Z" fill="#2de9d6" fill-opacity=".1" stroke="#50fae6" stroke-opacity=".2" stroke-width="1.8"/>',
  // Wallet.
  polygon(40,370,944,128,20),
  '<circle cx="147" cy="434" r="47" fill="#976324" stroke="#fff3a2" stroke-width="4"/>',
  '<circle cx="147" cy="434" r="39" fill="url(#coin)" stroke="#fbe4a1" stroke-width="3"/>',
  '<path d="M133 416H166L157 425H139L134 448H126L133 416M135 438H154" fill="none" stroke="#a86b1c" stroke-width="7"/>',
  '<path d="M240 392V476" stroke="#55fae9" stroke-opacity=".83" stroke-width="2"/>',
  t(280,406,'SALDO DA CARTEIRA',23,'#e2ffff','letter-spacing="2"'),
  t(279,466,fmt(me.coins),61,WHITE,'font-weight="700"'),
  '<path d="M823 415H972L954 456H806Z" fill="#092d33" stroke="#f4c05c" stroke-width="2"/>',
  t(887,447,'COINS',21,GOLD,'text-anchor="middle" letter-spacing="4"'),
  // Performance.
  polygon(40,518,944,230,20),
  icon(103,556,'chart'),
  t(155,568,'DESEMPENHO',28,WHITE,'font-weight="700" letter-spacing="2"'),
  '<path d="M54 580H970" stroke="#3ed7cc" stroke-opacity=".40"/>',
  rules([285,525,755],589,720),
  icon(168,616,'pitch'), icon(397,616,'winner'), icon(635,616,'people'),
  '<g stroke="#ff748c" stroke-width="4" stroke-linecap="round"><path d="M853 606L873 625M873 606L853 625"/></g>',
  t(160,659,'PARTIDAS',21,'#e4ffff','text-anchor="middle"'),
  t(399,659,'VITÓRIAS',21,'#d6ffed','text-anchor="middle"'),
  t(640,659,'EMPATES',21,'#e8fdff','text-anchor="middle"'),
  t(869,659,'DERROTAS',21,'#ffe1e7','text-anchor="middle"'),
  t(160,706,fmt(played),53,WHITE,'font-weight="700" text-anchor="middle"'),
  t(399,706,fmt(me.wins),53,'#4cfdc3','font-weight="700" text-anchor="middle"'),
  t(640,706,fmt(me.draws),53,WHITE,'font-weight="700" text-anchor="middle"'),
  t(869,706,fmt(me.losses),53,'#ff8795','font-weight="700" text-anchor="middle"'),
  t(75,733,'PONTOS NA TABELA  '+fmt(points),15,FADE),
  // Lower metrics horizontal strip.
  polygon(40,765,944,108,20),
  rules([380,705],782,857),
  '<g transform="translate(101 820)" fill="none" stroke="#80fff2" stroke-width="3"><circle r="19"/><circle r="8"/><path d="M-12 12L-4 4M6 -6L21 -21M20 -21L20 -6"/></g>',
  icon(446,816,'ball'),icon(762,817,'goal'),
  t(151,810,'APROVEITAMENTO',18,'#d5fafa','letter-spacing="1"'),
  t(151,858,percent+'%',42,'#55f7d7','font-weight="700"'),
  t(499,810,'GOLS MARCADOS',18,'#d5fafa','letter-spacing="1"'),
  t(499,858,fmt(me.goals_for),43,WHITE,'font-weight="700"'),
  t(798,810,'GOLS SOFRIDOS',18,'#d5fafa','letter-spacing="1"'),
  t(798,858,fmt(me.goals_against),43,WHITE,'font-weight="700"'),
  // Squad overview and card using ORIGINAL complete edition art.
  polygon(40,892,944,326,22),
  icon(107,925,'people'),
  t(154,937,'ELENCO TITULAR',26,WHITE,'font-weight="700"'),
  '<path d="M624 919V1196" stroke="#57dfd4" stroke-opacity=".67" stroke-width="2"/>',
  '<path d="M79 958H595" stroke="#7ffff0" stroke-opacity=".38"/>',
  '<rect x="57" y="961" width="545" height="238" rx="14" fill="url(#panelDeep)" stroke="#4af2de" stroke-opacity=".66" stroke-width="2"/>',
  icon(117,1018,'pitch'),
  t(167,995,'FORMAÇÃO',21,'#cae9e6','letter-spacing="1"'),
  t(168,1051,'4 - 3 - 3',50,WHITE,'font-weight="700"'),
  '<path d="M80 1071H578" stroke="#6af1e4" stroke-opacity=".44"/>',
  icon(118,1128,'winner'),
  t(164,1109,'OVR MÉDIO',18,'#c9e9e7'),
  t(167,1170,String(stats.ovr||'--'),49,'#57ffe0','font-weight="700"'),
  t(392,1109,'TITULARES',18,'#c9e9e7'),
  t(394,1170,stats.occupied+'/11',48,WHITE,'font-weight="700"'),
  '<path d="M315 1097V1182" stroke="#5cf4e6" stroke-opacity=".54"/>',
  '<path d="M693 930L711 912L731 931L753 910L770 932" fill="none" stroke="#f4d58a" stroke-width="4"/>',
  t(815,932,'MELHOR TITULAR',22,'#ffe8a3','text-anchor="middle" font-weight="700"'),
  '<rect x="654" y="947" width="317" height="248" rx="11" fill="#032f37" stroke="#39d8ca" stroke-width="2"/>',
  miniCard,
  t(835,1209,holder,16,'#ebfffa','text-anchor="middle"'),
  // Main best is always recorded truthfully when not equal to the featured card.
  ...(top&&top.key!==feature?.key
    ? [t(809,1219,'Maior OVR: '+short(top.name,16)+' '+top.ovr,12,'#c5f4ed','text-anchor="middle"')]
    : []),
  '<rect x="0" y="1227" width="1024" height="23" fill="#06161c"/>',
  '<path d="M0 1232Q245 1215 476 1235T1024 1232" fill="none" stroke="#49f2cc" stroke-opacity=".23" stroke-width="7"/>',
  '</svg>',
  ].join('');
}
