import test from 'node:test';
import assert from 'node:assert/strict';
import { COMMANDS, COMMAND_ROOT, COMMAND_VERSION } from '../src/commands.ts';
import { handleInteraction } from '../src/handler.ts';
import type { Env, Interaction } from '../src/types.ts';

function interaction(name:string):Interaction {
  return {
    type:2,id:'prefix-check',guild_id:'100',
    member:{user:{id:'123456789012345678',username:'tester'}},
    data:{name,options:[{name:'ajuda',type:1}]},
  };
}

test('todos os subcomandos são registrados sob o prefixo /s',()=>{
  assert.equal(COMMAND_ROOT,'s');
  assert.equal(COMMANDS.length,1);
  assert.equal(COMMANDS[0].name,COMMAND_ROOT);
  assert.ok(COMMAND_VERSION.includes('s-prefix'));
  const names=COMMANDS[0].options.map(c=>c.name);
  for(const sub of ['ajuda','iniciar','obter','daily','pacote','colecao','artes','time','auto','escalar','desafiar','perfil','ranking','mercado','vender','comprar','cancelar']){
    assert.ok(names.includes(sub),sub+' ausente');
  }
});

test('dispatcher reconhece /s ajuda e rejeita /fut antigo',async()=>{
  const allowed=await handleInteraction(interaction('s'),{} as Env);
  assert.match(JSON.stringify(allowed),/\/s iniciar/);
  assert.doesNotMatch(JSON.stringify(allowed),/\/fut iniciar/);
  const old=await handleInteraction(interaction('fut'),{} as Env);
  assert.match(JSON.stringify(old),/Comando não reconhecido/);
});
