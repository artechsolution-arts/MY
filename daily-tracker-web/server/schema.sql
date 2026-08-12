CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS breaks (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('breathe', 'rest', 'stand')),
  label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  interval_min INT NOT NULL,
  message TEXT NOT NULL,
  last_fired_ts DOUBLE PRECISION NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, type)
);
