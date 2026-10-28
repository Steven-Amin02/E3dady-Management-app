-- Retired: this file previously mixed grants/schema with destructive reseeding.
-- For fresh installs AND upgrades, run migrations/20261028_security_and_reliability.sql.
DO $$ BEGIN RAISE EXCEPTION 'Retired setup script. Run 20261028_security_and_reliability.sql; see README.md.'; END $$;
