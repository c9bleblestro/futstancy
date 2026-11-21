import { PLAYERS } from './catalog.ts';

// All bot replies use native Discord Components V2. No embeds = no colored sidebar.
export const PURPLE = 0x9d52ff;
export const GOLD = 0xf4c542;
export const GREEN = 0x22c55e;
export const ERROR = 0xef4444;
export const V2 = 1 << 15;
const ORIGIN = 'https://futstancy.likeparaopeixe.workers.dev';

type Btn = { label:string; id:string; style?:number; disabled?:boolean };
export function button(label:string,id:string,style=2,disabled=false):Btn {return {label,id,style,disabled};}
export function rows(buttons:Btn[]) {
  const out:object[]=[];
  for(let i=0;i<Math.min(buttons.length,25);i+=5){
    out.push({type:1,components:buttons.slice(i,i+5).map(b=>({type:2,style:b.style,label:b.label,custom_id:b.id,disabled:b.disabled}))});
  }
  return out;
}
const txt=(content:string)=>({type:10,content});
function relevantPlayers(description:string,max:number){
  const matches=PLAYERS.filter(p=>description.includes(p.name));
  return matches.slice(0,max);
}
function pics(title:string,description:string){
  const low=title.toLowerCase();
  const images:string[]=[];
  const playerArt=(k:string)=>ORIGIN+'/art/player.png?k='+encodeURIComponent(k);
  const banner=(t:string,s:string)=>ORIGIN+'/art/banner.png?t='+encodeURIComponent(t)+'&s='+encodeURIComponent(s);
  const players=relevantPlayers(description,8);
  if(low.includes('coleção')||low.includes('colecao')||low.includes('mercado')||low.includes('pacote')){
    images.push(...players.map(p=>playerArt(p.key)));
    if(!images.length) images.push(banner(title,'FUTSTANCY • FUTEBOL NO DISCORD'));
  }else if(low.includes('contratado')||low.includes('transferência concluída')){
    if(players.length) images.push(playerArt(players[0].key));
  }else if(low.includes('equipe')||low.includes('time')){
    const slots=(description.match(/\*\*\d+\.\s[A-Z]+\*\*[^\n]+/g)??[]).slice(0,11).map(s=>s.replace(/\*/g,''));
    const params=new URLSearchParams({t:'FUTSTANCY FC • 4-3-3',power: 'ESCALAÇÃO TITULAR',slots:slots.join('||')});
    images.push(ORIGIN+'/art/team.png?'+params.toString());
  }else if(low.includes('fim de jogo')){
    const score=description.match(/(\d+)\s*[×x]\s*(\d+)/);
    const qs=new URLSearchParams({home:'CASA',away:'VISITANTE',sh:score?.[1]??'0',sa:score?.[2]??'0'});
    images.push(ORIGIN+'/art/score.png?'+qs.toString());
  }else if(low.includes('guia')||low.includes('ranking')||low.includes('perfil')||low.includes('clube')||low.includes('recompensa')||low.includes('daily')){
    images.push(banner(title,'COLECIONE • COMPITA • EVOLUA'));
  }
  return images.slice(0,8);
}
function components(title:string|undefined,description:string,buttons:object[]=[]){
  const result:object[]=[txt('-# FUTSTANCY  •  Seu clube. Sua história.')];
  if(title)result.push(txt('## '+title));
  const images=pics(title??'',description);
  if(images.length) result.push({type:12,items:images.map(url=>({media:{url},description:'Arte original Futstancy'}))});
  result.push(txt(description.slice(0,3200)));
  if(buttons.length)result.push({type:14,divider:true,spacing:1},...buttons);
  return result;
}
export function message(content:string,ephemeral=true,buttons:object[]=[]){
  return {type:4,data:{flags:V2|(ephemeral?64:0),components:components(undefined,content,buttons),allowed_mentions:{parse:[]}}};
}
export function card(title:string,description:string,_color=PURPLE,ephemeral=true,buttons:object[]=[]){
  return {type:4,data:{flags:V2|(ephemeral?64:0),components:components(title,description,buttons),allowed_mentions:{parse:[]}}};
}
export function update(title:string,description:string,_color=PURPLE){
  return {type:7,data:{components:components(title,description),allowed_mentions:{parse:[]}}};
}
export function jsonResponse(value:object,status=200){
  return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
}
