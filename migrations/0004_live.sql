CREATE TABLE IF NOT EXISTS live_rooms (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
 owner_name TEXT NOT NULL, key_hash TEXT NOT NULL, created_ms INTEGER NOT NULL,
 expires_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS live_rooms_expiry ON live_rooms(expires_ms);
CREATE TABLE IF NOT EXISTS live_clips (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, owner_name TEXT NOT NULL,
 title TEXT NOT NULL, url TEXT NOT NULL, created_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS live_clips_date ON live_clips(created_ms DESC);
CREATE INDEX IF NOT EXISTS live_clips_owner ON live_clips(owner_id,created_ms);
