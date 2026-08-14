CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT NOT NULL DEFAULT '21:00';
ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT NOT NULL DEFAULT '08:00';
ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_hours_skip_weekends BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS motivation_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS motivation_on_startup BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS motivation_interval_min INT NOT NULL DEFAULT 180;
ALTER TABLE users ADD COLUMN IF NOT EXISTS motivation_last_fired_date TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS motivation_last_fired_ts DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS notes (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Work',
  time TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_fired_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reminders_user_id_idx ON reminders(user_id);

-- Upgrade path from the old fixed-type (breathe/rest/stand) schema to a free-form,
-- user-managed list of breaks. Safe to run on every boot: a no-op once migrated.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'breaks' AND column_name = 'type') THEN
    ALTER TABLE breaks RENAME TO breaks_legacy;

    CREATE TABLE breaks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      interval_min INT NOT NULL,
      message TEXT NOT NULL,
      last_fired_ts DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    INSERT INTO breaks (user_id, label, enabled, interval_min, message, last_fired_ts)
      SELECT user_id, label, enabled, interval_min, message, last_fired_ts FROM breaks_legacy;

    DROP TABLE breaks_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  interval_min INT NOT NULL,
  message TEXT NOT NULL,
  last_fired_ts DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS breaks_user_id_idx ON breaks(user_id);
