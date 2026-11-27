-- 0013_audit_logs.sql
-- Audit logs for admin activity: logins, setting changes, record updates, exports, navigation and clicks.

CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  site        TEXT NOT NULL,
  user_id     TEXT,
  user_email  TEXT,
  user_name   TEXT,
  action      TEXT NOT NULL,
  category    TEXT NOT NULL,
  details     TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  path        TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_site_created ON audit_logs(site, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_email, created_at DESC);
