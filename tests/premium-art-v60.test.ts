import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMarketBannerSvg} from '../src/market-art-v60.ts';
import {buildPremiumProfileSvg} from '../src/profile-art-v60.ts';
import {systemBanner} from '../src/ui.ts';
import {start,lineup,account} from '../src/storage.ts';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {Database,Statement,Account} from '../src/types.ts';

class TestDB implements Database{
  client=new DatabaseSync(':memory:');
  constructor(){
    this.client.exec('PRAGMA foreign_keys=ON');
    this.client.exec(readFileSync(join(import.meta.dirname,'../migrations/0001_init.sql'),'utf8'));
    this.client.exec(readFileSync(join(import.meta.dirname,'../migrations/0002_card_editions.sql'),'utf8'));
  }
  prepare(sql:string):Statement{
    const q=this.client.prepare(sql);
    let params:(string|number|null)[]=[];
    return {
      bind(...p){params=p;return this;},
      async first<T>(){return (q.get(...params)??null) as T|null;},
      async all<T>(){return {results:q.all(...params) as T[]};},
      async run(){const r=q.run(...params);return {meta:{changes:Number(r.changes)}};},
    };
  }
  async batch(items:Statement[]){
    this.client.exec('BEGIN IMMEDIATE');
    try{const out=[];for(const i of items)out.push(await i.run());this.client.exec('COMMIT');return out;}
    catch(e){this.client.exec('ROLLBACK');throw e;}
  }
}
test('nova capa do Mercado mantém identidade premium sem preços inventados',()=>{
  const svg=buildMarketBannerSvg();
  assert.match(svg,/FUTSTANCY  \/  MERCADO/);
  assert.match(svg,/NEGOCIE\. REFORCE\. CONQUISTE\./);
  assert.match(svg,/#f9cb66|#e4b954/);
  assert.match(svg,/width="1520" height="400"/);
  assert.doesNotMatch(svg,/450\.000|620\.000|1\.350\.000|button|onclick|@everyone/);
  assert.match(systemBanner('🛒 Mercado de transferências')??'',/\/art\/market-banner\.png\?rev=v593/);
});
test('perfil cinematográfico contém somente estatísticas dinâmicas e mini carta aprovada',async()=>{
  const db=new TestDB();const owner='123456789012345678';
  await start(db,owner);
  const me=(await account(db,owner))!;
  const rows=await lineup(db,owner);
  const originalArt='data:image/jpeg;base64,ABCDEF';
  const art=buildPremiumProfileSvg(
    {...me,coins:2345,wins:9,draws:2,losses:1,goals_for:31,goals_against:11} as Account,
    rows,{name:'Clube Real',avatarUrl:null},
    {star:originalArt,featuredPlayerKey:'casemiro'},
  );
  assert.match(art,/Clube Real/);
  assert.match(art,/2\.345/);
  assert.match(art,/MELHOR TITULAR/);
  assert.match(art,/PERFIL DO TREINADOR/);
  assert.match(art,/SALDO DA CARTEIRA/);
  assert.match(art,/DESEMPENHO/);
  assert.match(art,/OVR MÉDIO/);
  assert.match(art,/TITULARES/);
  assert.match(art,/CARTA INDISPONÍVEL|MELHOR TITULAR/);
  assert.match(art,/Casemiro/);
  assert.match(art,/preserveAspectRatio="xMidYMid meet"/);
  assert.match(art,/width="1024" height="1250"/);
  assert.match(art,/#37fce4|#4ff7e0|#55f7d7/);
  assert.match(art,/data:image\/jpeg;base64,ABCDEF/);
  assert.doesNotMatch(art,/onClick|<button|onclick=|assets\/cards\/|1\.542\.000/);
  assert.ok(!art.includes('400 COINS'));
  db.client.close();
});
