import test from 'node:test';
import assert from 'node:assert/strict';
import { card, message, update, rows, button, V2, buildComponents, visualTheme, ERROR, GREEN } from '../src/ui.ts';

type Node={type:number;[key:string]:any};
function flatten(items:any[]):Node[]{
  return items.flatMap(x=>[x,...(Array.isArray(x.components)?flatten(x.components):[])]);
}

test('respostas utilizam painéis Discord V2 com identidade própria, sem embeds antigos',()=>{
  const variants=[card('Menu','Conteúdo'),message('OK'),update('Resultado','1 × 0')];
  for(const result of variants){
    const d=result.data as {content?:string;embeds?:object[];components?:Node[];flags?:number};
    assert.equal(d.content,undefined);
    assert.equal(d.embeds,undefined);
    assert.equal(d.components?.[0].type,17);
    const container=d.components?.[0];
    assert.equal(typeof container?.accent_color,'number');
    assert.ok(container?.components.some((c:Node)=>c.type===10));
  }
  assert.equal((variants[0].data.flags??0)&V2,V2);
  assert.equal((variants[1].data.flags??0)&V2,V2);
});

test('cartas reais e botões ficam dentro do mesmo painel V2',()=>{
  const view=card('🎁 Jogador contratado!','**Vinícius Júnior** · ATA · 92 OVR',0,false,
    rows([button('Ver coleção','col:123:0',1)]));
  const elements=flatten(view.data.components);
  const gallery=elements.find(x=>x.type===12);
  assert.ok(gallery);
  assert.equal(gallery.items.length,1);
  assert.match(gallery.items[0].media.url,/\/assets\/editions\/vinicius\/icone\.jpg/);
  assert.ok(elements.some(x=>x.type===1));
  assert.ok(elements.some(x=>x.type===2&&x.custom_id==='col:123:0'));
});

test('mercado, conquistas e erros recebem cores de contexto',()=>{
  assert.equal(visualTheme('🛒 Mercado de transferências').color,0x38bdf8);
  assert.equal(visualTheme('🗂️ Sua coleção').color,0x9167ff);
  assert.equal((card('Erro','Falha',ERROR).data.components[0] as any).accent_color,ERROR);
  assert.equal((card('Sucesso','OK',GREEN).data.components[0] as any).accent_color,GREEN);
});

test('painéis respeitam o limite de 10 filhos e 40 componentes',()=>{
  const many=rows(Array.from({length:25},(_,i)=>button('Filtro '+i,'filter:'+i)));
  const images=Array.from({length:11},(_,i)=>'https://example.com/card'+i+'.jpg');
  const components=buildComponents('🗂️ Sua coleção','Cartas',many,images);
  const container=components[0] as any;
  assert.equal(container.type,17);
  assert.ok(container.components.length<=10);
  assert.ok(flatten(components).length<=40);
  assert.equal(flatten(components).filter(x=>x.type===12).length,2);
  assert.equal(flatten(components).filter(x=>x.type===2).length,25);
});
