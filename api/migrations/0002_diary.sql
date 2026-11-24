-- +goose Up
-- +goose StatementBegin

-- ========== PROFIL ==========
-- Dipisah dari users supaya users tetap identik dengan StocksAnalytics.
CREATE TABLE profiles (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  weight_kg   NUMERIC(5,2) CHECK (weight_kg > 0 AND weight_kg < 500),
  unit        TEXT NOT NULL DEFAULT 'metric' CHECK (unit IN ('metric','imperial')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== MET (2024 Adult Compendium of Physical Activities) ==========
-- Hanya baris yang dipakai. Sumber: https://pacompendium.com
-- activity terisi untuk cardio; min_speed_kmh adalah batas bawah kecepatan
-- baris itu (fungsi tangga: dipakai baris dengan batas bawah tertinggi yang
-- masih <= kecepatan sesi).
CREATE TABLE met_values (
  id                  SERIAL PRIMARY KEY,
  compendium_code     TEXT NOT NULL,
  compendium_version  TEXT NOT NULL DEFAULT '2024',
  description         TEXT NOT NULL,
  activity            TEXT CHECK (activity IN ('run','walk','cycle','swim')),
  min_speed_kmh       NUMERIC(6,3),
  met                 NUMERIC(4,1) NOT NULL CHECK (met > 0),
  UNIQUE (compendium_code, compendium_version)
);

INSERT INTO met_values (compendium_code, description, activity, min_speed_kmh, met)
SELECT code, description, activity, round(min_mph * 1.609344, 3), met
FROM (VALUES
  -- Lari
  ('12026', 'Jogging 2.6 to 3.7 mph',                 'run',  0.0,  3.3),
  ('12028', 'Running, 4 to 4.2 mph (13 min/mile)',    'run',  4.0,  6.5),
  ('12029', 'Running 4.3 to 4.8 mph',                 'run',  4.3,  7.8),
  ('12030', 'Running, 5.0 to 5.2 mph (12 min/mile)',  'run',  5.0,  8.5),
  ('12045', 'Running, 5.5 -5.8 mph',                  'run',  5.5,  9.0),
  ('12050', 'Running, 6-6.3 mph (10 min/mile)',       'run',  6.0,  9.3),
  ('12060', 'Running, 6.7 mph (9 min/mile)',          'run',  6.7, 10.5),
  ('12070', 'Running, 7 mph (8.5 min/mile)',          'run',  7.0, 11.0),
  ('12080', 'Running, 7.5 mph (8 min/mile)',          'run',  7.5, 11.8),
  ('12090', 'Running, 8 mph (7.5 min/mile)',          'run',  8.0, 12.0),
  ('12100', 'Running, 8.6 mph (7 min/mile)',          'run',  8.6, 12.5),
  ('12110', 'Running, 9 mph (6.5 min/mile)',          'run',  9.0, 13.0),
  ('12115', 'Running, 9.3 to 9.6 mph',                'run',  9.3, 14.8),
  ('12120', 'Running, 10 mph (6 min/mile)',           'run', 10.0, 14.8),
  ('12130', 'Running, 11 mph (5.5 min/mile)',         'run', 11.0, 16.8),
  ('12132', 'Running, 12 mph (5.0 min/mile)',         'run', 12.0, 18.5),
  ('12134', 'Running, 13 mph (4.6 min/mile)',         'run', 13.0, 19.8),
  ('12135', 'Running, 14 mph (4.3 min/mile)',         'run', 14.0, 23.0),
  -- Jalan kaki
  ('17151', 'Walking, less than 2.0 mph, level, strolling, very slow',                 'walk', 0.0, 2.3),
  ('17152', 'Walking, 2.0 to 2.4 mph, level, slow pace, firm surface',                 'walk', 2.0, 2.8),
  ('17170', 'Walking, 2.5 mph, firm, level surface',                                   'walk', 2.5, 3.0),
  ('17190', 'Walking, 2.8 to 3.4 mph, level, moderate pace, firm surface',             'walk', 2.8, 3.8),
  ('17200', 'Walking, 3.5 to 3.9 mph, level, brisk, firm surface, walking for exercise','walk', 3.5, 4.8),
  ('17220', 'Walking, 4.0 to 4.4 mph, level, firm surface, very brisk pace',           'walk', 4.0, 5.5),
  ('17230', 'Walking, 4.5 to 4.9 mph, level, firm surface, very, very brisk',          'walk', 4.5, 7.0),
  ('17231', 'Walking, 5.0 to 5.5 mph, level, firm surface',                            'walk', 5.0, 8.5),
  -- Bersepeda
  ('01010', 'Bicycling, <10 mph, leisure, to work or for pleasure',                    'cycle',  0.0,  4.0),
  ('01020', 'Bicycling, 10-11.9 mph, leisure, slow, light effort',                     'cycle', 10.0,  6.8),
  ('01030', 'Bicycling, 12-13.9 mph, leisure, moderate effort',                        'cycle', 12.0,  8.0),
  ('01040', 'Bicycling, 14-15.9 mph, racing or leisure, fast, vigorous effort',        'cycle', 14.0, 10.0),
  ('01050', 'Bicycling, 16-19 mph, racing/not drafting or >19 mph drafting, very fast','cycle', 16.0, 12.0),
  ('01060', 'Bicycling, >20 mph, racing, not drafting',                                'cycle', 20.0, 16.8),
  -- Renang (satu nilai; tidak dibedakan menurut kecepatan)
  ('18240', 'Swimming laps, freestyle, slow, recreational',                            'swim',  0.0,  5.8)
) AS v(code, description, activity, min_mph, met);

INSERT INTO met_values (compendium_code, description, met) VALUES
  ('02052', 'Resistance (weight) training, squats, deadlift, slow or explosive effort', 5.0),
  ('02054', 'Resistance (weight) training, multiple exercises, 8-15 reps at varied resistance', 3.5),
  ('02056', 'Body weight resistance exercises (e.g., squat, lunge, push-up, crunch), general', 3.0),
  ('02057', 'Body weight resistance exercises (e.g., squat, lunge, push-up, crunch), high intensity', 6.5);

-- ========== GERAKAN ==========
CREATE TABLE exercises (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  muscle_group       TEXT NOT NULL,
  kind               TEXT NOT NULL CHECK (kind IN ('gym','bodyweight')),
  compendium_code    TEXT NOT NULL,
  bodyweight_factor  NUMERIC(3,2),
  created_by         UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = gerakan bawaan
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX exercises_builtin_name ON exercises (kind, lower(name)) WHERE created_by IS NULL;
CREATE UNIQUE INDEX exercises_user_name ON exercises (created_by, kind, lower(name)) WHERE created_by IS NOT NULL;

INSERT INTO exercises (name, muscle_group, kind, compendium_code) VALUES
  ('Bench press',          'Dada',     'gym', '02054'),
  ('Incline bench press',  'Dada',     'gym', '02054'),
  ('Dumbbell press',       'Dada',     'gym', '02054'),
  ('Chest fly',            'Dada',     'gym', '02054'),
  ('Deadlift',             'Punggung', 'gym', '02052'),
  ('Barbell row',          'Punggung', 'gym', '02054'),
  ('Lat pulldown',         'Punggung', 'gym', '02054'),
  ('Seated cable row',     'Punggung', 'gym', '02054'),
  ('Overhead press',       'Bahu',     'gym', '02054'),
  ('Lateral raise',        'Bahu',     'gym', '02054'),
  ('Face pull',            'Bahu',     'gym', '02054'),
  ('Squat',                'Kaki',     'gym', '02052'),
  ('Leg press',            'Kaki',     'gym', '02054'),
  ('Romanian deadlift',    'Kaki',     'gym', '02052'),
  ('Leg extension',        'Kaki',     'gym', '02054'),
  ('Leg curl',             'Kaki',     'gym', '02054'),
  ('Calf raise',           'Kaki',     'gym', '02054'),
  ('Bicep curl',           'Lengan',   'gym', '02054'),
  ('Hammer curl',          'Lengan',   'gym', '02054'),
  ('Tricep pushdown',      'Lengan',   'gym', '02054'),
  ('Skull crusher',        'Lengan',   'gym', '02054'),
  ('Cable crunch',         'Perut',    'gym', '02054');

-- ========== SESI ==========
CREATE TABLE workouts (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind                      TEXT NOT NULL CHECK (kind IN ('cardio','gym','bodyweight')),
  mode                      TEXT NOT NULL DEFAULT 'diary' CHECK (mode IN ('diary','live')),
  started_at                TIMESTAMPTZ NOT NULL,
  duration_sec              INTEGER CHECK (duration_sec > 0),
  notes                     TEXT NOT NULL DEFAULT '',
  body_weight_snapshot_kg   NUMERIC(5,2),
  met_used                  NUMERIC(5,2),
  compendium_version        TEXT,
  calories_est              NUMERIC(7,1), -- NULL bila durasi atau berat badan tidak diketahui
  source                    TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','health_connect','strava')),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX workouts_user_started ON workouts (user_id, started_at DESC);

CREATE TABLE cardio_entries (
  workout_id        UUID PRIMARY KEY REFERENCES workouts(id) ON DELETE CASCADE,
  activity          TEXT NOT NULL CHECK (activity IN ('run','walk','cycle','swim')),
  distance_m        INTEGER NOT NULL CHECK (distance_m > 0),
  pace_sec_per_km   INTEGER NOT NULL CHECK (pace_sec_per_km > 0)
);

CREATE TABLE workout_exercises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id    UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id   UUID NOT NULL REFERENCES exercises(id),
  position      INTEGER NOT NULL,
  calories_est  NUMERIC(7,1),
  UNIQUE (workout_id, position)
);
CREATE INDEX workout_exercises_exercise ON workout_exercises (exercise_id);

CREATE TABLE sets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id  UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  position             INTEGER NOT NULL,
  weight_kg            NUMERIC(6,2) NOT NULL CHECK (weight_kg >= 0),
  reps                 INTEGER NOT NULL CHECK (reps > 0),
  extra_weight_kg      NUMERIC(6,2),
  UNIQUE (workout_exercise_id, position)
);

-- +goose StatementEnd

-- +goose Down
DROP TABLE IF EXISTS sets;
DROP TABLE IF EXISTS workout_exercises;
DROP TABLE IF EXISTS cardio_entries;
DROP TABLE IF EXISTS workouts;
DROP TABLE IF EXISTS exercises;
DROP TABLE IF EXISTS met_values;
DROP TABLE IF EXISTS profiles;
