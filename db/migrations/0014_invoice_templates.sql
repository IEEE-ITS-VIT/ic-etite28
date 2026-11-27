-- ───────────────────────── Invoice Templates ─────────────────────────
-- Stores uploaded template file (PDF stationery or image) and visual layout coordinates for drag-and-drop fields.

CREATE TABLE IF NOT EXISTS invoice_templates (
  id           TEXT PRIMARY KEY,
  file_b64     TEXT,
  preview_b64  TEXT,
  mime         TEXT NOT NULL DEFAULT 'application/pdf',
  width        INTEGER NOT NULL DEFAULT 595,
  height       INTEGER NOT NULL DEFAULT 842,
  layout       TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
