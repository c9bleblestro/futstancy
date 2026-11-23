import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlayer, PLAYERS, STARTER_KEYS, drawPlayer, rarity } from '../src/catalog.ts';
import { chooseTeam, simulateMatch, SLOT_POSITION, teamStrength, timeRemaining, PACK_COST } from '../src/game.ts';
import { COMMANDS, COMMAND_ROOT } from '../src/commands.ts';
import { rows, button } from '../src/ui.ts';

test('catálogo contém jogadores de todas as posições sem IDs repetidos', () => {
  assert.equal(new Set(PLAYERS.map(x => x.key)).size, PLAYERS.length);
  assert.equal(STARTER_KEYS.length, 11);
  assert.deepEqual(STARTER_KEYS.map(k => getPlayer(k)?.pos), SLOT_POSITION);
  for (const pos of SLOT_POSITION) assert.ok(PLAYERS.some(p => p.pos === pos));
});

test('sorteio contempla todas as faixas e gera jogador válido', () => {
  for (const roll of [0, 0.03, 0.14, 0.15, 0.44, 0.45, 0.99]) {
    const p = drawPlayer(() => roll);
    assert.ok(PLAYERS.some(x => x.key === p.key));
    assert.ok(rarity(p.ovr).length > 0);
  }
});

test('autoescalação escolhe o melhor de cada posição, respeitando 4-3-3', () => {
  const cards = PLAYERS.map((p, id) => ({ id: String(id), player_key: p.key }));
  const team = chooseTeam(cards);
  assert.ok(team);
  assert.equal(team!.length, 11);
  assert.deepEqual(team!.map(c => getPlayer(c.player_key)?.pos), SLOT_POSITION);
  assert.equal(new Set(team!.map(c => c.id)).size, 11);
  assert.equal(chooseTeam([{ id: '1', player_key: 'haaland' }]), null);
});

test('simulador respeita score não negativo e jogadores fortes têm vantagem', () => {
  const best = chooseTeam(PLAYERS.map((p, id) => ({ id: String(id), player_key: p.key })))!.map(c => getPlayer(c.player_key)!);
  const starter = STARTER_KEYS.map(k => getPlayer(k)!);
  assert.ok(teamStrength(best) >= teamStrength(starter));
  const r = simulateMatch(best, starter, () => 0.25);
  assert.ok(r.home >= 0 && r.away >= 0);
  assert.ok(r.homePower >= r.awayPower);
  assert.throws(() => simulateMatch([], starter));
});

test('comandos cobrem gameplay e usam subcomandos válidos', () => {
  const commands = COMMANDS[0].options.map(x => x.name);
  assert.equal(new Set(commands).size, commands.length);
  for (const name of ['iniciar', 'obter', 'colecao', 'time', 'auto', 'escalar', 'desafiar', 'mercado', 'vender', 'comprar', 'daily', 'ranking', 'pacote']) assert.ok(commands.includes(name));
  assert.equal(PACK_COST, 900);
  assert.equal(timeRemaining(61_000), '1min 1s');
});

test('botões são distribuídos em linhas de 5', () => {
  const out = rows(Array.from({ length: 8 }, (_, i) => button(`Item ${i}`, `item:${i}`))) as { components: unknown[] }[];
  assert.deepEqual(out.map(r => r.components.length), [5, 3]);
});


test('o prefixo principal dos comandos Discord é S (/s)', () => {
  assert.equal(COMMAND_ROOT, 's');
  assert.equal(COMMANDS.length, 1);
  assert.equal(COMMANDS[0].name, 's');
  assert.ok(COMMANDS[0].options.length >= 17);
});
