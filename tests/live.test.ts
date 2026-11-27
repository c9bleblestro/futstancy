import test from 'node:test';
import assert from 'node:assert/strict';
import {clipUrl,handleLiveCommand,handleLiveHttp} from '../src/live.ts';
import {parseTextPrefix} from '../src/text-prefix.ts';
import {registeredCommands} from '../src/commands.ts';
import type {Env,Interaction} from '../src/types.ts';
const user='123456789012345678';
const i={type:2,id:'1',member:{user:{id:user,username:'test'}}} as Interaction;
const env={DISCORD_PUBLIC_KEY:'test'} as Env;
test('clip canonicalization rejects arbitrary or deceptive hosts',()=>{
  assert.equal(clipUrl('https://youtu.be/dQw4w9WgXcQ?t=3'),'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(clipUrl('https://clips.twitch.tv/SomeClip'),'https://clips.twitch.tv/SomeClip');
  assert.equal(clipUrl('https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ'),null);
  assert.equal(clipUrl('javascript:alert(1)'),null);
});
test('prefix cannot request private credentials and panel is V2',async()=>{
  assert.ok('error' in parseTextPrefix('Slive iniciar')!);
  const output=await handleLiveCommand(i,env,user,[{name:'acao',type:3,value:'iniciar'}]) as any;
  assert.equal(output.data.flags,32768|64);
  assert.match(JSON.stringify(output),/comando slash/);
  assert.match(JSON.stringify(await handleLiveCommand(i,env,user,[])),/Abrir central LIVE/);
});
test('missing media config does not create a room',async()=>{
  const output=await handleLiveCommand({...i,token:'test',application_id:'app'},env,user,[{name:'acao',type:3,value:'iniciar'}]);
  assert.match(JSON.stringify(output),/indisponível/);
});
test('Activity registration is opt-in and public panel is real HTML',async()=>{
  assert.equal(registeredCommands().length,3);
  assert.equal((registeredCommands('1').at(-1) as any).type,4);
  const r=await handleLiveHttp(new Request('https://example.test/live'),env);
  assert.equal(r.status,200);
  assert.match(await r.text(),/GAMESTANCY/);
  const a=await handleLiveHttp(new Request('https://example.test/live/auth'),env);
  assert.equal(a.status,405);
});
