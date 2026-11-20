import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPlayer } from '../src/catalog.ts';
import { account, start, ownedCards, lineup, lineupPlayers, daily, claim, openPack, listCard, buyCard, createChallenge, resolveChallenge, autoLineup, cancelListing } from '../src/storage.ts';
import type { Database, Statement } from '../src/types.ts';

class SqlDB implements Database {
  client = new DatabaseSync(':memory:');
  constructor() {
    this.client.exec('PRAGMA foreign_keys = ON');
    this.client.exec(readFileSync(join(import.meta.dirname, '../migrations/0001_init.sql'), 'utf8'));
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
