import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldDeferInteraction,completeDeferredInteraction,reportDeferredFailure} from '../src/deferred.ts';
import {galleryArtFiles} from '../src/packs.ts';
import type {Env,Interaction} from '../src/types.ts';

const APP='1514849502018928793';
const OWNER='123456789012345678';
const env={} as Env;
function interaction(user=OWNER,id='art:'+OWNER+':cards:todas:1'):Interaction {
  return {type:3,id:'1234567890123456700',application_id:APP,token:'secret-interaction-token',
    guild_id:'111111111111111111',member:{user:{id:user,username:'tester'}},
    data:{custom_id:id}};
}
function capture(){
  const calls:{url:string;method:string;data:any}[]=[];
  const fetcher=async(url:string,init?:RequestInit)=>{
    calls.push({url,method:init?.method??'GET',data:JSON.parse(String(init?.body??'{}'))});
    return new Response('',{status:204});
  };
  return {calls,fetcher};
}
test('navegação do álbum e da galeria confirma imediatamente e edita mensagem existente',async()=>{
  const i=interaction(),{calls,fetcher}=capture();
  assert.equal(shouldDeferInteraction(i,env),true);
  await completeDeferredInteraction(i,env,fetcher);
  assert.equal(calls.length,1);
  assert.equal(calls[0].method,'PATCH');
  assert.match(calls[0].url,/\/messages\/@original$/);
  assert.ok(Array.isArray(calls[0].data.components));
  assert.match(JSON.stringify(calls[0].data.components),/Cartas · Todas 2\/9/);
  assert.ok(calls[0].data.components.some((c:any)=>c.type===17));
  assert.ok(!JSON.stringify(calls[0].data).includes('/assets/cards/'));
});
test('filtro Eclipse tem somente artes completas e uma página; Próxima vem desativada',async()=>{
  assert.equal(galleryArtFiles('eclipse').length,5);
  const i=interaction(OWNER,'art:'+OWNER+':cards:eclipse:0');
  const {calls,fetcher}=capture();
  await completeDeferredInteraction(i,env,fetcher);
  const body=JSON.stringify(calls[0].data);
  assert.match(body,/Eclipse 1\/1/);
  const components=calls[0].data.components[0].components.flatMap((c:any)=>
    c.type===1?c.components:[]);
  const next=components.find((c:any)=>c.label==='Próxima ▶');
  assert.ok(next);
  assert.equal(next.disabled,true);
  assert.ok(!body.includes('eclipse_previa'));
  assert.ok(!body.includes('assets/cards/'));
});
test('usuário que não é dono recebe erro privado sem substituir a galeria pública',async()=>{
  const i=interaction('999999999999999999'),{calls,fetcher}=capture();
  await completeDeferredInteraction(i,env,fetcher);
  assert.equal(calls.length,1);
  assert.equal(calls[0].method,'POST');
  assert.equal(calls[0].data.flags,32768|64);
  assert.ok(!calls[0].url.endsWith('@original'));
});
test('a resposta de recuperação também é privada e comandos slash não entram no defer',async()=>{
  const i=interaction(),{calls,fetcher}=capture();
  await reportDeferredFailure(i,env,fetcher);
  assert.equal(calls[0].method,'POST');
  assert.equal(calls[0].data.flags,32768|64);
  assert.equal(shouldDeferInteraction({...i,type:2},env),false);
  assert.equal(shouldDeferInteraction({...i,token:undefined},env),false);
  assert.equal(shouldDeferInteraction({...i,data:{custom_id:'colsell:'+OWNER+':aabb'}},env),false);
});
