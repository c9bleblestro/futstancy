import test from 'node:test';
import assert from 'node:assert/strict';
import {buildComponents,systemBanner} from '../src/ui.ts';

function items(nodes:any[]):any[]{
  return nodes.flatMap(n=>[n,...(Array.isArray(n.components)?items(n.components):[])]);
}
const systems=[
  ['🪪 Perfil do treinador','perfil'],
  ['🛒 Mercado de transferências','mercado'],
  ['📦 Central de pacotes','pacotes'],
  ['⚽ Seu time titular','time'],
  ['⚔️ Convite para partida','partida'],
  ['🏟️ Resultado da partida','partida'],
  ['🏆 Ranking de clubes','ranking'],
  ['💰 Recompensa resgatada','daily'],
  ['🎉 Bem-vindo ao seu clube','inicio'],
  ['⚽ FUTSTANCY — Guia do treinador','inicio'],
] as const;
test('dez contextos do jogo usam oito capas de arte distintas e CDN segura',()=>{
  for(const [title,key] of systems){
    const url=systemBanner(title);
    assert.match(url??'',new RegExp('/assets/ui/v57/'+key+'\\.jpg\\?v='));
    const nodes=items(buildComponents(title,'Coins reais: 1234'));
    const galleries=nodes.filter(x=>x.type===12);
    assert.equal(galleries.length,1);
    assert.match(galleries[0].items[0].media.url,new RegExp('/'+key+'\\.jpg'));
    assert.ok(nodes.filter(x=>x.type===10).some(x=>x.content.includes('Coins reais: 1234')));
    const direct=(buildComponents(title,'dados reais')[0] as any).components;
    assert.ok(direct.length<=10,title);
  }
});
test('as artes individuais das cartas e o álbum nunca recebem banners de sistema',()=>{
  for(const title of ['📚 Álbum Futstancy','🎨 Galeria de artes — Cartas','🃏 Ficha da carta',
    '🎁 Nova contratação!','📦 Ouro aberto!']){
    assert.equal(systemBanner(title),null,title);
  }
  const url='https://raw.githubusercontent.com/c9bleblestro/futstancy/main/assets/editions/endrick/comum.jpg';
  const nodes=items(buildComponents('🃏 Ficha da carta','Endrick · 77 OVR',[],[url]));
  const gallery=nodes.filter(x=>x.type===12);
  assert.equal(gallery.length,1);
  assert.equal(gallery[0].items.length,1);
  assert.equal(gallery[0].items[0].media.url,url);
});
test('mercado com oito imagens e quatro fileiras de ações permanece sob limite do Discord',()=>{
  const images=Array.from({length:8},(_,i)=>'https://example.org/player'+i+'.jpg');
  const buttons=Array.from({length:4},(_,i)=>({type:1,components:[{
    type:2,style:2,custom_id:'buy:'+i,label:'Comprar '+i,
  }]}));
  const panel=buildComponents('🛒 Mercado de transferências','Ofertas reais',buttons,images)[0] as any;
  assert.ok(panel.components.length<=10);
  const galleries=items([panel]).filter(n=>n.type===12);
  assert.equal(galleries.length,2);
  assert.equal(galleries[1].items.length,8);
});
