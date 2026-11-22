/** Interfaces mínimas do D1 para não depender de SDK no runtime. */
export interface Statement {
  bind(...args: (string | number | null)[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes?: number } }>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<{ meta: { changes?: number } }[]>;
}
export interface Env {
  DB: Database;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID?: string;
  DISCORD_BOT_TOKEN?: string;
  PREFIX_GATEWAY_SECRET?: string;
}
export interface Option {
  name: string;
  type: number;
  value?: string | number;
  options?: Option[];
}
export interface Interaction {
  type: number;
  id: string;
  application_id?: string;
  guild_id?: string;
  member?: { user?: { id: string; username: string } };
  user?: { id: string; username: string };
  data?: { name?: string; options?: Option[]; custom_id?: string };
}
export interface Account {
  user_id: string;
  coins: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  last_claim_ms: number | null;
  last_daily_ms: number | null;
}
export interface CardRow { id: string; owner_id: string; player_key: string; acquired_ms: number; edition: string; tier: string; }
export interface LineupRow { slot: number; id: string; player_key: string; edition: string; tier: string; }
export interface MatchRow { id: string; home_id: string; away_id: string; status: string; created_ms: number; expires_ms: number; score_home: number | null; score_away: number | null; }
export interface ListingRow { id: string; card_id: string; seller_id: string; price: number; status: string; player_key: string; edition: string; tier: string; }
