import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTextPrefix } from '../src/text-prefix.ts';
import { handleTextPrefixRequest } from '../src/prefix-endpoint.ts';
import { V2 } from '../src/ui.ts';
import type { Env, Database, Statement } from '../src/types.ts';

const command=(content:string)=>{
  const out=parseTextPrefix(content);
  assert.ok(out && 'name' in out,content);
  return out;
};

test('prefixo S funciona como mensagem de texto, não apenas slash',()=>{
  for(const [content,name] of [
    ['Sobter','obter'],['S obter','obter'],['sobter','obter'],
    ['Scolecao','colecao'],['S coleção','colecao'],['Spacote','pacote'],
    ['S ajuda','ajuda'],['S','ajuda'],['Sdaily','daily'],
    ['Sdesafiar <@123456789012345678>','desafiar'],
    ['Stime','time'],['Sranking','ranking'],['Sperfil','perfil'],
  ])assert.equal(command(content).name,name);
  assert.equal(parseTextPrefix('/s obter'),null);
  assert.equal(parseTextPrefix('salve, pessoal'),null);
  assert.equal(parseTextPrefix('Sou fã de futebol'),null);
  assert.equal(parseTextPrefix('Spacoteiro'),null);
});

test('argumentos de pacotes, mercado, escalação, compra e desafio são convertidos',()=>{
  assert.deepEqual(command('Spacote lendário').options,[{name:'tipo',type:3,value:'lendario'}]);
  assert.deepEqual(command('S pacote ícone').options,[{name:'tipo',type:3,value:'icone'}]);
  assert.deepEqual(command('Scolecao prata').options,[{name:'raridade',type:3,value:'prata'}]);
  assert.deepEqual(command('S mercado ouro').options,[{name:'raridade',type:3,value:'ouro'}]);
  assert.deepEqual(command('Sescalar 0123456789abcdef 9').options,[
    {name:'id',type:3,value:'0123456789abcdef'},{name:'vaga',type:4,value:9},
  ]);
  assert.deepEqual(command('Svender 0123456789abcdef 1.500').options,[
    {name:'id',type:3,value:'0123456789abcdef'},{name:'preco',type:4,value:1500},
  ]);
  assert.deepEqual(command('Sdesafiar <@!123456789012345678>').options,[
    {name:'membro',type:6,value:'123456789012345678'},
  ]);
  assert.deepEqual(command('Scomprar 0123456789abcdef').options,[
    {name:'codigo',type:3,value:'0123456789abcdef'},
  ]);
  assert.deepEqual(command('Scancelar 0123456789abcdef').options,[
    {name:'codigo',type:3,value:'0123456789abcdef'},
  ]);
  for(const input of ['Spacote premium','Sdesafiar sem-mencao','Sescalar abc 1','Svender abc 900']){
    const result=parseTextPrefix(input);
    assert.ok(result && 'error' in result);
  }
});

class SqlDB implements Database {
  client=new DatabaseSync(':memory:');
  constructor(){
    this.client.exec('PRAGMA foreign_keys=ON');
    for(const name of ['0001_init.sql','0002_card_editions.sql','0003_text_prefix.sql']){
      this.client.exec(readFileSync(join(import.meta.dirname,'../migrations',name),'utf8'));
    }
  }
  prepare(sql:string):Statement {
    const stmt=this.client.prepare(sql);
    let args:(string|number|null)[]=[];
    return {
      bind(...x){args=x;return this;},
      async first<T>(){return (stmt.get(...args)??null) as T|null;},
      async all<T>(){return {results:stmt.all(...args) as T[]};},
      async run(){const r=stmt.run(...args);return {meta:{changes:Number(r.changes)}};},
    };
  }
  async batch(statements:Statement[]){
    this.client.exec('BEGIN IMMEDIATE');
    try{
      const output=[];
      for(const stmt of statements)output.push(await stmt.run());
      this.client.exec('COMMIT');
      return output;
    }catch(err){
      this.client.exec('ROLLBACK');
      throw err;
    }
  }
}
const SECRET='shared-secret-for-discord-gateway-1234567890';
const baseEvent={content:'Sajuda',
  user_id:'123456789012345678',
  guild_id:'234567890123456789',
  channel_id:'345678901234567890',
  message_id:'456789012345678901'};
const request=(event:object,secret=SECRET)=>new Request('https://worker.example/prefix/execute',{
  method:'POST',
  headers:{authorization:'Bearer '+secret,'content-type':'application/json'},
  body:JSON.stringify(event),
});

test('o endpoint autentica Gateway, rejeita falsificações e elimina eventos duplicados',async()=>{
  const db=new SqlDB();
  const env={DB:db,PREFIX_GATEWAY_SECRET:SECRET} as Env;
  const forged=await handleTextPrefixRequest(request(baseEvent,'token-errado'),env);
  assert.equal(forged.status,401);
  assert.equal((await handleTextPrefixRequest(request({...baseEvent,user_id:'user-invalido'}),env)).status,400);
  const first=await handleTextPrefixRequest(request(baseEvent),env);
  assert.equal(first.status,200);
  const result=await first.json() as {flags:number;components:{type:number}[];allowed_mentions:{parse:string[]}};
  assert.equal(result.flags,V2);
  assert.equal(result.flags&64,0);
  assert.equal(result.components[0]?.type,17);
  assert.deepEqual(result.allowed_mentions.parse,[]);
  assert.match(JSON.stringify(result.components),/FUTSTANCY/);
  assert.equal((await handleTextPrefixRequest(request(baseEvent),env)).status,204);
  assert.equal(db.client.prepare('SELECT COUNT(*) AS n FROM prefix_messages').get().n,1);
  db.client.close();
});

test('Siniciar por mensagem cria 11 cartas só uma vez, preservando D1',async()=>{
  const db=new SqlDB();
  const env={DB:db,PREFIX_GATEWAY_SECRET:SECRET} as Env;
  const event={...baseEvent,content:'Siniciar',message_id:'567890123456789012'};
  assert.equal((await handleTextPrefixRequest(request(event),env)).status,200);
  assert.equal(db.client.prepare('SELECT COUNT(*) AS n FROM cards').get().n,11);
  assert.equal((await handleTextPrefixRequest(request(event),env)).status,204);
  assert.equal(db.client.prepare('SELECT COUNT(*) AS n FROM cards').get().n,11);
  const again=await handleTextPrefixRequest(request({...event,message_id:'678901234567890123'}),env);
  assert.equal(again.status,200);
  assert.equal(db.client.prepare('SELECT COUNT(*) AS n FROM cards').get().n,11);
  db.client.close();
});

test('comando inválido é silencioso e argumentos ausentes retornam orientação',async()=>{
  const db=new SqlDB();
  const env={DB:db,PREFIX_GATEWAY_SECRET:SECRET} as Env;
  assert.equal((await handleTextPrefixRequest(request({...baseEvent,content:'Salve pessoal'}),env)).status,204);
  const wrong=await handleTextPrefixRequest(request({...baseEvent,content:'Sdesafiar sem-usuario'}),env);
  assert.equal(wrong.status,200);
  assert.match(await wrong.text(),/Uso correto/);
  db.client.close();
});
