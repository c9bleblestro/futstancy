import test from 'node:test';
import assert from 'node:assert/strict';
import {handleActivity} from '../src/activity.ts';
import {registeredCommands} from '../src/commands.ts';
import type {Env} from '../src/types.ts';
const env={DISCORD_APPLICATION_ID:'123456789012345678'} as Env;
test('native activity renders distinct app and serves bundled client',async()=>{
 const response=handleActivity(new Request('https://example.test/?frame_id=f&instance_id=i'),env);
 assert.match(await response.text(),/participantes/);
 const js=handleActivity(new Request('https://example.test/activity/client.js'),env);
 assert.equal(js.status,200);
 assert.ok((await js.text()).length>10000);
 const conf=handleActivity(new Request('https://example.test/activity/config'),env);
 assert.deepEqual(await conf.json(),{applicationId:'123456789012345678'});
});
test('native app launcher registration is explicitly enabled',()=>{
 assert.equal(registeredCommands().length,3);
 assert.equal((registeredCommands('1').at(-1) as any).handler,2);
 assert.equal((registeredCommands('1').at(-1) as any).name,'launch');
});
