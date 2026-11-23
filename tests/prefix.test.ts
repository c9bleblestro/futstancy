import test from 'node:test';
import assert from 'node:assert/strict';
import { COMMANDS, COMMAND_ROOT, COMMAND_VERSION } from '../src/commands.ts';
import { handleInteraction } from '../src/handler.ts';
import { parseTextPrefix } from '../src/text-prefix.ts';
import type { Env, Interaction } from '../src/types.ts';

function slash(name:string,sub='ajuda'):Interaction{
  return {type:2,id:'slash-test',guild_id:'100',
    member:{user:{id:'123456789012345678',username:'tester'}},
    data:{name,options:[{name:sub,type:1}]},
  };
}

test('slash é /fut, prefixo S é apenas para mensagens normais',()=>{
  assert.equal(COMMAND_ROOT,'fut');
  assert.equal(COMMANDS.length,1);
  assert.equal(COMMANDS[0].name,'fut');
  assert.match(COMMAND_VERSION,/5\.9/);
  const names=COMMANDS[0].options.map(c=>c.name);
  for(const sub of ['ajuda','iniciar','obter','daily','pacote','colecao','artes','time','auto','escalar','desafiar','perfil','ranking','mercado','vender','comprar','cancelar'])
    assert.ok(names.includes(sub),sub+' ausente');
  assert.deepEqual(parseTextPrefix('Sobter'),{name:'obter',options:[]});
  assert.deepEqual(parseTextPrefix('S pacote ouro'),{name:'pacote',options:[{type:3,name:'tipo',value:'ouro'}]});
  assert.equal(parseTextPrefix('/fut obter'),null);
});

test('/fut ajuda é pública e o slash /s antigo não é reconhecido',async()=>{
  const accepted=await handleInteraction(slash('fut'),{} as Env) as any;
  assert.equal(accepted.type,4);
  assert.equal(accepted.data.flags&64,0);
  assert.match(JSON.stringify(accepted.data),/\/fut iniciar/);
  const old=await handleInteraction(slash('s'),{} as Env) as any;
  assert.equal(old.type,4);
  assert.equal(old.data.flags&64,64);
  assert.match(JSON.stringify(old.data),/Comando não reconhecido/);
});

test('botões da galeria editam a mesma mensagem pública; cliques não autorizados são privados',async()=>{
  const user='123456789012345678';
  const initial=await handleInteraction(slash('fut','artes'),{} as Env) as any;
  assert.equal(initial.type,4);
  assert.equal(initial.data.flags&64,0);
  const next=await handleInteraction({
    type:3,id:'next',member:{user:{id:user,username:'tester'}},
    data:{custom_id:'art:'+user+':cards:todas:1'},
  },{} as Env) as any;
  assert.equal(next.type,7);
  assert.equal(next.data.flags&64,0);
  assert.match(JSON.stringify(next.data),/2\//);
  const bad=await handleInteraction({
    type:3,id:'other',member:{user:{id:'999999999999999999',username:'other'}},
    data:{custom_id:'art:'+user+':cards:todas:1'},
  },{} as Env) as any;
  assert.equal(bad.type,4);
  assert.equal(bad.data.flags&64,64);
});
