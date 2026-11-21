import { PLAYERS, type Player } from './catalog.ts';

export const PURPLE=0x9d52ff;
export const GOLD=0xf4c542;
export const GREEN=0x22c55e;
export const ERROR=0xef4444;
export const V2=1<<15;
/** Cards are compiled once into self-contained JPGs by GitHub Actions.
 * Discord fetches images directly; no Worker image rendering or remote fonts.
 */
const ASSETS='https://raw.githubusercontent.com/c9bleblestro/futstancy/main/assets';
const REV='fut-premium-20261121-v5';
const cardUrl=(p:Player)=>ASSETS+'/cards/'+encodeURIComponent(p.key)+'.jpg?v='+REV;
const bannerUrl=(kind:string)=>ASSETS+'/ui/'+kind+'.jpg?v='+REV;
type Btn={label:string;id:string;style?:number;disabled?:boolean};
export function button(label:string,id:string,style=2,disabled=false):Btn{return {label,id,style,disabled};}
export function rows(buttons:Btn[]):object[]{
  const out:object[]=[];
  for(let i=0;i<Math.min(buttons.length,25);i+=5){
    out.push({type:1,components:buttons.slice(i,i+5).map(b=>({type:2,style:b.style??2,label:b.label,custom_id:b.id,disabled:b.disabled??false}))});
  }
  return out;
}
const textDisplay=(content:string)=>({type:10,content});
/** Match precisely the real names and ordering from a game message. */
function playersIn(content:string,limit:number):Player[]{
  const result:{player:Player;at:number}[]=[];
  for(const p of PLAYERS){
    let start=0;
    while(start<content.length){
      const at=content.indexOf(p.name,start);
      if(at===-1)break;
      result.push({player:p,at});start=at+p.name.length;
    }
  }
  return result.sort((a,b)=>a.at-b.at).slice(0,limit).map(r=>r.player);
}
function teamPlayers(description:string):Player[]{
  const players:Player[]=[];
  for(const line of description.split('\n')){
    if(!/^\*\*\d+\.\s+[A-Z]+\*\*/.test(line))continue;
    const p=PLAYERS.find(p=>line.includes(p.name));
    if(p)players.push(p);
  }
  return players.slice(0,11);
}
function staticImages(title:string,description:string):string[]{
  const t=title.toLocaleLowerCase('pt-BR');
  const found=playersIn(description,11);
  if(t.includes('coleção')||t.includes('colecao'))return found.length?found.slice(0,6).map(cardUrl):[bannerUrl('default')];
  if(t.includes('mercado'))return found.length?found.slice(0,8).map(cardUrl):[bannerUrl('mercado')];
  if(t.includes('pacote aberto'))return found.length?found.slice(0,3).map(cardUrl):[bannerUrl('pacote')];
  if(t.includes('contratado')||t.includes('transferência concluída'))return found.length?[cardUrl(found[0])]:[bannerUrl('sucesso')];
  if(t.includes('equipe')||t.includes('seu time')){
    const lineup=teamPlayers(description);
    return lineup.length?lineup.map(cardUrl):[bannerUrl('time')];
  }
  if(t.includes('ranking'))return [bannerUrl('ranking')];
  if(t.includes('perfil'))return [bannerUrl('perfil')];
  if(t.includes('ajuda')||t.includes('guia'))return [bannerUrl('ajuda')];
  if(t.includes('iniciar')||t.includes('clube'))return [bannerUrl('inicio')];
  if(t.includes('daily')||t.includes('recompensa'))return [bannerUrl('daily')];
  if(t.includes('desafio'))return [bannerUrl('desafio')];
  if(t.includes('pacote'))return [bannerUrl('pacote')];
  if(t.includes('aguarde')||t.includes('cooldown')||t.includes('indisponível'))return [bannerUrl('cooldown')];
  if(t.includes('erro')||t.includes('falha')||t.includes('não realizada'))return [bannerUrl('erro')];
  if(t.includes('concluída')||t.includes('anunciada')||t.includes('criado'))return [bannerUrl('sucesso')];
  if(t.includes('fim de jogo')||t.includes('resultado'))return [bannerUrl('desafio')];
  const lower=description.toLocaleLowerCase('pt-BR');
  if(lower.includes('inválido')||lower.includes('não foi possível')||lower.includes('erro'))return [bannerUrl('erro')];
  return [bannerUrl('default')];
}
export function buildComponents(title:string|undefined,description:string,buttons:object[]=[]):object[]{
  const result:object[]=[textDisplay('-# ⚽ FUTSTANCY • Sua história no futebol')];
  if(title)result.push(textDisplay('## '+title));
  const images=staticImages(title??'',description);
  for(let i=0;i<images.length;i+=10){
    result.push({type:12,items:images.slice(i,i+10).map((url,j)=>({media:{url},description:'Futstancy • carta '+(i+j+1)}))});
  }
  result.push(textDisplay(description.slice(0,3300)));
  if(buttons.length)result.push({type:14,divider:true,spacing:1},...buttons);
  return result;
}
export function message(content:string,ephemeral=true,buttons:object[]=[]){
  return {type:4,data:{flags:V2|(ephemeral?64:0),components:buildComponents(undefined,content,buttons),allowed_mentions:{parse:[]}}};
}
export function card(title:string,description:string,_color=PURPLE,ephemeral=true,buttons:object[]=[]){
  return {type:4,data:{flags:V2|(ephemeral?64:0),components:buildComponents(title,description,buttons),allowed_mentions:{parse:[]}}};
}
export function update(title:string,description:string,_color=PURPLE){
  return {type:7,data:{components:buildComponents(title,description),allowed_mentions:{parse:[]}}};
}
export function jsonResponse(value:object,status=200):Response{
  return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
}
