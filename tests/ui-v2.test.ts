import test from 'node:test';
import assert from 'node:assert/strict';
import { card, message, update, rows, button, V2 } from '../src/ui.ts';

test('todas as respostas usam Components V2, sem embed e sem barra lateral',()=>{
  const variants=[card('Menu','Conteúdo'),message('OK'),update('Resultado','1 × 0')];
  for(const result of variants){
    const d=result.data as {content?:string;embeds?:object[];components?:object[];flags?:number};
    assert.equal(d.content,undefined);
    assert.equal(d.embeds,undefined);
    assert.ok(Array.isArray(d.components));
  }
  assert.equal((variants[0].data.flags??0)&V2,V2);
  assert.equal((variants[1].data.flags??0)&V2,V2);
});
test('cartas e menus de mercado exibem cartas JPG pré-geradas com botões funcionais',()=>{
  const view=card('🎁 Jogador contratado!','**Vinícius Júnior** · ATA · 92 OVR',0,false,
    rows([button('Ver coleção','col:123:0',1)]));
  const components=view.data.components as {type:number;items?:{media:{url:string}}[];components?:object[]}[];
  const gallery=components.find(c=>c.type===12);
  assert.ok(gallery);
  assert.equal(gallery?.items?.length,1);
  assert.match(gallery!.items![0].media.url,/\/assets\/cards\/vinicius\.jpg\?v=fut-premium-20261121-v6$/);
  assert.ok(components.some(c=>c.type===1));
});
