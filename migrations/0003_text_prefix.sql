-- Prefixo S: evita processar duas vezes o mesmo evento MESSAGE_CREATE.
CREATE TABLE IF NOT EXISTS prefix_messages (
  message_id TEXT PRIMARY KEY,
  created_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prefix_messages_created ON prefix_messages(created_ms);
