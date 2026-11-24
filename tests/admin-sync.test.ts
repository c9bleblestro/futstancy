import test from 'node:test';
import assert from 'node:assert/strict';
import {COMMANDS,COMMAND_ROOT} from '../src/commands.ts';
import {handleInteraction} from '../src/handler.ts';
import {handleAdminSync,isAdministrator,isAdminSyncName} from '../src/admin-sync.ts';
import type {Database,Env,Interaction} from '../src/types.ts';

const APP='1514849502018928793',ADMIN='123456789012345678';
const session=(name:string,permissions='8'):Interaction=>({
  type:2,id:'112233445566778899',application_id:APP,
  guild_id:'234567890123456789',
  member:{permissions,user:{id:ADMIN,username:'tester'}},
  data:{name},
});
const db=()=>{
  const settings=new Map<string,string>();
  const queries:string[]=[];
  const value={
    prepare(sql:string){
      queries.push(sql);
      let args:(string|number|null)[]=[];
      return {
        bind(...p:(string|number|null)[]){args=p;return this;},
        async first<T=unknown>(){
          const result=settings.get(String(args[0]));
          return (result===undefined?null:{value:result}) as T|null;
        },
        async run(){
          if(sql.includes("VALUES('commands_version',?)"))settings.set('commands_version',String(args[0]));
          else if(sql.includes('VALUES(?,?)'))settings.set(String(args[0]),String(args[1]));
          return {meta:{changes:1}};
        },
      };
    },
    batch:async()=>[],
  };
  return {DB:value as unknown as Database,settings,queries};
};
const env=(DB:Database):Env=>({
  DB,DISCORD_PUBLIC_KEY:'test',DISCORD_APPLICATION_ID:APP,DISCORD_BOT_TOKEN:'fake-test-token',
});
const isPrivate=(response:any)=>response.type===4&&(response.data.flags&64)===64;
const stringify=(response:any)=>JSON.stringify(response.data.components);

test('dois novos comandos slash são administrativos, /fut e prefixo S continuam os mesmos',()=>{
  assert.equal(COMMAND_ROOT,'fut');
  assert.equal(COMMANDS[0].name,'fut');
  assert.deepEqual(COMMANDS.slice(1).map(c=>c.name),['sincronizar','parar_sincronizacao']);
  for(const command of COMMANDS.slice(1)){
    assert.equal(command.default_member_permissions,'8');
    assert.equal(command.type,1);
  }
  assert.equal(isAdminSyncName('sincronizar'),true);
  assert.equal(isAdminSyncName('parar_sincronizacao'),true);
  assert.equal(isAdminSyncName('raid'),false);
});

test('somente Administradores do servidor podem acionar sincronização',async()=>{
  assert.equal(isAdministrator(session('sincronizar','8')),true);
  assert.equal(isAdministrator(session('sincronizar','0')),false);
  assert.equal(isAdministrator(session('sincronizar','32')),false);
  const b=db();
  const denied=await handleInteraction(session('sincronizar','0'),env(b.DB)) as any;
  assert.equal(isPrivate(denied),true);
  assert.match(stringify(denied),/Apenas administradores/);
  assert.equal(b.queries.length,0);
});

test('sincronizar registra slash comandos em uma única chamada, sem publicar logs no canal',async()=>{
  const b=db(),called:{url:string;method:string;body:any;headers:Record<string,string>}[]=[];
  const request=async(url:string,init?:RequestInit)=>{
    called.push({url,method:init?.method??'GET',
      body:JSON.parse(String(init?.body)),
      headers:init?.headers as Record<string,string>});
    return new Response(JSON.stringify([]),{status:200});
  };
  const response=await handleAdminSync(session('sincronizar'),env(b.DB),request) as any;
  assert.equal(isPrivate(response),true);
  assert.match(stringify(response),/Sincronização concluída/);
  assert.equal(called.length,1);
  assert.equal(called[0].method,'PUT');
  assert.match(called[0].url,/\/applications\/1514849502018928793\/commands$/);
  assert.equal(called[0].body[0].name,'fut');
  assert.equal(called[0].body[1].name,'sincronizar');
  assert.equal(b.settings.get('commands_version')?.startsWith('v5.9.4'),true);
  assert.ok(b.settings.has('admin_commands_sync_last_ms'));
  assert.ok(!stringify(response).includes('@everyone'));
  const again=await handleAdminSync(session('sincronizar'),env(b.DB),request) as any;
  assert.equal(isPrivate(again),true);
  assert.match(stringify(again),/Aguarde/);
  assert.equal(called.length,1);
});

test('parar sincronizacao informa que não há trabalho contínuo, sem apagar dados ou mandar mensagens',async()=>{
  const b=db();
  const response=await handleInteraction(session('parar_sincronizacao'),env(b.DB)) as any;
  assert.equal(isPrivate(response),true);
  assert.match(stringify(response),/Nenhuma sincronização contínua/);
  assert.equal(b.queries.length,0);
  const missing=await handleAdminSync(session('sincronizar'),{DB:b.DB,DISCORD_PUBLIC_KEY:'key'} as Env) as any;
  assert.match(stringify(missing),/Configure DISCORD_APPLICATION_ID/);
  assert.equal(b.queries.length,0);
});
