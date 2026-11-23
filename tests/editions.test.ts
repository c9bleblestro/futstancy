import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlayer } from '../src/catalog.ts';
import { EDITIONS, SHOWCASE, playerArtUrl, galleryPages, galleryUrls } from '../src/editions.ts';
import { buildComponents } from '../src/ui.ts';

test('todos os lotes foram indexados, sem perder variantes',()=>{
  const entries=Object.values(EDITIONS).flat();
  assert.equal(entries.length,75);
  assert.equal(SHOWCASE.length,61);
  assert.equal(entries.filter(e=>e.quality==='full').length,53);
  assert.equal(entries.filter(e=>e.quality==='cropped_preview').length,22);
  assert.equal(new Set(entries.map(e=>e.file)).size,75);
});

test('cada jogador com carta completa usa imagem real sem recortes de montagem',()=>{
  for(const key of ['bento','bremer','endrick','vinicius','mbappe','casemiro','saka']){
    const p=getPlayer(key)!;
    const url=playerArtUrl(p);
    assert.match(url,/^https:\/\/raw\.githubusercontent\.com\/c9bleblestro\/futstancy\/main\/assets\/editions\//);
    assert.ok(!url.includes('eclipse_previa')&&!url.includes('premium_lote3'));
  }
});

test('jogador sem arte individual não carrega moldura velha com fotografia recortada',()=>{
  const p=getPlayer('unai')!;
  assert.equal(playerArtUrl(p),'');
});

test('galeria de artes pagina as imagens sem mostrar dados fictícios como reais',()=>{
  assert.equal(galleryPages('cards'),9);
  assert.equal(galleryPages('designs'),11);
  assert.equal(galleryUrls('cards',0).length,6);
  assert.equal(galleryUrls('cards',8).length,5);
  assert.ok(Array.from({length:9},(_,i)=>galleryUrls('cards',i)).flat().every(url=>!url.includes('/assets/cards/')&&!url.includes('_previa')&&!url.includes('premium_lote3')));
  assert.equal(galleryUrls('designs',10).length,1);
  const comps=buildComponents('🎨 Galeria de artes — Designs 1/11','Prévia ilustrativa');
  const panel=comps.find((x:any)=>x.type===17) as any;
  const gallery=panel.components.find((x:any)=>x.type===12) as any;
  assert.equal(gallery.items.length,6);
});
