import { PLAYERS, type Player } from './catalog.ts';
import { playerArtUrl, galleryUrls } from './editions.ts';

/**
 * FUTSTANCY V5.8 — dynamic tactical 4-3-3 squad layout for all Discord responses.
 * Only Components V2 are sent: branded Containers (17), Text Displays (10),
 * Media Galleries (12), Separators (14) and working Action Rows (1).
 * All actual player/coin values are supplied by the handler from D1, never art.
 */
export const PURPLE = 0x9167ff;
export const GOLD = 0xeabd56;
export const GREEN = 0x34d399;
export const ERROR = 0xf87171;
export const V2 = 1 << 15;
const ASSETS = 'https://raw.githubusercontent.com/c9bleblestro/futstancy/main/assets';
const REV = 'futstancy-v5-6-20261123';
const art = (player:Player,index=0) => playerArtUrl(player,index);

type Btn = {label:string;id:string;style?:number;disabled?:boolean};
export function button(label:string,id:string,style=2,disabled=false):Btn {
  return {label,id,style,disabled};
}
export function rows(buttons:Btn[]):object[] {
  const result:object[]=[];
  for(let i=0;i<Math.min(buttons.length,25);i+=5){
    result.push({type:1,components:buttons.slice(i,i+5).map(b=>({
      type:2,style:b.style??2,label:b.label,custom_id:b.id,disabled:b.disabled??false,
    }))});
  }
  return result;
}

export interface SelectOption {label:string;value:string;description?:string;default?:boolean}
export function stringSelect(id:string,placeholder:string,options:SelectOption[]):object {
  if(!options.length||options.length>25)throw new Error('Discord select requires 1–25 options');
  return {type:1,components:[{
    type:3,custom_id:id.slice(0,100),placeholder:placeholder.slice(0,150),
    min_values:1,max_values:1,
    options:options.map(o=>({
      label:o.label.slice(0,100),value:o.value.slice(0,100),
      ...(o.description?{description:o.description.slice(0,100)}:{}),
      ...(o.default?{default:true}:{}),
    })),
  }]};
}

const textDisplay=(content:string)=>({type:10,content});

/** Compatibility fallback for older card descriptions. V5 gameplay passes exact card URLs. */
function playersIn(content:string,limit:number):Player[]{
  const found:{player:Player;at:number}[]=[];
  for(const p of PLAYERS){
    let from=0;
    while(from<content.length){
      const at=content.indexOf(p.name,from);
      if(at===-1)break;
      found.push({player:p,at});
      from=at+p.name.length;
    }
  }
  return found.sort((a,b)=>a.at-b.at).slice(0,limit).map(x=>x.player);
}
function teamPlayers(description:string):Player[]{
  return description.split('\n')
    .filter(line=>/^\*\*\d+\.\s+[A-Z]+\*\*/.test(line))
    .map(line=>PLAYERS.find(p=>line.includes(p.name)))
    .filter((p):p is Player=>!!p).slice(0,11);
}
function staticImages(title:string,description:string):string[]{
  const t=title.toLocaleLowerCase('pt-BR');
  const found=playersIn(description,11);
  if(t.includes('galeria de artes')){
    const page=t.match(/(\d+)\s*\/\s*\d+/);
    return galleryUrls(t.includes('designs')?'designs':'cards',page?Number(page[1])-1:0);
  }
  if(t.includes('coleção')||t.includes('colecao'))return found.slice(0,6).map((p,i)=>art(p,i));
  if(t.includes('mercado'))return found.slice(0,8).map((p,i)=>art(p,i));
  if(t.includes('pacote aberto')){
    const keys=found.slice(0,3).map(p=>p.key).join(',');
    if(keys==='bento,bremer,endrick')return [ASSETS+'/packs/bento_bremer_endrick.jpg?v='+REV];
    return found.slice(0,3).map((p,i)=>art(p,i));
  }
  if(t.includes('contratado')||t.includes('transferência concluída'))
    return found.length?[art(found[0])]:[];
  if(t.includes('equipe')||t.includes('seu time'))
    return teamPlayers(description).map((p,i)=>art(p,i));
  // Generic outdated banners made text-only screens noisy and could show fake data.
  // Profile, balance, rankings, errors and help stay as sharp real-data panels.
  return [];
}

/** Capas editoriais dos sistemas. As cartas de jogadores permanecem intactas. */
const BANNER_CDN='https://raw.githubusercontent.com/c9bleblestro/futstancy/main/assets/ui/v57/';
export function systemBanner(title:string|undefined):string|null {
  const t=(title??'').toLocaleLowerCase('pt-BR');
  let key:string|null=null;
  if(/álbum|coleção|galeria de artes|ficha da carta|nova contratação|pacote .* aberto|campo tático|gerenciar escalação|resumo do elenco|vaga \d|titular ·/.test(t))return null;
  if(/mercado|anúncio|anunciad|transferência/.test(t))key='mercado';
  else if(/central de pacotes|pacotes/.test(t))key='pacotes';
  else if(/seu time|equipe|escalação/.test(t))key='time';
  else if(/desafio|partida|resultado do jogo|fim de jogo/.test(t))key='partida';
  else if(/ranking|classificação/.test(t))key='ranking';
  else if(/perfil do treinador/.test(t))key='perfil';
  else if(/recompensa|daily/.test(t))key='daily';
  else if(/bem-vindo|clube já existente|guia do treinador|primeiro, crie/.test(t))key='inicio';
  return key?BANNER_CDN+key+'.jpg?v=futstancy-v5-7':null;
}

type Theme={label:string;color:number};
export function visualTheme(title:string|undefined,content=''):Theme {
  const t=(title??'').toLocaleLowerCase('pt-BR');
  const d=content.toLocaleLowerCase('pt-BR');
  if(/erro|falha|inválid|não realizada|insuficiente|recusado|❌/.test(t))return {label:'ATENÇÃO',color:ERROR};
  if(/aguarde|indisponível|⏳/.test(t))return {label:'TEMPO DE ESPERA',color:0xf59e0b};
  if(/aberto/.test(t)){
    const color=/eclipse/.test(t)?0x22d3ee:
      /lendário/.test(t)?0xf97316:
      /ícone/.test(t)?0xa78bfa:
      /prata/.test(t)?0xcbd5e1:
      /comum/.test(t)?0x94a3b8:
      /ouro/.test(t)?GOLD:PURPLE;
    return {label:'REVELAÇÃO DE PACOTE',color};
  }
  if(/nova contratação|contratação!|jogador contratado/.test(t))
    return {label:'NOVA CARTA',color:GOLD};
  if(/sucesso|concluíd|contratad|criado|nasceu|recompensa|🎉|✅/.test(t))
    return {label:'CONQUISTA',color:GREEN};
  if(/álbum|album|coleção|colecao/.test(t))return {label:'CLUBE DE CARTAS',color:0x2dd4bf};
  if(/artes|galeria/.test(t))return {label:'BIBLIOTECA DE ARTE',color:0xa78bfa};
  if(/mercado|anunciad|transferência/.test(t))return {label:'CENTRAL DE TRANSFERÊNCIAS',color:0x38bdf8};
  if(/time|equipe|escalação|campo tático|resumo do elenco|titular|vaga \d/.test(t))return {label:'ELENCO TÁTICO',color:0x36d5c1};
  if(/pacote|loja/.test(t))return {label:'PACOTES E RECOMPENSAS',color:GOLD};
  if(/ranking|classificação/.test(t))return {label:'TEMPORADA',color:GOLD};
  if(/desafio|jogo|partida|convite|placar|resultado|fim de jogo/.test(t))return {label:'ARENA FUTSTANCY',color:0xfb7185};
  if(/guia|ajuda/.test(t))return {label:'CENTRAL DO TREINADOR',color:PURPLE};
  if(/perfil|treinador/.test(t))return {label:'IDENTIDADE DO CLUBE',color:PURPLE};
  if(/daily|moeda|coins/.test(t))return {label:'ECONOMIA DO CLUBE',color:GOLD};
  if(!title&&/❌|erro|inválid|não foi possível|faltam jogadores/.test(d))return {label:'AVISO',color:ERROR};
  if(!title&&/✅|concluído|escalado|cancelado/.test(d))return {label:'OPERAÇÃO CONCLUÍDA',color:GREEN};
  return {label:'CENTRAL DO CLUBE',color:PURPLE};
}

type Node = {type:number;[key:string]:unknown};
function galleries(urls:string[]):Node[]{
  const clean=urls.filter(url=>/^https:\/\/[^\s]+/.test(url)).slice(0,11);
  const out:Node[]=[];
  for(let i=0;i<clean.length;i+=10){
    out.push({type:12,items:clean.slice(i,i+10).map((url,j)=>({
      media:{url},description:'FUTSTANCY · Arte oficial '+(i+j+1),
    }))});
  }
  return out;
}

/**
 * A maximum of 10 immediate children per Discord container. We also keep
 * the whole message well below the 40-component total limit.
 */
export function buildComponents(
  title:string|undefined,description:string,buttons:object[]=[],imageUrls?:string[],accent?:number
):object[]{
  const theme=visualTheme(title,description);
  const color=accent===ERROR||accent===GREEN?accent:theme.color;
  const source=imageUrls??staticImages(title??'',description);
  const media=galleries(source);
  const banner=systemBanner(title);
  const banners=banner?galleries([banner]):[];
  const header=title
    ? '-# ✦  FUTSTANCY   /   '+theme.label+(banner?'  •  '+title:'\n## '+title)
    : '-# ✦  FUTSTANCY   /   '+theme.label;
  // Um álbum deve mostrar a grade PRIMEIRO, com resumo breve e controles abaixo.
  // Outros comandos mantêm o layout tradicional do Futstancy.
  const album=Boolean(title&&/álbum|album|campo tático|gerenciar escalação|resumo do elenco/.test(title.toLocaleLowerCase('pt-BR')));
  const children:Node[]=album
    ? [textDisplay(header),...media,textDisplay(description.trim().slice(0,3600)||'Nenhuma carta disponível.')]
    : [textDisplay(header),...banners,textDisplay(description.trim().slice(0,3600)||'Nenhuma informação disponível.'),...media];
  if(buttons.length){
    if(children.length+buttons.length<10)children.push({type:14,divider:true,spacing:1});
    children.push(...buttons as Node[]);
  }
  if(children.length>10)throw new Error('Discord Container exceeded 10 children');
  return [
    {type:17,accent_color:color,components:children},
    textDisplay('-# FUTSTANCY   •   Clube, cartas e futebol   •   /fut ajuda'),
  ];
}

export function message(content:string,ephemeral=false,buttons:object[]=[]){
  return {type:4,data:{
    flags:V2|(ephemeral?64:0),components:buildComponents(undefined,content,buttons),
    allowed_mentions:{parse:[]},
  }};
}
export function card(title:string,description:string,_color=PURPLE,_ephemeral=false,buttons:object[]=[],imageUrls?:string[]){
  return {type:4,data:{
    flags:V2,components:buildComponents(title,description,buttons,imageUrls,_color),
    allowed_mentions:{parse:[]},
  }};
}
export function update(title:string,description:string,_color=PURPLE,imageUrls?:string[]){
  return {type:7,data:{
    components:buildComponents(title,description,[],imageUrls,_color),
    allowed_mentions:{parse:[]},
  }};
}
export function jsonResponse(value:object,status=200):Response{
  return new Response(JSON.stringify(value),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff',
  }});
}
