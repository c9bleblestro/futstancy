CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  coins INTEGER NOT NULL DEFAULT 1500 CHECK (coins >= 0),
  wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  last_claim_ms INTEGER,
  last_daily_ms INTEGER,
  purchase_nonce TEXT,
  init_nonce TEXT,
  claim_nonce TEXT,
  created_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(user_id),
  player_key TEXT NOT NULL,
  acquired_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cards_owner ON cards(owner_id, acquired_ms);

CREATE TABLE IF NOT EXISTS lineup (
  user_id TEXT NOT NULL REFERENCES users(user_id),
  slot INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 11),
  card_id TEXT NOT NULL UNIQUE REFERENCES cards(id),
  PRIMARY KEY (user_id, slot)
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  home_id TEXT NOT NULL REFERENCES users(user_id),
  away_id TEXT NOT NULL REFERENCES users(user_id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','complete','declined')),
  created_ms INTEGER NOT NULL,
  expires_ms INTEGER NOT NULL,
  score_home INTEGER,
  score_away INTEGER,
  resolved_ms INTEGER,
  resolution_nonce TEXT
);
CREATE INDEX IF NOT EXISTS idx_matches_pending ON matches(away_id, status, expires_ms);

CREATE TABLE IF NOT EXISTS market (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id),
  seller_id TEXT NOT NULL REFERENCES users(user_id),
  price INTEGER NOT NULL CHECK(price BETWEEN 100 AND 200000),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','sold','cancelled')),
  buyer_id TEXT,
  sale_nonce TEXT,
  created_ms INTEGER NOT NULL,
  sold_ms INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_active_card ON market(card_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_market_active ON market(status, created_ms);

CREATE TABLE IF NOT EXISTS bot_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
