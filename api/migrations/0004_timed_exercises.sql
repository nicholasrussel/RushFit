-- +goose Up
-- +goose StatementBegin

-- Gerakan tahan (isometrik) dicatat dalam detik, bukan repetisi. Untuk gerakan
-- ini sets.reps berisi detik, dan set-nya tidak ikut dihitung ke volume maupun
-- kepadatan latihan.
ALTER TABLE exercises
  ADD COLUMN measure TEXT NOT NULL DEFAULT 'reps' CHECK (measure IN ('reps','seconds'));

INSERT INTO exercises (name, muscle_group, kind, compendium_code, bodyweight_factor, measure) VALUES
  ('Calf raise', 'Kaki', 'bodyweight', '02056', 1.00, 'reps'),
  ('Wall sit',   'Kaki', 'bodyweight', '02056', NULL, 'seconds');

-- +goose StatementEnd

-- +goose Down
DELETE FROM exercises WHERE kind = 'bodyweight' AND created_by IS NULL AND name IN ('Calf raise', 'Wall sit');
ALTER TABLE exercises DROP COLUMN measure;
