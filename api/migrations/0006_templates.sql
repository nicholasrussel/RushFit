-- +goose Up
CREATE TABLE templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL CHECK (char_length(trim(name)) > 0),
  kind         TEXT        NOT NULL CHECK (kind IN ('gym','bodyweight')),
  exercises    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON templates (user_id, COALESCE(last_used_at, created_at) DESC);

-- +goose Down
DROP TABLE templates;
