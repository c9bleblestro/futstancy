import test from 'node:test';
import assert from 'node:assert/strict';
import { EDITIONS } from '../src/editions.ts';
import { PACKS, PACK_TYPES, PACK_ODDS, GALLERY_TIERS, ALL_ARTS, PLAYABLE_ARTS, editionArtUrl, editionTier, drawEdition, drawEditionPack, galleryArtFiles, tierCount } from '../src/packs.ts';

test('75 artes preservadas no índice, mas só 53 completas são exibidas na galeria e nos pacotes',()=>{
  assert.equal(ALL_ARTS.length,75);
  assert.equal(Object.values(EDITIONS).flat().length,75);
  assert.equal(GALLERY_TIERS.reduce((n,t)=>n+galleryArtFiles(t).length,0),53);
  assert.equal(galleryArtFiles('todas').length,53);
  assert.equal(galleryArtFiles('premium').length,0);
  assert.ok(galleryArtFiles('todas').every(file=>!file.includes('previa')&&!file.includes('premium_lote3')&&!file.startsWith('assets/cards/')));
  assert.equal(PLAYABLE_ARTS.length,53);
  assert.ok(PLAYABLE_ARTS.every(a=>a.tier!=='premium'));
  assert.equal(tierCount('premium').full,0);
  assert.equal(tierCount('premium').previews,9);
  assert.equal(editionTier('comum_lote5_alt'),'comum');
  assert.equal(editionTier('icone_alternativa'),'icone');
  assert.equal(editionTier('eclipse_individual'),'eclipse');
});
test('cada pacote por raridade entrega somente o respectivo tipo de arte',()=>{
  for(const type of PACK_TYPES){
    if(type==='misto')continue;
    assert.ok(tierCount(type).full>0);
    const cards=drawEditionPack(type,()=>0.36);
    assert.equal(cards.length,3);
    for(const c of cards){
      assert.equal(c.tier,type);
      assert.ok(editionArtUrl(c.player.key,c.edition).includes(c.file));
      assert.ok(!c.file.includes('previa')&&!c.file.includes('premium_lote3'));
    }
  }
});
test('probabilidades do Misto fecham 100% e alcançam raridades extremas',()=>{
  assert.equal(PACK_ODDS.reduce((n,c)=>n+c.percent,0),100);
  assert.equal(drawEdition('misto',()=>0).tier,'comum');
  assert.equal(drawEdition('misto',()=>0.999).tier,'eclipse');
  assert.equal(PACKS.misto.cost,900);
});
