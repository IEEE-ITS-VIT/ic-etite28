-- Migration 0016: Add identity proof, institutional roll/emp ID, and branch/department to conference registrations
ALTER TABLE conference_registrations ADD COLUMN identity_proof_type TEXT;
ALTER TABLE conference_registrations ADD COLUMN identity_proof_number TEXT;
ALTER TABLE conference_registrations ADD COLUMN institution_id_number TEXT;
ALTER TABLE conference_registrations ADD COLUMN department TEXT;
