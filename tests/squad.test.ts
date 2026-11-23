import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {start,lineup,setSlot,ownedCards} from '../src/storage.ts';
import {chooseTeam,SLOT_POSITION} from '../src/game.ts';
import {getPlayer} from '../src/catalog.ts';
import {TACTICAL_433,compatibleSlot,squadStats} from '../src/squad-layout.ts';
import {buildSquadSvg,renderSquadImage} from '../src/squad-image.ts';
import {squadImageUrl,squadPanel,squadCandidates,squadDetail} from '../src/squad-ui.ts';
import {handleInteraction} from '../src/handler.ts';
import type {Database,Statement,Env,Interaction} from '../src/types.ts';

class SqlDB implements Database{
  client=new DatabaseSync(':memory:');
  constructor(){
    this.client.exec('PRAGMA foreign_keys=ON');
    this.client.exec(readFileSync(join(import.meta.dirname,'../migrations/0001_init.sql'),'utf8'));
    this.client.exec(readFileSync(join(import.meta.dirname,'../migrations/0002_card_editions.sql'),'utf8'));
  }
  prepare(sql:string):Statement{
    const stmt=this.client.prepare(sql);
    let args:(string|number|null)[]=[];
    return {
      bind(...params){args=params;return this;},
      async first<T>(){return (stmt.get(...args)??null) as T|null;},
      async all<T>(){return {results:stmt.all(...args) as T[]};},
      async run(){const result=stmt.run(...args);return {meta:{changes:Number(result.changes)}};},
    };
  }
  async batch(items:Statement[]){
    this.client.exec('BEGIN IMMEDIATE');
    try{
      const out=[];
      for(const item of items)out.push(await item.run());
      this.client.exec('COMMIT');
      return out;
    }catch(err){this.client.exec('ROLLBACK');throw err;}
  }
}
const owner='123456789012345678';
const other='234567890123456789';
const event=(id:string,user=owner,values?:string[]):Interaction=>({
  type:3,id:'999999999999999999',guild_id:'987654321012345678',
  member:{user:{id:user,username:'tester'}},
  data:{custom_id:id,values},
});
const flatten=(list:any[]):any[]=>list.flatMap(c=>[c,...(Array.isArray(c.components)?flatten(c.components):[])]);
const panelData=(value:any)=>JSON.stringify(value?.data?.components??value);
const menu=(reply:any,prefix:string)=>flatten(reply.data.components)
  .find((c:any)=>c.type===3&&c.custom_id?.startsWith(prefix));

test('4-3-3 visual preserva categorias existentes no catálogo e tem 11 vagas',()=>{
  assert.equal(TACTICAL_433.length,11);
  assert.deepEqual(TACTICAL_433.map(x=>x.slot),[1,2,3,4,5,6,7,8,9,10,11]);
  assert.equal(SLOT_POSITION[1],'ZAG');
  assert.equal(compatibleSlot(2,'bremer'),true);
  assert.equal(compatibleSlot(2,'haaland'),false);
  assert.equal(compatibleSlot(9,'haaland'),true);
});

test('SVG do campo inclui 11 posições, jogadores reais e placeholders sem molduras antigas',async()=>{
  const db=new SqlDB();
  await start(db,owner);
  const rows=await lineup(db,owner);
  assert.equal(rows.length,11);
  const mock={ [rows[0].id]:'data:image/jpeg;base64,AAECAw==' };
  const svg=buildSquadSvg(rows,mock);
  assert.match(svg,/FUTSTANCY/);
  assert.match(svg,/4 - 3 - 3/);
  assert.match(svg,/11\/11 TITULARES/);
  assert.match(svg,/<image /);
  assert.ok(svg.includes('Bento'));
  assert.match(svg,/preserveAspectRatio="xMidYMid meet"/);
  assert.doesNotMatch(svg,/xMidYMid slice/);
  assert.ok(!svg.includes('assets/cards/'));
  assert.ok(!svg.includes('imagem antiga'));
  assert.equal(squadStats(rows).occupied,11);
  const url=squadImageUrl(owner,rows);
  assert.match(url,/\/art\/squad\.png\?user=123456789012345678&rev=v59\./);
  assert.ok(!url.includes(rows[0].id));
  const missing=buildSquadSvg([]);
  assert.match(missing,/0\/11 TITULARES/);
  assert.match(missing,/VAGA LIVRE/);
  db.client.close();
});

test('a imagem tática rejeita IDs inválidos sem consultar dados',async()=>{
  const response=await renderSquadImage(new Request('https://worker.example/art/squad.png?user=invalido'),{DB:null} as unknown as Env);
  assert.equal(response.status,400);
});

test('troca entre titulares da mesma posição mantém 11 titulares e não duplica cartas',async()=>{
  const db=new SqlDB();
  await start(db,owner);
  const before=await lineup(db,owner);
  const second=before.find(c=>c.slot===2)!;
  const third=before.find(c=>c.slot===3)!;
  assert.equal(getPlayer(second.player_key)?.pos,'ZAG');
  assert.equal(getPlayer(third.player_key)?.pos,'ZAG');
  assert.match(await setSlot(db,owner,third.id,2),/escalado/);
  const after=await lineup(db,owner);
  assert.equal(after.length,11);
  assert.equal(after.find(c=>c.slot===2)?.id,third.id);
  assert.equal(after.find(c=>c.slot===3)?.id,second.id);
  assert.equal(new Set(after.map(c=>c.id)).size,11);
  assert.equal(squadStats(after).occupied,11);
  db.client.close();
});

test('auto escalação prioriza OVR, depois raridade, depois aquisição',()=>{
  const base={
    id:'aaaa',player_key:'bremer',tier:'comum',acquired_ms:10,
  };
  const cards=[
    {...base,id:'a',tier:'comum',acquired_ms:10},
    {...base,id:'b',tier:'ouro',acquired_ms:5},
    {...base,id:'c',tier:'ouro',acquired_ms:20},
  ];
  const source=[...cards];
  const positions=chooseTeam(source);
  assert.equal(positions,null); // sem goleiro ou atacantes ainda
  const best=[...source].sort((a,b)=>b.acquired_ms-a.acquired_ms);
  assert.equal(best[0].id,'c');
});

test('/fut time é público, mostra o campo e seus controles funcionais sem mandar outra mensagem',async()=>{
  const db=new SqlDB();await start(db,owner);
  const env={DB:db} as Env;
  const slash:Interaction={
    type:2,id:'334455',guild_id:'987654321012345678',
    member:{user:{id:owner,username:'tester'}},
    data:{name:'fut',options:[{type:1,name:'time'}]},
  };
  const initial=await handleInteraction(slash,env) as any;
  assert.equal(initial.type,4);
  assert.equal(initial.data.flags&64,0);
  assert.match(panelData(initial),/Campo tático 4-3-3/);
  assert.match(panelData(initial),/squad\.png/);
  assert.ok(menu(initial,'team:slotpick:'));
  assert.ok(menu(initial,'team:playerpick:'));
  const manage=await handleInteraction(event('team:manage:'+owner),env) as any;
  assert.equal(manage.type,7);
  assert.ok(menu(manage,'team:slotpick:'));
  const options=menu(manage,'team:slotpick:').options;
  assert.equal(options.length,11);
  const select=await handleInteraction(event('team:slotpick:'+owner,owner,['2']),env) as any;
  assert.equal(select.type,7);
  assert.match(panelData(select),/Vaga 2/);
  assert.ok(menu(select,'team:apply:'));
  const cards=menu(select,'team:apply:').options;
  assert.ok(cards.length>=1);
  const apply=await handleInteraction(event('team:apply:'+owner+':2:0',owner,[cards[0].value]),env) as any;
  assert.equal(apply.type,7);
  assert.match(panelData(apply),/Campo tático 4-3-3/);
  const summary=await handleInteraction(event('team:summary:'+owner),env) as any;
  assert.equal(summary.type,7);
  assert.match(panelData(summary),/MAIORES OVRs/);
  const details=await handleInteraction(event('team:playerpick:'+owner,owner,['2']),env) as any;
  assert.equal(details.type,7);
  assert.match(panelData(details),/Titular/);
  const collection=await handleInteraction(event('team:collection:'+owner),env) as any;
  assert.equal(collection.type,7);
  assert.match(panelData(collection),/Álbum Futstancy/);
  const intruder=await handleInteraction(event('team:auto:'+owner,other),env) as any;
  assert.equal(intruder.type,4);
  assert.equal(intruder.data.flags&64,64);
  const auto=await handleInteraction(event('team:auto:'+owner),env) as any;
  assert.equal(auto.type,7);
  assert.match(panelData(auto),/Melhor escalação aplicada/);
  db.client.close();
});

test('listas de jogadores compatíveis excluem cartas anunciadas e preservam ID',async()=>{
  const db=new SqlDB();await start(db,owner);
  const env={DB:db} as Env;
  const result=await squadCandidates(env,owner,3,0) as any;
  assert.equal(result.type,4);
  const pick=menu(result,'team:apply:');
  assert.ok(pick);
  const choices=pick.options;
  assert.ok(choices.every((option:any)=>/^[a-f0-9]{16}$/.test(option.value)));
  const detail=await squadDetail(env,owner,3) as any;
  assert.match(panelData(detail),/ID:/);
  assert.match(panelData(detail),/Substituir/);
  db.client.close();
});
