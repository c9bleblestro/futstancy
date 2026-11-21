import { PLAYERS, type Player } from './catalog.ts';

export const PURPLE=0x9d52ff;
export const GOLD=0xf4c542;
export const GREEN=0x22c55e;
export const ERROR=0xef4444;
export const V2=1<<15;
const ROOT='https://futstancy.likeparaopeixe.workers.dev';

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
function url(path:string,params:Record<string,string>):string {
  const qs=new URLSearchParams(params);
  // Nova chave evita que o cache de imagens do Discord sirva os layouts antigos.
  qs.set('v','4');
  return ROOT+path+'?'+qs.toString();
}
/** Parse the game's own catalog names; NEVER use invented names/OVRs/prices in art. */
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
function teamKeys(description:string):string[]{
  const slots:string[]=[];
  const lines=description.split('\n');
  for(const line of lines){
    if(!/^\*\*\d+\.\s+[A-Z]+\*\*/.test(line))continue;
    const player=PLAYERS.find(p=>line.includes(p.name));
    slots.push(player?.key??'_');
  }
  return slots.slice(0,11);
}
function imageFor(title:string,description:string):string {
  const t=title.toLowerCase();
  const players=playersIn(description,10);
  const keys=players.map(p=>p.key).join(',');
  const banner=(head:string)=>url('/art/banner.png',{t:head.slice(0,30),s:'Futstancy • seu clube, sua história'});
  if(t.includes('coleção')||t.includes('colecao')){
    const count=description.match(/\*\*(\d+) cartas\*\*/)?.[1]??String(players.length);
    const page=description.match(/Página\s+(\d+\/\d+)/)?.[1]??'1';
    return url('/art/collection.png',{k:keys,total:count,page});
  }
  if(t.includes('mercado')){
    const prices=[...description.matchAll(/\*\*([\d.]+) coins\*\*/g)].map(x=>x[1].replace(/\./g,''));
    const codes=[...description.matchAll(/C[oó]digo:\s*`([^`]+)`/g)].map(x=>x[1]);
    return url('/art/market.png',{k:players.slice(0,8).map(p=>p.key).join(','),prices:prices.slice(0,8).join(','),codes:codes.slice(0,8).join(',')});
  }
  if(t.includes('pacote aberto'))return url('/art/pack.png',{k:players.slice(0,3).map(p=>p.key).join(',')});
  if(t.includes('contratado')||t.includes('transferência concluída')){
    if(players[0])return url('/art/player.png',{k:players[0].key});
  }
  if(t.includes('equipe')||t.includes('seu time')){
    const power=description.match(/Força total:\*\*?\s*(\d+)/)?.[1]??description.match(/Força total:[^\d]*(\d+)/)?.[1]??'--';
    return url('/art/team.png',{k:teamKeys(description).join(','),power});
  }
  if(t.includes('fim de jogo')||t.includes('resultado')){
    const goals=description.match(/\*\*(\d+)\s*[×x]\s*(\d+)\*\*/);
    return url('/art/score.png',{sh:goals?.[1]??'0',sa:goals?.[2]??'0'});
  }
  // All other commands, including every error/cooldown, receive a matching branded asset.
  return banner(title||'FUTSTANCY');
}
export function buildComponents(title:string|undefined,description:string,buttons:object[]=[]):object[]{
  const result:object[]=[textDisplay('-# ⚽ FUTSTANCY  •  O seu futebol começa aqui')];
  if(title)result.push(textDisplay(`## ${title}`));
  const image=imageFor(title??'',description);
  result.push({type:12,items:[{media:{url:image},description:`Arte de ${title||'Futstancy'} gerada com dados do jogo`}]});
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
