import test from 'node:test';
import assert from 'node:assert/strict';
import { card, message, update, buildComponents, rows, button, V2 } from '../src/ui.ts';
import worker from '../src/index.ts';

const gallery=(title:string,description:string)=>{
  const list=buildComponents(title,description) as {type:number;items?:{media:{url:string}}[]}[];
  return list.filter(c=>c.type===12).flatMap(c=>c.items??[]).map(i=>i.media.url);
};

test('a coleção tem UMA arte completa, e não 8 cartas deformadas no Discord',()=>{
  const desc='1. **Dani Carvajal** · ZAG · **81 OVR**\n2. **Casemiro** · MEI · **81 OVR**\n3. **Richarlison** · ATA · **78 OVR**\n\n**11 cartas** · Página 2/2';
  const urls=gallery('🗂️ Sua coleção',desc);
  assert.equal(urls.length,1);
  assert.match(urls[0],/\/art\/collection\.png/);
  const u=new URL(urls[0]);
  assert.equal(u.searchParams.get('k'),'carvajal,casemiro,richarlison');
  assert.equal(u.searchParams.get('page'),'2/2');
});

test('mercado, time e pacote usam telas premium e conteúdo real do jogo',()=>{
  const market=gallery('🛒 Mercado de transferências','**1.** **Erling Haaland** · ATA · **93 OVR**\n💰 **9.000 coins** · Código: `123`');
  assert.equal(market.length,1);
  assert.match(market[0],/\/art\/market\.png/);
  assert.equal(new URL(market[0]).searchParams.get('prices'),'9000');
  const team=gallery('⚽ Sua equipe — 4-3-3','**1. GOL** · Alisson Becker (89 OVR)\n**2. ZAG** · Dani Carvajal (81 OVR)\n**Força total:** 84 OVR');
  assert.match(team[0],/\/art\/team\.png/);
  assert.equal(new URL(team[0]).searchParams.get('k'),'alisson,carvajal');
  assert.match(gallery('📦 Pacote aberto!','**Kylian Mbappé** · ATA · **94 OVR**\n**Pedri** · MEI · **88 OVR**')[0],/\/art\/pack\.png/);
});

test('todos os estados, inclusive sucesso e erro, usam V2 sem embeds e com arte',()=>{
  for(const response of [card('✅ Comprado!','Recebeu o jogador'),message('❌ Falhou'),update('🏟️ FIM DE JOGO','1 × 2')]){
    const data=response.data as {embeds?:unknown;content?:unknown;components: {type:number}[];flags?:number};
    assert.equal(data.embeds,undefined);assert.equal(data.content,undefined);
    assert.equal(data.components.some(c=>c.type===12),true);
  }
  assert.equal((card('Teste','OK').data.flags&V2),V2);
  assert.equal(rows([button('Comprar','buy:123')]).length,1);
});

test('Worker expõe catálogo de rotas e rejeita keys desconhecidas',async()=>{
  const ctx={waitUntil() {}};
  const status=await worker.fetch(new Request('https://example.org/art/status'),{} as never,ctx);
  assert.equal(status.status,200);
  assert.equal((await status.json() as {version:string}).version,'3.0.0');
  const no=await worker.fetch(new Request('https://example.org/art/player.png?k=bad'),{} as never,ctx);
  assert.equal(no.status,404);
});
