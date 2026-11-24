-- +goose Up
CREATE TABLE recommendations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_at TIMESTAMPTZ,
  starred_at   TIMESTAMPTZ
);
CREATE INDEX ON recommendations (user_id, generated_at DESC);

-- +goose Down
DROP TABLE recommendations;
