import test from 'node:test';
import assert from 'node:assert/strict';
import {getPlayer} from '../src/catalog.ts';
import * as views from '../src/premium.ts';
test('coleção usa cartas reais em galeria de seis posições',()=>{
 const p=['vinicius','mbappe','bellingham','haaland','salah','rodri'].map(x=>getPlayer(x)!);
 const svg=views.collection(p,p.map(()=>null),'11','1/2');
 assert.match(svg,/SUA COLEÇÃO/);assert.match(svg,/1\/2/);
 for(const player of p)assert.match(svg,new RegExp(player.name));
 assert.equal((svg.match(/clipPath id="portraitcol\d+"/g)??[]).length,6);
});
test('mercado usa preços e códigos da entrada, não valores inventados',()=>{
 const svg=views.market([getPlayer('mbappe')!,getPlayer('vinicius')!],[null,null],[1500,3400],['abc123','xyz999']);
 assert.match(svg,/1\.500 COINS/);assert.match(svg,/3\.400 COINS/);
 assert.match(svg,/abc123/);assert.match(svg,/xyz999/);
 assert.doesNotMatch(svg,/4\.950\.000/);
});
test('arte de equipe, pacote e novo jogador usa OVR do catálogo',()=>{
 const p=getPlayer('haaland')!;
 assert.match(views.team([p,...Array(10).fill(null)],[null,...Array(10).fill(null)],'83'),/83 OVR/);
 assert.match(views.pack([p],[null]),/Erling Haaland/);
 assert.match(views.obtained(p,null),/93 OVR/);
});
