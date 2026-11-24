-- +goose Up
-- +goose StatementBegin

-- Gerakan bodyweight bawaan. bodyweight_factor = bagian berat badan yang ikut
-- terangkat (beban efektif = berat badan × faktor + beban tambahan).
-- Faktor push up (0,64), knee push up (0,49), dan decline push up (0,74)
-- mengikuti Ebben dkk. 2011 (J Strength Cond Res 25(10)); sisanya perkiraan
-- awal RushFit yang boleh disetel.
INSERT INTO exercises (name, muscle_group, kind, compendium_code, bodyweight_factor) VALUES
  ('Push up',          'Dada',     'bodyweight', '02056', 0.64),
  ('Knee push up',     'Dada',     'bodyweight', '02056', 0.49),
  ('Decline push up',  'Dada',     'bodyweight', '02056', 0.74),
  ('Dip',              'Dada',     'bodyweight', '02056', 1.00),
  ('Pull up',          'Punggung', 'bodyweight', '02056', 1.00),
  ('Chin up',          'Punggung', 'bodyweight', '02056', 1.00),
  ('Inverted row',     'Punggung', 'bodyweight', '02056', 0.60),
  ('Squat',            'Kaki',     'bodyweight', '02056', 0.85),
  ('Lunge',            'Kaki',     'bodyweight', '02056', 0.85),
  ('Sit up',           'Perut',    'bodyweight', '02056', 0.50),
  ('Crunch',           'Perut',    'bodyweight', '02056', 0.30),
  ('Leg raise',        'Perut',    'bodyweight', '02056', 0.35),
  ('Burpee',           'Seluruh tubuh', 'bodyweight', '02056', 1.00);

-- +goose StatementEnd

-- +goose Down
DELETE FROM exercises WHERE kind = 'bodyweight' AND created_by IS NULL;
