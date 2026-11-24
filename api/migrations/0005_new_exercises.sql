-- +goose Up
-- +goose StatementBegin

INSERT INTO exercises (name, muscle_group, kind, compendium_code) VALUES
  ('Dumbbell rear delt row', 'Bahu', 'gym', '02054');

-- +goose StatementEnd

-- +goose Down
DELETE FROM exercises WHERE name = 'Dumbbell rear delt row' AND created_by IS NULL;
