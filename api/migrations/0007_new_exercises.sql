-- +goose Up
-- +goose StatementBegin

INSERT INTO exercises (name, muscle_group, kind, compendium_code, bodyweight_factor) VALUES
  ('Bulgarian split squat', 'Kaki', 'gym',        '02052', NULL),
  ('Bulgarian split squat', 'Kaki', 'bodyweight',  '02056', 0.85);

-- +goose StatementEnd

-- +goose Down
DELETE FROM exercises WHERE name = 'Bulgarian split squat' AND created_by IS NULL;
