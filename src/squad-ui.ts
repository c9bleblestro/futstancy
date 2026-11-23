import {getPlayer} from './catalog.ts';
import {lineup,autoLineup,setSlot} from './storage.ts';
import {SLOT_POSITION} from './game.ts';
import {editionArtUrl,TIER_NAMES} from './packs.ts';
import {TACTICAL_433,slotDefinition,squadStats,compatibleSlot,tierPriority,validTacticalSlot} from './squad-layout.ts';
import {card,message,button,rows,stringSelect,PURPLE,GREEN} from './ui.ts';
import type {Env,LineupRow,CardRow} from './types.ts';

const ORIGIN='https://futstancy.likeparaopeixe.workers.dev';
const CANDIDATE_PAGE_SIZE=20;
export function squadImageUrl(owner:string,rows:LineupRow[]):string {
  const rev=rows.map(r=>r.slot+'-'+r.id).join('.');
  return ORIGIN+'/art/squad.png?user='+encodeURIComponent(owner)+
    '&rev='+encodeURIComponent('v58.'+rev);
}
function summaryLine(rows:LineupRow[],owner:string,notice=''){
  const stats=squadStats(rows);
  return (notice?'**'+notice+'**\n\n':'')+
    '### '+stats.occupied+'/11 TITULARES   ·   '+(stats.ovr||'--')+' OVR\n'+
    '**4-3-3**   •   '+(stats.complete?'✅ Elenco completo':'⚠️ '+(11-stats.occupied)+' vagas livres')+'\n'+
    '-# Treinador: <@'+owner+'>   ·   As cartas e seus atributos são reais.\n'+
    '-# Selecione uma posição no menu para gerenciar os titulares.';
}
function menuSlots(owner:string,kind:'slotpick'|'playerpick',rows:LineupRow[]){
  const set=new Map(rows.map(r=>[r.slot,r]));
  const options=TACTICAL_433.filter(s=>kind==='slotpick'||set.has(s.slot)).map(slot=>{
    const row=set.get(slot.slot),player=row?getPlayer(row.player_key):null;
    return {value:String(slot.slot),
      label:slot.slot+'. '+slot.role+' · '+(player?.name??'Vaga vazia'),
      description:player
        ? player.ovr+' OVR · '+(row?.tier?TIER_NAMES[row.tier]??row.tier:'Clássica')
        : 'Toque para escolher um jogador'};
  });
  return options.length?stringSelect('team:'+kind+':'+owner,
    kind==='slotpick'?'⚙️ Escolher posição para escalar':'🔎 Ver ficha de um titular',options):null;
}
function nav(owner:string):object[]{
  return rows([
    button('⚙️ Gerenciar','team:manage:'+owner,1),
    button('🔁 Auto','team:auto:'+owner,2),
    button('📊 Resumo','team:summary:'+owner,2),
    button('📚 Coleção','team:collection:'+owner,2),
  ]);
}
export async function squadPanel(env:Env,owner:string,mode:'pitch'|'manage'|'summary'='pitch',notice=''){
  const current=await lineup(env.DB,owner),stats=squadStats(current);
  if(mode==='summary'){
    const sorted=[...current].sort((a,b)=>{
      const pa=getPlayer(a.player_key),pb=getPlayer(b.player_key);
      return (pb?.ovr??0)-(pa?.ovr??0);
    });
    const top=sorted.slice(0,3).map((row,index)=>{
      const p=getPlayer(row.player_key);
      return p?(index+1)+'. **'+p.name+'**  ·  '+p.ovr+' OVR  ·  '+(TIER_NAMES[row.tier]??row.tier):'';
    }).filter(Boolean).join('\n');
    const weak=sorted.length?sorted[sorted.length-1]:null;
    const weakest=weak?getPlayer(weak.player_key):null;
    const lines='**FORMAÇÃO:** 4-3-3\n**OVR MÉDIO:** '+(stats.ovr||'--')+
      '\n**TITULARES:** '+stats.occupied+'/11\n**VAGAS LIVRES:** '+(11-stats.occupied)+
      '\n\n**⭐ MAIORES OVRs**\n'+(top||'Nenhum titular')+
      '\n\n**📉 MENOR OVR ESCALADO**\n'+(weakest?weakest.name+' · '+weakest.ovr+' OVR':'Nenhum')+
      '\n\n-# Não exibimos química nem capitão, pois ainda não são sistemas persistidos.';
    return card('📊 Resumo do elenco',lines,PURPLE,false,
      rows([button('← Campo tático','team:view:'+owner,1),
        button('⚙️ Gerenciar','team:manage:'+owner,2),
        button('🔁 Auto','team:auto:'+owner,2)]),
      [squadImageUrl(owner,current)]);
  }
  const manager=mode==='manage';
  const select=menuSlots(owner,'slotpick',current);
  const viewPlayer=menuSlots(owner,'playerpick',current);
  const controls=manager
    ? [select,...rows([button('← Voltar ao campo','team:view:'+owner,2),
        button('🔁 Auto','team:auto:'+owner,1),
        button('📚 Coleção','team:collection:'+owner,2)])].filter(Boolean)
    : [select,viewPlayer,...nav(owner)].filter(Boolean);
  return card(manager?'⚙️ Gerenciar escalação':'⚽ Campo tático 4-3-3',
    summaryLine(current,owner,notice),PURPLE,false,
    controls,[squadImageUrl(owner,current)]);
}

export async function squadCandidates(env:Env,owner:string,slot:number,page=0,notice=''){
  if(!validTacticalSlot(slot))return message('Posição inexistente.',true);
  const role=slotDefinition(slot)!;
  const rowsNow=await lineup(env.DB,owner);
  const onField=new Set(rowsNow.map(c=>c.id));
  const all=(await env.DB.prepare(
    "SELECT c.* FROM cards c WHERE c.owner_id=? AND NOT EXISTS(SELECT 1 FROM market m WHERE m.card_id=c.id AND m.status='active') ORDER BY c.acquired_ms DESC LIMIT 2500"
  ).bind(owner).all<CardRow>()).results;
  const choices=all.filter(c=>compatibleSlot(slot,c.player_key)).sort((a,b)=>{
    const pa=getPlayer(a.player_key)!,pb=getPlayer(b.player_key)!;
    return pb.ovr-pa.ovr||(tierPriority[b.tier]??0)-(tierPriority[a.tier]??0)||
      b.acquired_ms-a.acquired_ms||a.id.localeCompare(b.id);
  });
  const pages=Math.max(1,Math.ceil(choices.length/CANDIDATE_PAGE_SIZE));
  const safe=Math.min(pages-1,Math.max(0,Math.trunc(page)||0));
  const pageCards=choices.slice(safe*CANDIDATE_PAGE_SIZE,(safe+1)*CANDIDATE_PAGE_SIZE);
  const select=pageCards.length?[stringSelect(
    'team:apply:'+owner+':'+slot+':'+safe,'🃏 Selecionar jogador para '+role.role,
    pageCards.map(c=>{
      const p=getPlayer(c.player_key)!;
      return {value:c.id,label:p.name+' · '+p.ovr+' OVR',
        description:(onField.has(c.id)?'Titular atual · ':'')+(TIER_NAMES[c.tier]??c.tier)+
          ' · '+p.pos+' · '+c.id.slice(0,6)};
    }))]:[];
  const controls=rows([
    button('◀ Anterior','team:candidates:'+owner+':'+slot+':'+(safe-1),2,safe===0),
    button('Próxima ▶','team:candidates:'+owner+':'+slot+':'+(safe+1),2,safe===pages-1),
    button('← Escolher outra vaga','team:manage:'+owner,2),
    button('⚽ Campo','team:view:'+owner,1),
  ]);
  const current=rowsNow.find(r=>r.slot===slot),p=current?getPlayer(current.player_key):null;
  return card('⚙️ Vaga '+slot+' · '+role.role,
    (notice?'**'+notice+'**\n\n':'')+
    '**POSIÇÃO:** '+role.role+' (categoria '+SLOT_POSITION[slot-1]+')\n'+
    '**TITULAR ATUAL:** '+(p?p.name+' · '+p.ovr+' OVR':'Vaga vazia')+
    '\n\n**'+choices.length+' cartas compatíveis** · Página '+(safe+1)+'/'+pages+
    '\n-# Use o seletor abaixo. Jogadores já titulares da mesma posição podem trocar de vaga.'+
    (choices.length?'':'\n\nObtenha uma carta dessa posição antes de escalar.'),
    PURPLE,false,[...select,...controls],
    current?[editionArtUrl(current.player_key,current.edition)].filter(Boolean):[]);
}

export async function squadDetail(env:Env,owner:string,slot:number){
  if(!validTacticalSlot(slot))return message('Vaga inválida.',true);
  const rowsNow=await lineup(env.DB,owner);
  const row=rowsNow.find(r=>r.slot===slot);
  const role=slotDefinition(slot)!;
  if(!row)return squadCandidates(env,owner,slot);
  const p=getPlayer(row.player_key);
  if(!p)return message('Jogador não encontrado.',true);
  return card('🔎 Titular · '+role.role,
    '**'+p.name+'**  •  **'+p.ovr+' OVR**\n'+
    '-# '+p.country+'   |   '+p.pos+'   |   '+(TIER_NAMES[row.tier]??row.tier)+
    '\n\n**EDIÇÃO:** '+row.edition.replace(/_/g,' ')+
    '\n**VAGA:** '+slot+' · '+role.role+
    '\n**ID:** '+String.fromCharCode(96)+row.id+String.fromCharCode(96)+
    '\n\n-# A arte e a edição pertencem ao exemplar real de sua coleção.',
    PURPLE,false,rows([
      button('🔁 Substituir','team:candidates:'+owner+':'+slot+':0',1),
      button('← Campo','team:view:'+owner,2),
      button('📚 Coleção','team:collection:'+owner,2),
    ]),[editionArtUrl(row.player_key,row.edition)].filter(Boolean));
}
