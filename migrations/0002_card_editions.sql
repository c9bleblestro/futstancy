-- V5: cada exemplar retém sua edição e raridade original, inclusive após a venda.
-- Cartas antigas permanecem intactas, marcadas "legado" sem inventar raridades.
ALTER TABLE cards ADD COLUMN edition TEXT NOT NULL DEFAULT 'legado';
ALTER TABLE cards ADD COLUMN tier TEXT NOT NULL DEFAULT 'legado';
CREATE INDEX IF NOT EXISTS idx_cards_owner_tier ON cards(owner_id, tier, acquired_ms);
