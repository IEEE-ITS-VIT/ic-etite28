-- Migration 0015: Composite and High-Frequency Performance Indexes
-- Drastically accelerates read latency, foreign key joins, and filter queries across all portals.

-- Conference Registrations
CREATE INDEX IF NOT EXISTS idx_conf_user ON conference_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_conf_payment ON conference_registrations(payment_status, status);
CREATE INDEX IF NOT EXISTS idx_conf_created ON conference_registrations(created_at DESC);

-- TechNext Stall Bookings
CREATE INDEX IF NOT EXISTS idx_technext_payment ON technext_bookings(payment_status, status);
CREATE INDEX IF NOT EXISTS idx_technext_created ON technext_bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_technext_email ON technext_bookings(email);

-- Event & Hackathon Registrations (BOLT 3.0)
CREATE INDEX IF NOT EXISTS idx_registrations_event_user ON registrations(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_payment ON registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_registrations_date ON registrations(registered_at DESC);

-- Sessions & Authentication Lookup
CREATE INDEX IF NOT EXISTS idx_sessions_lookup ON sessions(id, expires_at);

-- Invoices & Reconciliations
CREATE INDEX IF NOT EXISTS idx_invoices_purpose_ref ON invoices(purpose, ref_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at DESC);

-- Events Directory
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
