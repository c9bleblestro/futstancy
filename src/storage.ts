import { STARTER_KEYS, getPlayer, type Player } from './catalog.ts';
import { chooseTeam, SLOT_POSITION, CLAIM_COOLDOWN_MS, DAILY_COOLDOWN_MS, simulateMatch } from './game.ts';
import type { Account, CardRow, Database, LineupRow, ListingRow, MatchRow } from './types.ts';
import { PACKS, drawEditionPack, editionTier, type PackType } from './packs.ts';

const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 16);
const change = (r: { meta: { changes?: number } }) => (r.meta?.changes ?? 0) > 0;

export async function account(db: Database, userId: string): Promise<Account | null> {
  return db.prepare('SELECT * FROM users WHERE user_id=?').bind(userId).first<Account>();
}

export async function start(db: Database, userId: string): Promise<boolean> {
  const now = Date.now();
  const nonce = uid();
  const cards = STARTER_KEYS.map((key, idx) => ({ id: uid(), key, slot: idx + 1 }));
  // Um único batch: se falhar, SQLite desfaz todas as operações do clube.
  // O nonce garante que duas invocações simultâneas não criem dois elencos.
  const result = await db.batch([
    db.prepare('INSERT OR IGNORE INTO users(user_id,created_ms,init_nonce) VALUES(?,?,?)').bind(userId, now, nonce),
    ...cards.map(card => db.prepare(`INSERT INTO cards(id,owner_id,player_key,acquired_ms)
      SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE user_id=? AND init_nonce=?)`)
      .bind(card.id, userId, card.key, now, userId, nonce)),
    ...cards.map(card => db.prepare(`INSERT INTO lineup(user_id,slot,card_id)
      SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE user_id=? AND init_nonce=?)`)
      .bind(userId, card.slot, card.id, userId, nonce)),
  ]);
  return change(result[0]);
}

export async function ownedCards(db: Database, userId: string, limit = 200): Promise<CardRow[]> {
  return (await db.prepare('SELECT * FROM cards WHERE owner_id=? ORDER BY acquired_ms DESC, id DESC LIMIT ?').bind(userId, limit).all<CardRow>()).results;
}
export const ALBUM_PAGE_SIZE = 8;
export async function collectionPage(db: Database, userId: string, page: number, tier = 'todas'): Promise<{ cards: CardRow[]; total: number; pages: number; discovered: number }> {
  const where = tier === 'todas' ? 'owner_id=?' : 'owner_id=? AND tier=?';
  const filter = tier === 'todas' ? [userId] : [userId, tier];
  const totals = await db.prepare(
    'SELECT COUNT(*) AS n, COUNT(DISTINCT player_key) AS discovered FROM cards WHERE ' + where
  ).bind(...filter).first<{ n: number; discovered: number }>();
  const total = totals?.n ?? 0;
  const discovered = totals?.discovered ?? 0;
  const pages = Math.max(1, Math.ceil(total / ALBUM_PAGE_SIZE));
  const safe = Math.min(Math.max(0, Math.trunc(page)||0), pages - 1);
  const cards = (await db.prepare(
    'SELECT * FROM cards WHERE ' + where + ' ORDER BY acquired_ms DESC, id DESC LIMIT ? OFFSET ?'
  ).bind(...filter, ALBUM_PAGE_SIZE, safe * ALBUM_PAGE_SIZE).all<CardRow>()).results;
  return { cards, total, pages, discovered };
}

export async function claim(db: Database, userId: string, player: Player, edition = 'legado'): Promise<{ ok: boolean; left: number; cardId?: string }> {
  const now = Date.now();
  const cardId = uid();
  const nonce = uid();
  const result = await db.batch([
    db.prepare(`UPDATE users SET last_claim_ms=?,claim_nonce=? WHERE user_id=?
      AND (last_claim_ms IS NULL OR last_claim_ms <= ?)`)
      .bind(now, nonce, userId, now - CLAIM_COOLDOWN_MS),
    db.prepare(`INSERT INTO cards(id,owner_id,player_key,edition,tier,acquired_ms)
      SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE user_id=? AND claim_nonce=?)`)
      .bind(cardId, userId, player.key, edition, editionTier(edition), now, userId, nonce),
  ]);
  if (change(result[0])) return { ok: true, left: CLAIM_COOLDOWN_MS, cardId };
  const user = await account(db, userId);
  return { ok: false, left: Math.max(0, (user?.last_claim_ms ?? now) + CLAIM_COOLDOWN_MS - now) };
}

export async function daily(db: Database, userId: string): Promise<{ ok: boolean; coins: number; left: number }> {
  const now = Date.now();
  const row = await db.prepare('UPDATE users SET coins=coins+350,last_daily_ms=? WHERE user_id=? AND (last_daily_ms IS NULL OR last_daily_ms <= ?) RETURNING coins').bind(now, userId, now - DAILY_COOLDOWN_MS).first<{coins: number}>();
  if (row) return { ok: true, coins: row.coins, left: DAILY_COOLDOWN_MS };
  const user = await account(db, userId);
  return { ok: false, coins: user?.coins ?? 0, left: Math.max(0, (user?.last_daily_ms ?? now) + DAILY_COOLDOWN_MS - now) };
}

export async function openPack(db: Database, userId: string, type: PackType='misto'): Promise<{ ok:boolean; players:Player[]; cards:{id:string;player:Player;edition:string;tier:string}[]; cost:number; type:PackType }> {
  const definition = PACKS[type];
  if (!definition) return {ok:false,players:[],cards:[],cost:0,type};
  const drawn = drawEditionPack(type);
  const cards = drawn.map(d => ({id:uid(),player:d.player,edition:d.edition,tier:d.tier}));
  const nonce = uid();
  const now = Date.now();
  // No mesmo batch: debita apenas se houver saldo e só então cria os três exemplares.
  // Edition e tier ficam persistidos por ID, inclusive após a transferência no mercado.
  const result = await db.batch([
    db.prepare('UPDATE users SET coins=coins-?,purchase_nonce=? WHERE user_id=? AND coins>=?').bind(definition.cost, nonce, userId, definition.cost),
    ...cards.map(c => db.prepare('INSERT INTO cards(id,owner_id,player_key,edition,tier,acquired_ms) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE user_id=? AND purchase_nonce=?)')
      .bind(c.id,userId,c.player.key,c.edition,c.tier,now,userId,nonce)),
  ]);
  const ok=change(result[0]);
  return {ok,players:ok?cards.map(c=>c.player):[],cards:ok?cards:[],cost:definition.cost,type};
}

export async function lineup(db: Database, userId: string): Promise<LineupRow[]> {
  return (await db.prepare('SELECT l.slot,c.id,c.player_key,c.edition,c.tier FROM lineup l JOIN cards c ON c.id=l.card_id AND c.owner_id=l.user_id WHERE l.user_id=? ORDER BY l.slot').bind(userId).all<LineupRow>()).results;
}

export async function autoLineup(db: Database, userId: string): Promise<boolean> {
  const cards = (await db.prepare(`SELECT c.* FROM cards c WHERE c.owner_id=?
    AND NOT EXISTS(SELECT 1 FROM market m WHERE m.card_id=c.id AND m.status='active')
    ORDER BY c.acquired_ms DESC LIMIT 1000`).bind(userId).all<CardRow>()).results;
  const selected = chooseTeam(cards);
  if (!selected) return false;
  await db.batch([
    db.prepare('DELETE FROM lineup WHERE user_id=?').bind(userId),
    ...selected.map((card, index) => db.prepare('INSERT INTO lineup(user_id,slot,card_id) VALUES (?,?,?)').bind(userId, index + 1, card.id)),
  ]);
  return true;
}

export async function setSlot(db: Database, userId: string, cardId: string, slot: number): Promise<string> {
  if (!Number.isInteger(slot) || slot < 1 || slot > 11) return 'A vaga deve ser de 1 a 11.';
  const card = await db.prepare("SELECT c.* FROM cards c WHERE c.owner_id=? AND c.id=? AND NOT EXISTS(SELECT 1 FROM market m WHERE m.card_id=c.id AND m.status='active')")
    .bind(userId, cardId).first<CardRow>();
  if (!card) return 'Carta não encontrada na coleção ou anunciada no mercado.';
  const player = getPlayer(card.player_key);
  if (player?.pos !== SLOT_POSITION[slot - 1])
    return 'Essa vaga é para **'+SLOT_POSITION[slot-1]+'**; '+(player?.name??'o jogador')+' é '+(player?.pos??'desconhecido')+'.';
  const [from,occupied]=await Promise.all([
    db.prepare('SELECT slot FROM lineup WHERE user_id=? AND card_id=?').bind(userId,cardId).first<{slot:number}>(),
    db.prepare('SELECT c.id,c.player_key FROM lineup l JOIN cards c ON c.id=l.card_id WHERE l.user_id=? AND l.slot=?')
      .bind(userId,slot).first<{id:string;player_key:string}>(),
  ]);
  if(from?.slot===slot)return '✅ '+player.name+' já está nessa vaga.';
  const changes=[
    db.prepare('DELETE FROM lineup WHERE user_id=? AND (slot=? OR card_id=?)').bind(userId,slot,cardId),
    db.prepare('INSERT INTO lineup(user_id,slot,card_id) VALUES(?,?,?)').bind(userId,slot,cardId),
  ];
  // Quando dois titulares da mesma categoria trocam de slot, ambos permanecem escalados.
  if(from&&occupied&&occupied.id!==cardId &&
    getPlayer(occupied.player_key)?.pos===SLOT_POSITION[from.slot-1]){
    changes.push(db.prepare('INSERT INTO lineup(user_id,slot,card_id) VALUES(?,?,?)')
      .bind(userId,from.slot,occupied.id));
  }
  await db.batch(changes);
  return '✅ '+player.name+' escalado na vaga '+slot+'!';
}

export function lineupPlayers(rows: LineupRow[]): Player[] | null {
  if (rows.length !== 11) return null;
  const sorted = [...rows].sort((a, b) => a.slot - b.slot);
  if (sorted.some((row, index) => row.slot !== index + 1)) return null;
  const players = sorted.map(row => getPlayer(row.player_key));
  if (players.some((p, index) => !p || p.pos !== SLOT_POSITION[index])) return null;
  return players as Player[];
}

export async function createChallenge(db: Database, home: string, away: string): Promise<MatchRow> {
  const now = Date.now();
  const id = uid();
  await db.prepare('INSERT INTO matches(id,home_id,away_id,created_ms,expires_ms) VALUES(?,?,?,?,?)').bind(id, home, away, now, now + 15 * 60 * 1000).run();
  return { id, home_id: home, away_id: away, status: 'pending', created_ms: now, expires_ms: now + 15 * 60 * 1000, score_home: null, score_away: null };
}

export async function resolveChallenge(db: Database, id: string, actor: string, accept: boolean): Promise<{ state: string; match?: MatchRow; powerHome?: number; powerAway?: number }> {
  const match = await db.prepare('SELECT * FROM matches WHERE id=?').bind(id).first<MatchRow>();
  if (!match) return { state: 'não encontrado' };
  if (actor !== match.away_id) return { state: 'só quem foi desafiado pode responder' };
  if (match.status !== 'pending' || match.expires_ms <= Date.now()) return { state: 'desafio encerrado ou expirado' };
  if (!accept) {
    const r = await db.prepare("UPDATE matches SET status='declined',resolved_ms=? WHERE id=? AND status='pending' AND expires_ms>?").bind(Date.now(), id, Date.now()).run();
    return { state: change(r) ? 'recusado' : 'desafio encerrado ou expirado' };
  }
  const [homeLine, awayLine] = await Promise.all([lineup(db, match.home_id), lineup(db, match.away_id)]);
  const home = lineupPlayers(homeLine);
  const away = lineupPlayers(awayLine);
  if (!home || !away) return { state: 'alguém está sem escalação completa' };
  const result = simulateMatch(home, away);
  const nonce = uid();
  const now = Date.now();
  const homeWin = result.home > result.away;
  const awayWin = result.away > result.home;
  const statsHome = homeWin ? 'wins' : awayWin ? 'losses' : 'draws';
  const statsAway = awayWin ? 'wins' : homeWin ? 'losses' : 'draws';
  const output = await db.batch([
    db.prepare("UPDATE matches SET status='complete',score_home=?,score_away=?,resolved_ms=?,resolution_nonce=? WHERE id=? AND status='pending' AND expires_ms>?").bind(result.home, result.away, now, nonce, id, now),
    db.prepare(`UPDATE users SET ${statsHome}=${statsHome}+1,goals_for=goals_for+?,goals_against=goals_against+?,coins=coins+? WHERE user_id=? AND EXISTS(SELECT 1 FROM matches WHERE id=? AND resolution_nonce=?)`).bind(result.home, result.away, homeWin ? 180 : awayWin ? 40 : 80, match.home_id, id, nonce),
    db.prepare(`UPDATE users SET ${statsAway}=${statsAway}+1,goals_for=goals_for+?,goals_against=goals_against+?,coins=coins+? WHERE user_id=? AND EXISTS(SELECT 1 FROM matches WHERE id=? AND resolution_nonce=?)`).bind(result.away, result.home, awayWin ? 180 : homeWin ? 40 : 80, match.away_id, id, nonce),
  ]);
  return change(output[0]) ? { state: 'concluído', match: { ...match, score_home: result.home, score_away: result.away }, powerHome: result.homePower, powerAway: result.awayPower } : { state: 'desafio encerrado ou expirado' };
}

export async function listCard(db: Database, userId: string, cardId: string, price: number): Promise<{ ok: boolean; id?: string }> {
  if (!Number.isInteger(price) || price < 100 || price > 200000) return { ok: false };
  const id = uid();
  const created = await db.prepare(`INSERT OR IGNORE INTO market(id,card_id,seller_id,price,created_ms)
    SELECT ?,c.id,?, ?,? FROM cards c
    WHERE c.id=? AND c.owner_id=?
      AND NOT EXISTS(SELECT 1 FROM lineup l WHERE l.card_id=c.id)
      AND NOT EXISTS(SELECT 1 FROM market m WHERE m.card_id=c.id AND m.status='active')`)
    .bind(id, userId, price, Date.now(), cardId, userId).run();
  return change(created) ? { ok: true, id } : { ok: false };
}

export async function marketPage(db: Database, tier = 'todas'): Promise<ListingRow[]> {
  const where = tier === 'todas' ? '' : ' AND c.tier=?';
  const stmt = db.prepare("SELECT m.*, c.player_key,c.edition,c.tier FROM market m JOIN cards c ON c.id=m.card_id AND c.owner_id=m.seller_id WHERE m.status='active'" + where + ' ORDER BY m.created_ms DESC LIMIT 8');
  return (await (tier==='todas'?stmt:stmt.bind(tier)).all<ListingRow>()).results;
}

export async function buyCard(db: Database, buyerId: string, listingId: string): Promise<{ ok: boolean; player?: Player; price?: number; edition?: string; tier?: string }> {
  const listing = await db.prepare('SELECT m.*,c.player_key,c.edition,c.tier FROM market m JOIN cards c ON c.id=m.card_id WHERE m.id=?').bind(listingId).first<ListingRow>();
  if (!listing || listing.seller_id === buyerId || listing.status !== 'active') return { ok: false };
  const nonce = uid();
  const now = Date.now();
  const r = await db.batch([
    db.prepare(`UPDATE market SET status='sold',buyer_id=?,sale_nonce=?,sold_ms=? WHERE id=? AND status='active' AND seller_id<>?
      AND EXISTS(SELECT 1 FROM users WHERE user_id=? AND coins>=market.price)
      AND EXISTS(SELECT 1 FROM cards WHERE id=market.card_id AND owner_id=market.seller_id)
      AND NOT EXISTS(SELECT 1 FROM lineup WHERE card_id=market.card_id)`)
      .bind(buyerId, nonce, now, listingId, buyerId, buyerId),
    db.prepare(`UPDATE users SET coins=coins-(SELECT price FROM market WHERE id=?) WHERE user_id=?
      AND EXISTS(SELECT 1 FROM market WHERE id=? AND buyer_id=? AND sale_nonce=?)`).bind(listingId, buyerId, listingId, buyerId, nonce),
    db.prepare(`UPDATE users SET coins=coins+(SELECT CAST(price*0.95 AS INTEGER) FROM market WHERE id=?) WHERE user_id=?
      AND EXISTS(SELECT 1 FROM market WHERE id=? AND buyer_id=? AND sale_nonce=?)`).bind(listingId, listing.seller_id, listingId, buyerId, nonce),
    db.prepare(`UPDATE cards SET owner_id=? WHERE id=? AND owner_id=?
      AND EXISTS(SELECT 1 FROM market WHERE id=? AND buyer_id=? AND sale_nonce=?)`).bind(buyerId, listing.card_id, listing.seller_id, listingId, buyerId, nonce),
  ]);
  return change(r[0]) ? { ok: true, player: getPlayer(listing.player_key), price: listing.price, edition:listing.edition, tier:listing.tier } : { ok: false };
}

export async function cancelListing(db: Database, sellerId: string, listingId: string): Promise<boolean> {
  const r = await db.prepare("UPDATE market SET status='cancelled' WHERE id=? AND seller_id=? AND status='active'").bind(listingId, sellerId).run();
  return change(r);
}

export async function leaderboard(db: Database): Promise<Account[]> {
  return (await db.prepare('SELECT * FROM users ORDER BY (wins*3+draws) DESC, wins DESC, goals_for DESC LIMIT 10').all<Account>()).results;
}
