import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPlayer } from '../src/catalog.ts';
import { account, start, ownedCards, collectionPage, ALBUM_PAGE_SIZE, lineup, lineupPlayers, daily, claim, openPack, listCard, buyCard, createChallenge, resolveChallenge, autoLineup, cancelListing } from '../src/storage.ts';
import { handleInteraction } from '../src/handler.ts';
import type { Interaction, Env } from '../src/types.ts';
import type { Database, Statement } from '../src/types.ts';

class SqlDB implements Database {
  client = new DatabaseSync(':memory:');
  constructor() {
    this.client.exec('PRAGMA foreign_keys = ON');
    this.client.exec(readFileSync(join(import.meta.dirname, '../migrations/0001_init.sql'), 'utf8'));
    this.client.exec(readFileSync(join(import.meta.dirname, '../migrations/0002_card_editions.sql'), 'utf8'));
  }
  prepare(sql: string): Statement {
    const stmt = this.client.prepare(sql);
    let args: (string | number | null)[] = [];
    return {
      bind(...x) { args = x; return this; },
      async first<T>() { return (stmt.get(...args) ?? null) as T | null; },
      async all<T>() { return { results: stmt.all(...args) as T[] }; },
      async run() { const result = stmt.run(...args); return { meta: { changes: Number(result.changes) } }; },
    };
  }
  async batch(statements: Statement[]) {
    this.client.exec('BEGIN IMMEDIATE');
    try {
      const out = [];
      for (const stmt of statements) out.push(await stmt.run());
      this.client.exec('COMMIT');
      return out;
    } catch (err) { this.client.exec('ROLLBACK'); throw err; }
  }
}

test('clube novo recebe 11 jogadores e não pode ser criado duas vezes', async () => {
  const db = new SqlDB();
  assert.equal(await start(db, 'player-a'), true);
  assert.equal(await start(db, 'player-a'), false);
  assert.equal((await ownedCards(db, 'player-a')).length, 11);
  assert.equal((await lineup(db, 'player-a')).length, 11);
  assert.equal((await account(db, 'player-a'))?.coins, 1500);
  assert.equal(await autoLineup(db, 'player-a'), true);
  db.client.close();
});

test('daily e obtenção respeitam cooldown; pacote custa coins e dá 3 cartas', async () => {
  const db = new SqlDB();
  await start(db, 'player-a');
  assert.equal((await daily(db, 'player-a')).ok, true);
  assert.equal((await daily(db, 'player-a')).ok, false);
  const player = getPlayer('haaland')!;
  assert.equal((await claim(db, 'player-a', player)).ok, true);
  assert.equal((await claim(db, 'player-a', player)).ok, false);
  assert.equal((await openPack(db, 'player-a')).ok, true);
  assert.equal((await ownedCards(db, 'player-a')).length, 15);
  assert.equal((await account(db, 'player-a'))?.coins, 950);
  db.client.close();
});

test('mercado transfere carta e coins uma única vez, sem permitir vender titular', async () => {
  const db = new SqlDB();
  await start(db, 'player-a');
  await start(db, 'player-b');
  const first = (await ownedCards(db, 'player-a'))[0];
  assert.equal((await listCard(db, 'player-a', first.id, 350)).ok, false);
  const extra = await claim(db, 'player-a', getPlayer('mbappe')!);
  assert.equal(extra.ok, true);
  const listing = await listCard(db, 'player-a', extra.cardId!, 1000);
  assert.equal(listing.ok, true);
  assert.equal((await buyCard(db, 'player-a', listing.id!)).ok, false);
  assert.equal((await buyCard(db, 'player-b', listing.id!)).ok, true);
  assert.equal((await buyCard(db, 'player-b', listing.id!)).ok, false);
  assert.equal((await account(db, 'player-b'))?.coins, 500);
  assert.equal((await account(db, 'player-a'))?.coins, 2450);
  assert.equal((await ownedCards(db, 'player-b')).length, 12);
  assert.equal(await cancelListing(db, 'player-a', listing.id!), false);
  db.client.close();
});

test('desafio aceita uma única vez, registra gols, resultados e coins', async () => {
  const db = new SqlDB();
  await start(db, 'player-a');
  await start(db, 'player-b');
  const match = await createChallenge(db, 'player-a', 'player-b');
  assert.equal((await resolveChallenge(db, match.id, 'player-a', true)).state, 'só quem foi desafiado pode responder');
  const result = await resolveChallenge(db, match.id, 'player-b', true);
  assert.equal(result.state, 'concluído');
  assert.equal((await resolveChallenge(db, match.id, 'player-b', true)).state, 'desafio encerrado ou expirado');
  const a = (await account(db, 'player-a'))!;
  const b = (await account(db, 'player-b'))!;
  assert.equal(a.wins + a.draws + a.losses, 1);
  assert.equal(b.wins + b.draws + b.losses, 1);
  assert.ok(a.coins > 1500 && b.coins > 1500);
  assert.equal(lineupPlayers(await lineup(db, 'player-b'))?.length, 11);
  db.client.close();
});


test('pacotes comuns geram 3 cartas com edição persistente e custo correto',async()=>{
  const db=new SqlDB();
  await start(db,'alice');
  const opened=await openPack(db,'alice','comum');
  assert.equal(opened.ok,true);
  assert.equal(opened.cards.length,3);
  assert.equal(opened.cost,450);
  assert.ok(opened.cards.every(c=>c.tier==='comum'&&c.edition.startsWith('comum')));
  const collection=await ownedCards(db,'alice');
  assert.equal(collection.length,14);
  for(const acquired of opened.cards){
    const saved=collection.find(c=>c.id===acquired.id)!;
    assert.equal(saved.edition,acquired.edition);
    assert.equal(saved.tier,acquired.tier);
  }
  assert.equal((await account(db,'alice'))?.coins,1050);
  assert.equal((await openPack(db,'alice','eclipse')).ok,false);
  assert.equal((await ownedCards(db,'alice')).length,14);
  db.client.close();
});

test('cartas antigas sobrevivem e cada edição permanece após transferência',async()=>{
  const db=new SqlDB();
  await start(db,'seller');await start(db,'buyer');
  const old=await ownedCards(db,'seller');
  assert.equal(old.length,11);
  assert.ok(old.every(c=>c.edition==='legado'&&c.tier==='legado'));
  const opened=await openPack(db,'seller','prata');
  assert.equal(opened.ok,true);
  const acquired=opened.cards[0];
  const listed=await listCard(db,'seller',acquired.id,1000);
  assert.equal(listed.ok,true);
  const bought=await buyCard(db,'buyer',listed.id!);
  assert.equal(bought.ok,true);
  assert.equal(bought.edition,acquired.edition);
  assert.equal(bought.tier,'prata');
  const buyerCard=(await ownedCards(db,'buyer')).find(c=>c.id===acquired.id)!;
  assert.equal(buyerCard.edition,acquired.edition);
  assert.equal(buyerCard.tier,'prata');
  db.client.close();
});


test('álbum V5: oito miniaturas por página e progresso inclui atletas clássicos',async()=>{
  const db=new SqlDB(), owner='123456789012345678';
  await start(db,owner);
  const first=await collectionPage(db,owner,0);
  assert.equal(ALBUM_PAGE_SIZE,8);
  assert.equal(first.total,11);
  assert.equal(first.cards.length,8);
  assert.equal(first.pages,2);
  assert.ok(first.discovered>0);
  const second=await collectionPage(db,owner,1);
  assert.equal(second.cards.length,3);
  const sender=(data:Interaction['data'],type=2):Interaction=>({
    type,id:'album-interaction',guild_id:'234567890123456789',
    member:{user:{id:owner,username:'tester'}},data,
  });
  const flatten=(items:any[]):any[]=>items.flatMap(x=>[x,...(Array.isArray(x.components)?flatten(x.components):[])]);
  const response=await handleInteraction(sender({name:'fut',options:[{type:1,name:'colecao'}]}),{DB:db} as Env) as any;
  const nodes=flatten(response.data.components);
  assert.equal(nodes.filter(x=>x.type===12).flatMap(x=>x.items).length,8);
  const menu=nodes.find(x=>x.type===3&&x.custom_id.startsWith('colview:'));
  assert.ok(menu);
  assert.equal(menu.options.length,8);
  const filter=nodes.find(x=>x.type===3&&x.custom_id.startsWith('colfilter:'));
  assert.equal(filter.options.length,8);
  assert.doesNotMatch(JSON.stringify(response.data.components),/Carta:\s*[a-f0-9]{16}/);
  const detail=await handleInteraction(sender({custom_id:menu.custom_id,values:[menu.options[0].value]},3),{DB:db} as Env) as any;
  assert.match(JSON.stringify(detail),/Ficha da carta/);
  assert.match(JSON.stringify(detail),new RegExp(menu.options[0].value));
  assert.equal(flatten(detail.data.components).filter(x=>x.type===12).length,1);
  const filtered=await handleInteraction(sender({custom_id:'colfilter:'+owner,values:['legado']},3),{DB:db} as Env) as any;
  assert.match(JSON.stringify(filtered),/Clássica/);
  const forbidden=await handleInteraction({
    ...sender({custom_id:menu.custom_id,values:[menu.options[0].value]},3),
    member:{user:{id:'345678901234567890',username:'other'}},
  },{DB:db} as Env) as any;
  assert.match(JSON.stringify(forbidden),/pertence a outro jogador/);
  db.client.close();
});

test('álbum permite anunciar carta selecionada com modal de preço validado',async()=>{
  const db=new SqlDB(), owner='123456789012345678';
  await start(db,owner);
  const extra=await claim(db,owner,getPlayer('mbappe')!);
  assert.equal(extra.ok,true);
  const chosen=extra.cardId!;
  const custom='colsell:'+owner+':'+chosen+':todas:0';
  const evt=(type:number,data:Interaction['data']):Interaction=>({
    type,id:'album-sell',guild_id:'234567890123456789',member:{user:{id:owner,username:'tester'}},data,
  });
  const modal=await handleInteraction(evt(3,{custom_id:custom}),{DB:db} as Env) as any;
  assert.equal(modal.type,9);
  assert.equal(modal.data.components[0].type,18);
  assert.equal(modal.data.components[0].component.custom_id,'price');
  assert.match(modal.data.custom_id,/^colprice:/);
  const invalid=await handleInteraction(evt(5,{custom_id:modal.data.custom_id,components:[
    {type:1,components:[{type:4,custom_id:'price',value:'12'}]},
  ]}),{DB:db} as Env) as any;
  assert.match(JSON.stringify(invalid),/100 a 200000/);
  const sold=await handleInteraction(evt(5,{custom_id:modal.data.custom_id,components:[
    {type:18,component:{type:4,custom_id:'price',value:'1500'}},
  ]}),{DB:db} as Env) as any;
  assert.match(JSON.stringify(sold),/Carta anunciada/);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM market WHERE card_id=? AND status='active'").bind(chosen).first<{n:number}>())?.n,1);
  db.client.close();
});


test('painéis do álbum, mercado e pacotes são públicos; navegação atualiza o mesmo painel',async()=>{
  const db=new SqlDB(),owner='123456789012345678';
  await start(db,owner);
  const env={DB:db} as Env;
  const slash=(sub:string):Interaction=>({
    type:2,id:'slash-55',guild_id:'234567890123456789',
    member:{user:{id:owner,username:'tester'}},
    data:{name:'fut',options:[{type:1,name:sub}]},
  });
  const component=(custom_id:string,values?:string[]):Interaction=>({
    type:3,id:'component-55',guild_id:'234567890123456789',
    member:{user:{id:owner,username:'tester'}},
    data:{custom_id,values},
  });
  const coll=await handleInteraction(slash('colecao'),env) as any;
  assert.equal(coll.type,4);
  assert.equal(coll.data.flags&64,0);
  const inner=coll.data.components[0].components;
  const pick=inner.flatMap((n:any)=>n.type===1?n.components:[])
    .find((n:any)=>n.type===3&&n.custom_id.startsWith('colview:'));
  assert.ok(pick);
  const next=await handleInteraction(component('col:'+owner+':todas:1'),env) as any;
  assert.equal(next.type,7);
  assert.equal(next.data.flags&64,0);
  const detail=await handleInteraction(component(pick.custom_id,[pick.options[0].value]),env) as any;
  assert.equal(detail.type,7);
  assert.match(JSON.stringify(detail.data.components),/Ficha da carta/);
  const marketButton=await handleInteraction(component('mktowner:'+owner+':todas'),env) as any;
  assert.equal(marketButton.type,7);
  const foreignClick=await handleInteraction({
    ...component('mktowner:'+owner+':todas'),
    member:{user:{id:'345678901234567890',username:'other'}},
  },env) as any;
  assert.equal(foreignClick.type,4);
  assert.equal(foreignClick.data.flags&64,64);
  const invalidPurchase=await handleInteraction(component('buy:0123456789abcdef'),env) as any;
  assert.equal(invalidPurchase.type,4);
  assert.equal(invalidPurchase.data.flags&64,64);
  const market=await handleInteraction(slash('mercado'),env) as any;
  assert.equal(market.type,4);
  assert.equal(market.data.flags&64,0);
  const filtered=await handleInteraction(component('mkt:prata'),env) as any;
  assert.equal(filtered.type,7);
  const shop=await handleInteraction(slash('pacote'),env) as any;
  assert.equal(shop.type,4);
  assert.equal(shop.data.flags&64,0);
  const opened=await handleInteraction(component('pack:'+owner+':comum'),env) as any;
  assert.equal(opened.type,7);
  assert.equal(opened.data.flags&64,0);
  assert.match(JSON.stringify(opened.data.components),/aberto/);
  db.client.close();
});
