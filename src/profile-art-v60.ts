import {getPlayer} from './catalog.ts';
import {squadStats} from './squad-layout.ts';
import type {Account,LineupRow} from './types.ts';

type Identity={name:string;avatarUrl:string|null};
export type PremiumProfileMedia={
  avatar?:string|null;
  star?:string|null;
  featuredPlayerKey?:string;
};
const xml=(v:unknown)=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const cut=(v:string,len=25)=>v.replace(/[\r\n\t]/g,' ').slice(0,len);
const fmt=(n:number)=>Number(n).toLocaleString('pt-BR');
const text=(x:number,y:number,value:string,size=26,fill='#f6fffe',extra='')=>
  '<text x="'+x+'" y="'+y+'" font-family="Lato" font-size="'+size+
  '" fill="'+fill+'" '+extra+'>'+xml(value)+'</text>';
const polygon=(x:number,y:number,w:number,h:number,fill:string,stroke='#00e7d5')=>
  '<path d="M'+(x+19)+' '+y+'H'+(x+w-18)+'L'+(x+w)+' '+(y+18)+'V'+(y+h-20)+
  'L'+(x+w-19)+' '+(y+h)+'H'+(x+18)+'L'+x+' '+(y+h-19)+'V'+(y+19)+
  'Z" fill="'+fill+'" stroke="'+stroke+'" stroke-opacity=".78" stroke-width="2"/>';

export function buildPremiumProfileSvg(me:Account,rows:LineupRow[],identity:Identity,
  media:PremiumProfileMedia={}):string{
  const played=me.wins+me.draws+me.losses;
  const points=me.wins*3+me.draws;
  const percent=played?Math.round(me.wins*100/played):0;
  const stats=squadStats(rows);
  const best=[...rows].sort((a,b)=>(getPlayer(b.player_key)?.ovr??0)-(getPlayer(a.player_key)?.ovr??0))[0];
  const top=best?getPlayer(best.player_key):null;
  const feature=media.featuredPlayerKey?getPlayer(media.featuredPlayerKey):top;
  const hasCard=Boolean(media.star&&feature);
  const portrait=media.avatar
    ? '<image x="82" y="165" width="177" height="177" href="'+media.avatar+
      '" preserveAspectRatio="xMidYMid slice" clip-path="url(#clipAvatar)"/>'
    : '<circle cx="170" cy="254" r="88" fill="#143943"/><circle cx="170" cy="238" r="34" fill="#69ded2"/>'+
      '<path d="M101 319Q101 259 170 259Q239 259 239 319Z" fill="#59b4b8"/>';
  const starImg=hasCard
    ? '<image x="746" y="1017" width="189" height="195" preserveAspectRatio="xMidYMid meet" href="'+media.star+'"/>'
    : '<g><path d="M785 1020L895 1020L911 1040L898 1181L840 1213L781 1181L769 1040Z"'+
      ' fill="#0b3037" stroke="#47e6d2" stroke-width="3"/>'+
      text(840,1104,'F',49,'#62d9c9','text-anchor="middle"')+
      text(840,1142,'SEM CARTA',15,'#9ed9cf','text-anchor="middle"')+'</g>';
  const panel=(x:number,y:number,w:number,h:number,stroke='#29d6c6')=>
    polygon(x,y,w,h,'url(#panel)',stroke)+
    '<path d="M'+(x+24)+' '+(y+6)+'H'+(x+w-30)+'" stroke="#00ffdf" stroke-opacity=".38" stroke-width="2"/>';
  const metric=(x:number,label:string,value:string,color:string,icon:string)=>
    text(x,660,icon,23,color)+
    text(x+37,660,label,19,'#cce7e9','letter-spacing="1"')+
    text(x,744,value,58,color,'font-weight="700"');
  const summaryMetric=(x:number,label:string,value:string,color:string)=>
    text(x,876,label,16,'#c2dfdf','letter-spacing="1"')+
    text(x,929,value,48,color,'font-weight="700"');
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1260" viewBox="0 0 1024 1260">',
    '<defs>',
    '<linearGradient id="bg" x2=".6" y2="1"><stop stop-color="#020c15"/><stop offset=".45" stop-color="#04232d"/><stop offset="1" stop-color="#010c14"/></linearGradient>',
    '<linearGradient id="panel" x2="1" y2="1"><stop stop-color="#06333b"/><stop offset=".38" stop-color="#0a2d35"/><stop offset="1" stop-color="#041923"/></linearGradient>',
    '<linearGradient id="edge" x2="1" y2="1"><stop stop-color="#00f5e3"/><stop offset=".5" stop-color="#71f7df"/><stop offset="1" stop-color="#006d7e"/></linearGradient>',
    '<radialGradient id="spot"><stop stop-color="#22fff2" stop-opacity=".25"/><stop offset="1" stop-color="#18fff0" stop-opacity="0"/></radialGradient>',
    '<radialGradient id="gold"><stop stop-color="#ffedaf"/><stop offset=".5" stop-color="#f2bc54"/><stop offset="1" stop-color="#9b5c17"/></radialGradient>',
    '<filter id="glow" x="-70%" width="240%" y="-70%" height="240%"><feGaussianBlur stdDeviation="7"/></filter>',
    '<clipPath id="clipAvatar"><circle cx="170" cy="254" r="88"/></clipPath>',
    '</defs>',
    '<rect width="1024" height="1260" fill="url(#bg)"/>',
    '<ellipse cx="900" cy="70" rx="290" ry="205" fill="url(#spot)"/>',
    '<ellipse cx="150" cy="70" rx="260" ry="170" fill="url(#spot)"/>',
    '<path d="M0 100L300 0H1024V60L900 141L0 141Z" fill="#031b26" opacity=".9"/>',
    '<path d="M0 112L1024 112" stroke="#3af5dd" stroke-opacity=".35"/>',
    '<path d="M0 1150L130 1120L260 1160L380 1125L512 1165L710 1120L1024 1155" fill="none" stroke="#13887e" stroke-opacity=".30" stroke-width="12"/>',
    '<g stroke="#49d8c8" stroke-width="3" opacity=".75"><path d="M6 37L30 15M32 14L56 36M968 15L991 36M992 36L1014 16"/></g>',
    text(330,69,'FUTSTANCY',61,'#f5ffff','letter-spacing="5" font-weight="700"'),
    text(386,106,'P E R F I L   D O   T R E I N A D O R',17,'#61f5df'),
    '<path d="M95 120H343M700 120H949" stroke="url(#edge)" stroke-width="2"/>',
    panel(34,147,956,235),
    '<rect x="48" y="156" width="927" height="211" rx="22" fill="url(#spot)" opacity=".60"/>',
    '<circle cx="170" cy="254" r="98" fill="none" stroke="#22fff2" stroke-opacity=".3" stroke-width="16" filter="url(#glow)"/>',
    '<circle cx="170" cy="254" r="96" fill="#08272d" stroke="url(#edge)" stroke-width="5"/>',
    portrait,
    '<circle cx="170" cy="254" r="88" fill="none" stroke="#82ffec" stroke-opacity=".4" stroke-width="3"/>',
    '<path d="M289 192V344" stroke="#50d9ca" stroke-opacity=".53"/>',
    text(328,232,cut(identity.name,23),39,'#f7ffff','font-weight="700"'),
    text(331,279,'TREINADOR FUTSTANCY',20,'#83f6e4','letter-spacing="2"'),
    text(331,317,'ID '+me.user_id,18,'#b2d4d6'),
    '<path d="M335 333H922" stroke="#49aeb0" stroke-opacity=".46"/>',
    '<path d="M802 185L947 171L887 270L760 286Z" fill="#19e7d1" opacity=".07"/>',
    text(856,324,'F',121,'#23dcca','opacity=".08" font-weight="700" text-anchor="middle"'),
    panel(34,399,956,147),
    '<circle cx="129" cy="470" r="52" fill="#c49030" stroke="#ffec9f" stroke-width="4"/>',
    '<circle cx="129" cy="470" r="42" fill="url(#gold)" stroke="#fff1b1" stroke-opacity=".9" stroke-width="2"/>',
    text(129,487,'F',51,'#824b0a','text-anchor="middle" font-weight="700"'),
    '<path d="M244 418V524" stroke="#4df4d9" stroke-width="2"/>',
    text(284,443,'SALDO DA CARTEIRA',23,'#d9faff','letter-spacing="2"'),
    text(284,518,fmt(me.coins),69,'#ffffff','font-weight="700"'),
    '<path d="M797 446H940L919 482H779Z" stroke="#f6bf50" fill="#603e16" fill-opacity=".14"/>',
    text(860,477,'COINS',20,'#ffe193','text-anchor="middle" letter-spacing="2"'),
    panel(34,565,956,251),
    '<path d="M72 603H113L124 591" stroke="#23eddb" stroke-width="4" fill="none"/>',
    text(140,606,'DESEMPENHO',26,'#eaffff','font-weight="700" letter-spacing="2"'),
    '<path d="M65 622H952" stroke="#3fcfc1" stroke-opacity=".34"/>',
    metric(74,'PARTIDAS',fmt(played),'#f7ffff','◈'),
    metric(300,'VITÓRIAS',fmt(me.wins),'#50ffbf','✦'),
    metric(530,'EMPATES',fmt(me.draws),'#f7ffff','◇'),
    metric(759,'DERROTAS',fmt(me.losses),'#ff808d','×'),
    '<path d="M280 633V780M510 633V780M736 633V780" stroke="#47b1a5" stroke-opacity=".48"/>',
    text(78,787,'PONTOS NA TABELA  '+fmt(points),15,'#99d8d1'),
    panel(34,836,956,116),
    summaryMetric(75,'APROVEITAMENTO',percent+'%','#59f5d2'),
    summaryMetric(388,'GOLS MARCADOS',fmt(me.goals_for),'#ffffff'),
    summaryMetric(731,'GOLS SOFRIDOS',fmt(me.goals_against),'#ffffff'),
    '<path d="M361 859V935M707 859V935" stroke="#32dfce" stroke-opacity=".65"/>',
    panel(34,972,956,267),
    text(76,1018,'ELENCO TITULAR',25,'#f6fffd','font-weight="700" letter-spacing="1"'),
    text(356,1018,'MELHOR TITULAR: '+(top?cut(top.name,12)+' '+top.ovr:'--'),15,'#b5eddd'),
    '<path d="M670 992V1218" stroke="#46bfb2" stroke-opacity=".8"/>',
    '<rect x="59" y="1038" width="592" height="179" rx="17" fill="#083139" stroke="#31dbc4" stroke-opacity=".40"/>',
    text(90,1077,'FORMAÇÃO',19,'#b2dcd9'),
    text(91,1146,'4 - 3 - 3',56,'#ffffff','font-weight="700"'),
    '<path d="M90 1161H625" stroke="#40cfc0" stroke-opacity=".32"/>',
    text(94,1186,'OVR MÉDIO',16,'#a4d9d5'),
    text(94,1221,String(stats.ovr||'--'),38,'#61ffe1'),
    text(337,1186,'TITULARES',16,'#a4d9d5'),
    text(337,1221,stats.occupied+'/11',38,'#ffffff'),
    text(835,1010,'CARTA EM DESTAQUE',17,'#ffe4a4','text-anchor="middle" letter-spacing="1"'),
    starImg,
    text(835,1235,feature?cut(feature.name,21):'SEM TITULAR',16,'#d8fff6','text-anchor="middle"'),
    '</svg>'
  ].join('');
}
