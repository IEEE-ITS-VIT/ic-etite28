-- Three websites (ic-ETITE'28, BOLT 3.0, TechNext '28) share this database and its users.
-- Roles on BOLT and TechNext are per site; ic-ETITE keeps using users.role.
CREATE TABLE IF NOT EXISTS site_roles (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site       TEXT NOT NULL CHECK (site IN ('bolt','technext')),
  role       TEXT NOT NULL CHECK (role IN ('participant','evaluator','admin')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, site)
);
-- Start with today's admins on both new sites and today's evaluators on BOLT.
INSERT OR IGNORE INTO site_roles (user_id, site, role, updated_at) SELECT id, 'bolt', role, datetime('now') FROM users WHERE role IN ('admin','evaluator');
INSERT OR IGNORE INTO site_roles (user_id, site, role, updated_at) SELECT id, 'technext', 'admin', datetime('now') FROM users WHERE role = 'admin';

-- Each site sends only its own queued emails.
ALTER TABLE email_outbox ADD COLUMN site TEXT NOT NULL DEFAULT 'icetite';
CREATE INDEX IF NOT EXISTS idx_outbox_site ON email_outbox(site, channel, status, priority, created_at);
