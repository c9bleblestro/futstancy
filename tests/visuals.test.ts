import test from 'node:test';
import assert from 'node:assert/strict';
import { card, message, update, buildComponents, rows, button, V2 } from '../src/ui.ts';
import worker from '../src/index.ts';
import { PLAYERS } from '../src/catalog.ts';

const gallery=(title:string,description:string)=>{
  const list=buildComponents(title,description) as {type:number;items?:{media:{url:string}}[]}[];
  return list.filter(c=>c.type===12).flatMap(c=>c.items??[]).map(i=>i.media.url);
};

test('coleção envia fotos em cartas JPG estáticas; elimina imagens em branco do Worker',()=>{
  const desc='1. **Dani Carvajal** · ZAG · **81 OVR**\n2. **Casemiro** · MEI · **81 OVR**\n3. **Richarlison** · ATA · **78 OVR**\n\n**11 cartas** · Página 2/2';
  const urls=gallery('🗂️ Sua coleção',desc);
  assert.equal(urls.length,3);
  assert.ok(urls[0].includes('/assets/cards/carvajal.jpg'));
  assert.ok(urls[1].includes('/assets/cards/casemiro.jpg'));
  assert.ok(urls[2].includes('/assets/cards/richarlison.jpg'));
  assert.ok(urls.every(url=>url.startsWith('https://raw.githubusercontent.com/')));
});

test('mercado, time e pacote exibem retratos dos jogadores reais cadastrados',()=>{
  const market=gallery('🛒 Mercado de transferências','**1.** **Erling Haaland** · ATA · **93 OVR**\n💰 **9.000 coins** · Código: \`123\`');
  assert.equal(market.length,1);
  assert.match(market[0],/\/assets\/cards\/haaland\.jpg/);
  const team=gallery('⚽ Sua equipe — 4-3-3','**1. GOL** · Alisson Becker (89 OVR)\n**2. ZAG** · Dani Carvajal (81 OVR)\n**Força total:** 84 OVR');
  assert.equal(team.length,2);
  assert.ok(team[0].includes('/assets/cards/alisson.jpg'));
  assert.ok(team[1].includes('/assets/cards/carvajal.jpg'));
  const pack=gallery('📦 Pacote aberto!','**Bento** · GOL · **76 OVR**\n**Bremer** · ZAG · **80 OVR**\n**Endrick** · ATA · **77 OVR**');
  assert.equal(pack.length,1);
  assert.ok(pack[0].includes('/assets/packs/bento_bremer_endrick.jpg'));
  const other=gallery('📦 Pacote aberto!','**Kylian Mbappé** · ATA · **94 OVR**\n**Pedri** · MEI · **88 OVR**');
  assert.equal(other.length,2);
  assert.ok(other[0].includes('/assets/cards/mbappe.jpg'));
});

test('até onze jogadores no time geram galerias válidas com no máximo 10 itens',()=>{
  const lines=PLAYERS.slice(0,11).map((p,i)=>'**'+(i+1)+'. '+p.pos+'** · '+p.name+' ('+p.ovr+' OVR)').join('\n');
  const comp=buildComponents('⚽ Sua equipe — 4-3-3',lines) as {type:number;items?:{media:{url:string}}[]}[];
  const cards=comp.filter(c=>c.type===12);
  assert.equal(cards.length,2);
  assert.equal(cards[0].items?.length,10);
  assert.equal(cards[1].items?.length,1);
});

test('menus, falhas e recompensas continuam em Components V2 sem embeds',()=>{
  for(const response of [card('✅ Comprado!','Recebeu o jogador'),message('❌ Falhou'),update('🏟️ FIM DE JOGO','1 × 2')]){
    const data=response.data as {embeds?:unknown;content?:unknown;components:{type:number}[];flags?:number};
    assert.equal(data.embeds,undefined);
    assert.equal(data.content,undefined);
    assert.equal(data.components.some(c=>c.type===12),true);
  }
  assert.equal((card('Teste','OK').data.flags&V2),V2);
  assert.equal(rows([button('Comprar','buy:123')]).length,1);
});

test('Worker mantém rotas legadas e não expõe keys desconhecidas',async()=>{
  const ctx={waitUntil() {}};
  const status=await worker.fetch(new Request('https://example.org/art/status'),{} as never,ctx);
  assert.equal(status.status,200);
  assert.equal((await status.json() as {version:string}).version,'3.0.0');
  const no=await worker.fetch(new Request('https://example.org/art/player.png?k=bad'),{} as never,ctx);
  assert.equal(no.status,404);
});
