import {getPlayer} from './catalog.ts';
import {SLOT_POSITION} from './game.ts';
import type {LineupRow} from './types.ts';

export type TacticalSlot={slot:number;role:string;group:string;x:number;y:number};
export const TACTICAL_433:readonly TacticalSlot[]=[
  {slot:1,role:'GOL',group:'Goleiro',x:512,y:1138},
  {slot:2,role:'LE',group:'Defesa',x:138,y:895},
  {slot:3,role:'ZAG',group:'Defesa',x:386,y:895},
  {slot:4,role:'ZAG',group:'Defesa',x:638,y:895},
  {slot:5,role:'LD',group:'Defesa',x:886,y:895},
  {slot:6,role:'MC',group:'Meio-campo',x:213,y:624},
  {slot:7,role:'MEI',group:'Meio-campo',x:512,y:571},
  {slot:8,role:'MC',group:'Meio-campo',x:811,y:624},
  {slot:9,role:'PE',group:'Ataque',x:210,y:343},
  {slot:10,role:'ATA',group:'Ataque',x:512,y:281},
  {slot:11,role:'PD',group:'Ataque',x:814,y:343},
];
export function slotDefinition(slot:number):TacticalSlot|undefined{
  return TACTICAL_433.find(item=>item.slot===slot);
}
export function validTacticalSlot(slot:number):boolean{
  return Number.isInteger(slot)&&slot>=1&&slot<=11;
}
export function compatibleSlot(slot:number,playerKey:string):boolean{
  const pos=getPlayer(playerKey)?.pos;
  return validTacticalSlot(slot)&&Boolean(pos&&pos===SLOT_POSITION[slot-1]);
}
export function squadStats(rows:LineupRow[]){
  const players=rows.map(r=>getPlayer(r.player_key)).filter((p):p is NonNullable<typeof p>=>!!p);
  const ovr=players.length?Math.round(players.reduce((n,p)=>n+p.ovr,0)/players.length):0;
  const top=[...players].sort((a,b)=>b.ovr-a.ovr||a.name.localeCompare(b.name,'pt-BR')).slice(0,3);
  return {occupied:players.length,ovr,complete:players.length===11,top};
}
export const tierPriority:Record<string,number>={
  eclipse:6,lendario:5,icone:4,ouro:3,prata:2,comum:1,legado:0,
};
