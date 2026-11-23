-- ───────────────────────── Visa Invitation Letters ─────────────────────────
-- Stores user input and verification status for conference visa facilitation letters.
-- The PDF is generated dynamically on demand from this data and admin template (never stored).

CREATE TABLE IF NOT EXISTS visa_requests (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registration_id   TEXT NOT NULL REFERENCES conference_registrations(id) ON DELETE CASCADE,
  passport_name     TEXT NOT NULL,
  passport_number   TEXT NOT NULL,
  passport_expiry   TEXT NOT NULL,
  date_of_birth     TEXT NOT NULL,
  nationality       TEXT NOT NULL,
  country_of_birth  TEXT,
  gender            TEXT,
  affiliation       TEXT NOT NULL,
  designation       TEXT,
  address           TEXT,
  city              TEXT,
  country           TEXT NOT NULL,
  embassy_details   TEXT,
  paper_id          TEXT,
  paper_title       TEXT,
  arrival_date      TEXT,
  departure_date    TEXT,
  additional_notes  TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes       TEXT,
  approved_at       TEXT,
  approved_by       TEXT REFERENCES users(id),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_visa_requests_user ON visa_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_visa_requests_status ON visa_requests(status);
