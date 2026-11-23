import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {start,account,lineup} from '../src/storage.ts';
import {discordIdentity,buildProfileSvg,renderProfileImage} from '../src/profile-image.ts';
import {profileImageUrl,profilePanel} from '../src/profile-ui.ts';
import {handleInteraction} from '../src/handler.ts';
import type {Env,Database,Statement,Interaction} from '../src/types.ts';

const owner='123456789012345678',other='234567890123456789';
const guild='345678901234567890';
const blobHash='a'.repeat(32),guildHash='b'.repeat(32);
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
    try{const result=[];for(const x of items)result.push(await x.run());this.client.exec('COMMIT');return result;}
    catch(e){this.client.exec('ROLLBACK');throw e;}
  }
}
const interaction=(type=2,id='',user=owner):Interaction=>({
  type,id:'778899001122334455',guild_id:guild,
  member:{nick:'Treinador Elite',avatar:guildHash,user:{
    id:user,username:'usuario123',global_name:'Minha Conta',avatar:blobHash,
  }},
  data:type===2?{name:'fut',options:[{type:1,name:'perfil'}]}:{custom_id:id},
});
function nodes(data:any):any[]{
  return (data?.data?.components??[]).flatMap(function walk(c:any):any[]{
    return [c,...(c.components??[]).flatMap(walk)];
  });
}
const panelText=(r:any)=>JSON.stringify(r?.data?.components??[]);
test('Dashboard utiliza stats REAIS no SVG e nenhum botão desenhado na imagem',async()=>{
  const db=new SqlDB();await start(db,owner);
  const me=(await account(db,owner))!;
  const rows=await lineup(db,owner);
  const svg=buildProfileSvg({...me,coins:2345,wins:8,draws:1,losses:1,goals_for:21,goals_against:7},
    rows,{name:'Treinador Elite',avatarUrl:null},{});
  assert.match(svg,/Treinador Elite/);
  assert.match(svg,/2\.345/);
  assert.match(svg,/PARTIDAS/);
  assert.match(svg,/80%/);
  assert.match(svg,/21/);
  assert.match(svg,/4 - 3 - 3/);
  assert.match(svg,/MELHOR TITULAR/);
  assert.doesNotMatch(svg,/bot[aã]o|<button|onClick=|onclick=/i);
  assert.doesNotMatch(svg,/LV\.|N[ÍI]VEL|1\.542\.000|BELLINGHAM/);
  db.client.close();
});
test('Discord fornece nome e avatar próprios do servidor sempre que houver permissão',async()=>{
  const urls:string[]=[];
  const fetcher=async(url:string)=>{
    urls.push(url);
    if(url.includes('/members/'))return new Response(JSON.stringify({nick:'Nome do Servidor',avatar:guildHash}),
      {status:200,headers:{'content-type':'application/json'}});
    return new Response(JSON.stringify({username:'Nome Discord',global_name:'Nome Global',avatar:blobHash}),
      {status:200,headers:{'content-type':'application/json'}});
  };
  const id=await discordIdentity(owner,guild,{DISCORD_BOT_TOKEN:'fake-token'} as Env,fetcher);
  assert.equal(id.name,'Nome do Servidor');
  assert.match(id.avatarUrl??'',/\/guilds\/345678901234567890\/users\/123456789012345678\/avatars\/bbbb/);
  assert.equal(urls.length,2);
  const defaultName=await discordIdentity(owner,guild,{} as Env,fetcher,{name:'Nome do Clique',avatar:blobHash});
  assert.equal(defaultName.name,'Nome do Clique');
  assert.match(defaultName.avatarUrl??'',/\/avatars\/123456789012345678\/aaaa/);
});
test('um nickname ou foto diferente altera o URL de imagem e o refresh consulta o D1',async()=>{
  const a=interaction(2);
  const first=profileImageUrl(owner,a);
  assert.match(first,/art\/profile\.png/);
  assert.match(first,/name=Treinador\+Elite/);
  assert.match(first,/avatar=aaaa/);
  assert.match(first,/gavatar=bbbb/);
  const b=interaction(2);
  b.member!.nick='Novo Nome';
  b.member!.avatar='c'.repeat(32);
  const second=profileImageUrl(owner,b);
  assert.notEqual(first,second);
  assert.match(second,/Novo\+Nome/);
  const db=new SqlDB();await start(db,owner);
  const env={DB:db} as Env;
  const panel=await profilePanel(env,owner,a) as any;
  assert.equal(panel.type,4);
  assert.equal(panel.data.flags&64,0);
  const components=nodes(panel);
  const media=components.filter((c:any)=>c.type===12);
  assert.equal(media.length,1);
  assert.match(JSON.stringify(media),/profile\.png/);
  assert.ok(components.filter((c:any)=>c.type===2).some((b:any)=>b.custom_id==='profile:refresh:'+owner));
  assert.ok(!components.filter((c:any)=>c.type===12)[0].items[0].media.url.includes('assets/ui/v57/perfil.jpg'));
  db.client.close();
});
test('/fut perfil público + atualizar, time, coleção e mercado sem novas mensagens',async()=>{
  const db=new SqlDB();await start(db,owner);
  const env={DB:db} as Env;
  const initial=await handleInteraction(interaction(),env) as any;
  assert.equal(initial.type,4);
  assert.match(panelText(initial),/Perfil do treinador/);
  assert.match(panelText(initial),/profile\.png/);
  for(const action of ['refresh','team','collection','market']){
    const reply=await handleInteraction(interaction(3,'profile:'+action+':'+owner),env) as any;
    assert.equal(reply.type,7,action+' não editou o painel');
    assert.equal(reply.data.flags&64,0);
  }
  const blocked=await handleInteraction(interaction(3,'profile:refresh:'+owner,other),env) as any;
  assert.equal(blocked.type,4);
  assert.equal(blocked.data.flags&64,64);
  const malformed=await renderProfileImage(new Request('https://localhost/art/profile.png?user=xyz'),env);
  assert.equal(malformed.status,400);
  db.client.close();
});
