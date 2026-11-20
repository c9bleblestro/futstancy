import { drawPlayer, getPlayer, type Player, type Position } from './catalog.ts';

export const SLOT_POSITION: Position[] = [
  'GOL', 'ZAG', 'ZAG', 'ZAG', 'ZAG', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA',
];
export const CLAIM_COOLDOWN_MS = 25 * 60 * 1000;
export const DAILY_COOLDOWN_MS = 20 * 60 * 60 * 1000;
export const PACK_COST = 900;

export function chooseTeam<T extends { id: string; player_key: string }>(cards: T[]): T[] | null {
  const used = new Set<string>();
  const team: T[] = [];
  for (const pos of SLOT_POSITION) {
    const candidate = cards
      .filter(card => !used.has(card.id) && getPlayer(card.player_key)?.pos === pos)
      .sort((a, b) => (getPlayer(b.player_key)?.ovr ?? 0) - (getPlayer(a.player_key)?.ovr ?? 0))[0];
    if (!candidate) return null;
    used.add(candidate.id);
    team.push(candidate);
  }
  return team;
}

export function teamStrength(players: Player[]): number {
  if (players.length !== SLOT_POSITION.length) return 0;
  return Math.round(players.reduce((sum, p) => sum + p.ovr, 0) / players.length);
}

export function simulateMatch(home: Player[], away: Player[], rand: () => number = Math.random): { home: number; away: number; homePower: number; awayPower: number } {
  if (home.length !== 11 || away.length !== 11) throw new Error('Escalação incompleta.');
  const homePower = teamStrength(home);
  const awayPower = teamStrength(away);
  const diff = Math.max(-25, Math.min(25, homePower - awayPower));
  let scoreHome = 0;
  let scoreAway = 0;
  const homeChance = Math.max(0.08, Math.min(0.58, 0.22 + diff * 0.009 + 0.02));
  const awayChance = Math.max(0.08, Math.min(0.58, 0.22 - diff * 0.009));
  for (let i = 0; i < 7; i++) {
    if (rand() < homeChance) scoreHome++;
    if (rand() < awayChance) scoreAway++;
  }
  return { home: scoreHome, away: scoreAway, homePower, awayPower };
}

export function drawPack(rand: () => number = Math.random): Player[] {
  return [drawPlayer(rand), drawPlayer(rand), drawPlayer(rand)];
}

export function timeRemaining(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min ${s % 60}s`;
}
