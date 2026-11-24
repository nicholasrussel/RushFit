-- +goose Up
-- +goose StatementBegin

-- ========== AKSES ==========
CREATE TABLE allowed_emails (
  email      TEXT PRIMARY KEY CHECK (email = lower(email)),
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT NOT NULL UNIQUE REFERENCES allowed_emails(email) ON UPDATE CASCADE,
  name           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at  TIMESTAMPTZ
);

-- +goose StatementEnd

-- +goose Down
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS allowed_emails;
