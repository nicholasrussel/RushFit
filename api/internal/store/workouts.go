package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

var ErrNotFound = errors.New("not found")

// ---------- Profil ----------

type Profile struct {
	WeightKg *float64 `json:"weight_kg"`
	Unit     string   `json:"unit"`
}

func (db *DB) GetProfile(ctx context.Context, userID string) (*Profile, error) {
	p := Profile{Unit: "metric"}
	err := db.QueryRow(ctx,
		`SELECT weight_kg::float8, unit FROM profiles WHERE user_id = $1`, userID,
	).Scan(&p.WeightKg, &p.Unit)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	return &p, nil
}

func (db *DB) SetProfileWeight(ctx context.Context, userID string, weightKg float64) (*Profile, error) {
	var p Profile
	err := db.QueryRow(ctx, `
		INSERT INTO profiles (user_id, weight_kg) VALUES ($1, $2)
		ON CONFLICT (user_id) DO UPDATE SET weight_kg = $2, updated_at = now()
		RETURNING weight_kg::float8, unit
	`, userID, weightKg).Scan(&p.WeightKg, &p.Unit)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (db *DB) SetProfileUnit(ctx context.Context, userID, unit string) (*Profile, error) {
	var p Profile
	err := db.QueryRow(ctx, `
		INSERT INTO profiles (user_id, unit) VALUES ($1, $2)
		ON CONFLICT (user_id) DO UPDATE SET unit = $2, updated_at = now()
		RETURNING weight_kg::float8, unit
	`, userID, unit).Scan(&p.WeightKg, &p.Unit)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// ---------- MET dan gerakan ----------

type CardioMET struct {
	Code        string
	MinSpeedKmh float64
	MET         float64
}

func (db *DB) CardioMETRows(ctx context.Context, activity, version string) ([]CardioMET, error) {
	rows, err := db.Query(ctx, `
		SELECT compendium_code, COALESCE(min_speed_kmh, 0)::float8, met::float8
		FROM met_values
		WHERE activity = $1 AND compendium_version = $2
	`, activity, version)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (CardioMET, error) {
		var m CardioMET
		err := r.Scan(&m.Code, &m.MinSpeedKmh, &m.MET)
		return m, err
	})
}

type Exercise struct {
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	MuscleGroup      string   `json:"muscle_group"`
	Kind             string   `json:"kind"`
	BodyweightFactor *float64 `json:"bodyweight_factor"`
	Measure          string   `json:"measure"` // "reps" atau "seconds"
	LastWeightKg     *float64 `json:"last_weight_kg"`
	LastReps         *int     `json:"last_reps"`
	LastExtraKg      *float64 `json:"last_extra_kg"`
	LastSets         *int     `json:"last_sets"`
}

// ListExercises mengembalikan gerakan bawaan dan milik pengguna, beserta set
// pertama dari sesi terakhir pengguna untuk gerakan itu ("Terakhir: 60 kg × 10").
func (db *DB) ListExercises(ctx context.Context, userID, kind string) ([]Exercise, error) {
	rows, err := db.Query(ctx, `
		SELECT e.id, e.name, e.muscle_group, e.kind, e.bodyweight_factor::float8, e.measure,
		       l.weight_kg::float8, l.reps, l.extra_weight_kg::float8, l.n
		FROM exercises e
		LEFT JOIN LATERAL (
			SELECT we.id
			FROM workout_exercises we
			JOIN workouts w ON w.id = we.workout_id
			WHERE we.exercise_id = e.id AND w.user_id = $1
			ORDER BY w.started_at DESC, w.created_at DESC, we.position
			LIMIT 1
		) lw ON true
		LEFT JOIN LATERAL (
			SELECT s.weight_kg, s.reps, s.extra_weight_kg,
			       (SELECT count(*)::int FROM sets WHERE workout_exercise_id = lw.id) AS n
			FROM sets s
			WHERE s.workout_exercise_id = lw.id
			ORDER BY s.position
			LIMIT 1
		) l ON true
		WHERE e.kind = $2 AND (e.created_by IS NULL OR e.created_by = $1)
		ORDER BY e.muscle_group, e.name
	`, userID, kind)
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (Exercise, error) {
		var e Exercise
		err := r.Scan(&e.ID, &e.Name, &e.MuscleGroup, &e.Kind, &e.BodyweightFactor, &e.Measure,
			&e.LastWeightKg, &e.LastReps, &e.LastExtraKg, &e.LastSets)
		return e, err
	})
	if list == nil {
		list = []Exercise{}
	}
	return list, err
}

type ExerciseMET struct {
	Name   string
	MET    float64
	Factor *float64 // bagian berat badan yang terangkat; hanya untuk bodyweight
	Timed  bool     // dicatat dalam detik (isometrik), bukan repetisi
}

// ExerciseMETs memetakan id gerakan (yang boleh dipakai pengguna ini, jenis
// tertentu) ke MET kode Compendium-nya. Id yang tidak dikenal tidak muncul.
func (db *DB) ExerciseMETs(ctx context.Context, userID, kind, version string, ids []string) (map[string]ExerciseMET, error) {
	rows, err := db.Query(ctx, `
		SELECT e.id::text, e.name, m.met::float8, e.bodyweight_factor::float8, e.measure = 'seconds'
		FROM exercises e
		JOIN met_values m ON m.compendium_code = e.compendium_code AND m.compendium_version = $3
		WHERE e.id::text = ANY($4) AND e.kind = $2
		  AND (e.created_by IS NULL OR e.created_by = $1)
	`, userID, kind, version, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]ExerciseMET{}
	for rows.Next() {
		var id string
		var m ExerciseMET
		if err := rows.Scan(&id, &m.Name, &m.MET, &m.Factor, &m.Timed); err != nil {
			return nil, err
		}
		out[id] = m
	}
	return out, rows.Err()
}

// ---------- Sesi ----------

type NewSet struct {
	WeightKg float64 // beban; untuk bodyweight ini beban efektif
	Reps     int
	ExtraKg  *float64 // beban tambahan; hanya untuk bodyweight
}

type NewWorkoutExercise struct {
	ExerciseID string
	Calories   *float64
	Sets       []NewSet
}

type NewCardio struct {
	Activity     string
	DistanceM    int
	PaceSecPerKm int
}

type NewWorkout struct {
	UserID            string
	Kind              string
	StartedAt         time.Time
	DurationSec       *int
	Notes             string
	BodyWeightKg      *float64
	MET               *float64
	CompendiumVersion *string
	Calories          *float64
	Cardio            *NewCardio
	Exercises         []NewWorkoutExercise
}

func (db *DB) CreateWorkout(ctx context.Context, w NewWorkout) (string, error) {
	tx, err := db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	var id string
	err = tx.QueryRow(ctx, `
		INSERT INTO workouts (user_id, kind, mode, started_at, duration_sec, notes,
		                      body_weight_snapshot_kg, met_used, compendium_version, calories_est)
		VALUES ($1, $2, 'diary', $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`, w.UserID, w.Kind, w.StartedAt, w.DurationSec, w.Notes,
		w.BodyWeightKg, w.MET, w.CompendiumVersion, w.Calories).Scan(&id)
	if err != nil {
		return "", err
	}

	if err := insertChildren(ctx, tx, id, w); err != nil {
		return "", err
	}
	return id, tx.Commit(ctx)
}

// insertChildren menulis baris cardio atau gerakan dan set milik satu sesi.
func insertChildren(ctx context.Context, tx pgx.Tx, id string, w NewWorkout) error {
	if w.Cardio != nil {
		_, err := tx.Exec(ctx, `
			INSERT INTO cardio_entries (workout_id, activity, distance_m, pace_sec_per_km)
			VALUES ($1, $2, $3, $4)
		`, id, w.Cardio.Activity, w.Cardio.DistanceM, w.Cardio.PaceSecPerKm)
		if err != nil {
			return err
		}
	}
	for i, ex := range w.Exercises {
		var weID string
		err := tx.QueryRow(ctx, `
			INSERT INTO workout_exercises (workout_id, exercise_id, position, calories_est)
			VALUES ($1, $2, $3, $4) RETURNING id
		`, id, ex.ExerciseID, i+1, ex.Calories).Scan(&weID)
		if err != nil {
			return err
		}
		for j, s := range ex.Sets {
			_, err = tx.Exec(ctx, `
				INSERT INTO sets (workout_exercise_id, position, weight_kg, reps, extra_weight_kg)
				VALUES ($1, $2, $3, $4, $5)
			`, weID, j+1, s.WeightKg, s.Reps, s.ExtraKg)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

// UpdateWorkout mengganti isi sesi (id sudah dipastikan milik pengguna).
func (db *DB) UpdateWorkout(ctx context.Context, id string, w NewWorkout) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE workouts
		SET started_at = $3, duration_sec = $4, notes = $5, body_weight_snapshot_kg = $6,
		    met_used = $7, compendium_version = $8, calories_est = $9
		WHERE id = $1 AND user_id = $2
	`, id, w.UserID, w.StartedAt, w.DurationSec, w.Notes,
		w.BodyWeightKg, w.MET, w.CompendiumVersion, w.Calories)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	if _, err := tx.Exec(ctx, `DELETE FROM cardio_entries WHERE workout_id = $1`, id); err != nil {
		return err
	}
	// Set ikut terhapus lewat ON DELETE CASCADE.
	if _, err := tx.Exec(ctx, `DELETE FROM workout_exercises WHERE workout_id = $1`, id); err != nil {
		return err
	}
	if err := insertChildren(ctx, tx, id, w); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (db *DB) DeleteWorkout(ctx context.Context, userID, id string) error {
	tag, err := db.Exec(ctx, `DELETE FROM workouts WHERE id::text = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// WorkoutSummary adalah satu baris riwayat.
type WorkoutSummary struct {
	ID            string         `json:"id"`
	Kind          string         `json:"kind"`
	StartedAt     time.Time      `json:"started_at"`
	DurationSec   *int           `json:"duration_sec"`
	Calories      *float64       `json:"calories"`
	Cardio        *WorkoutCardio `json:"cardio"`
	ExerciseNames []string       `json:"exercise_names"`
	SetCount      int            `json:"set_count"`
	VolumeKg      float64        `json:"volume_kg"`
}

// ListWorkouts mengembalikan sesi pengguna, terbaru dulu. kind kosong = semua.
func (db *DB) ListWorkouts(ctx context.Context, userID, kind string, limit int) ([]WorkoutSummary, error) {
	rows, err := db.Query(ctx, `
		SELECT w.id, w.kind, w.started_at, w.duration_sec, w.calories_est::float8,
		       c.activity, c.distance_m, c.pace_sec_per_km,
		       COALESCE(x.names, ARRAY[]::text[]), COALESCE(x.set_count, 0)::int, COALESCE(x.volume, 0)::float8
		FROM workouts w
		LEFT JOIN cardio_entries c ON c.workout_id = w.id
		LEFT JOIN LATERAL (
			SELECT array_agg(e.name ORDER BY we.position) AS names,
			       sum(sc.n) AS set_count, sum(sc.volume) AS volume
			FROM workout_exercises we
			JOIN exercises e ON e.id = we.exercise_id
			JOIN LATERAL (
				SELECT count(*) AS n, COALESCE(sum(weight_kg * reps), 0) AS volume
				FROM sets WHERE workout_exercise_id = we.id
			) sc ON true
			WHERE we.workout_id = w.id
		) x ON true
		WHERE w.user_id = $1 AND ($2 = '' OR w.kind = $2)
		ORDER BY w.started_at DESC, w.created_at DESC
		LIMIT $3
	`, userID, kind, limit)
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (WorkoutSummary, error) {
		var s WorkoutSummary
		var activity *string
		var distanceM, pace *int
		err := r.Scan(&s.ID, &s.Kind, &s.StartedAt, &s.DurationSec, &s.Calories,
			&activity, &distanceM, &pace, &s.ExerciseNames, &s.SetCount, &s.VolumeKg)
		if activity != nil && distanceM != nil && pace != nil {
			s.Cardio = &WorkoutCardio{Activity: *activity, DistanceM: *distanceM, PaceSecPerKm: *pace}
		}
		return s, err
	})
	if list == nil {
		list = []WorkoutSummary{}
	}
	return list, err
}

type WorkoutSet struct {
	WeightKg float64  `json:"weight_kg"`
	Reps     int      `json:"reps"`
	ExtraKg  *float64 `json:"extra_weight_kg"`
}

type WorkoutExercise struct {
	ExerciseID string       `json:"exercise_id"`
	Name       string       `json:"name"`
	Measure    string       `json:"measure"`
	Calories   *float64     `json:"calories"`
	VolumeKg   float64      `json:"volume_kg"`
	Sets       []WorkoutSet `json:"sets"`
}

type WorkoutCardio struct {
	Activity     string `json:"activity"`
	DistanceM    int    `json:"distance_m"`
	PaceSecPerKm int    `json:"pace_sec_per_km"`
}

type Workout struct {
	ID                string            `json:"id"`
	Kind              string            `json:"kind"`
	Mode              string            `json:"mode"`
	StartedAt         time.Time         `json:"started_at"`
	DurationSec       *int              `json:"duration_sec"`
	Notes             string            `json:"notes"`
	BodyWeightKg      *float64          `json:"body_weight_kg"`
	MET               *float64          `json:"met"`
	CompendiumVersion *string           `json:"compendium_version"`
	Calories          *float64          `json:"calories"`
	VolumeKg          float64           `json:"volume_kg"`
	Cardio            *WorkoutCardio    `json:"cardio"`
	Exercises         []WorkoutExercise `json:"exercises"`
}

func (db *DB) GetWorkout(ctx context.Context, userID, id string) (*Workout, error) {
	w := Workout{Exercises: []WorkoutExercise{}}
	var activity *string
	var distanceM, pace *int
	err := db.QueryRow(ctx, `
		SELECT w.id, w.kind, w.mode, w.started_at, w.duration_sec, w.notes,
		       w.body_weight_snapshot_kg::float8, w.met_used::float8, w.compendium_version,
		       w.calories_est::float8, c.activity, c.distance_m, c.pace_sec_per_km
		FROM workouts w
		LEFT JOIN cardio_entries c ON c.workout_id = w.id
		WHERE w.id::text = $1 AND w.user_id = $2
	`, id, userID).Scan(&w.ID, &w.Kind, &w.Mode, &w.StartedAt, &w.DurationSec, &w.Notes,
		&w.BodyWeightKg, &w.MET, &w.CompendiumVersion, &w.Calories, &activity, &distanceM, &pace)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if activity != nil && distanceM != nil && pace != nil {
		w.Cardio = &WorkoutCardio{Activity: *activity, DistanceM: *distanceM, PaceSecPerKm: *pace}
	}

	rows, err := db.Query(ctx, `
		SELECT we.id, we.exercise_id, e.name, e.measure, we.calories_est::float8, s.weight_kg::float8, s.reps, s.extra_weight_kg::float8
		FROM workout_exercises we
		JOIN exercises e ON e.id = we.exercise_id
		JOIN sets s ON s.workout_exercise_id = we.id
		WHERE we.workout_id = $1
		ORDER BY we.position, s.position
	`, w.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	lastWE := ""
	for rows.Next() {
		var weID string
		var ex WorkoutExercise
		var s WorkoutSet
		if err := rows.Scan(&weID, &ex.ExerciseID, &ex.Name, &ex.Measure, &ex.Calories, &s.WeightKg, &s.Reps, &s.ExtraKg); err != nil {
			return nil, err
		}
		if weID != lastWE {
			w.Exercises = append(w.Exercises, ex)
			lastWE = weID
		}
		cur := &w.Exercises[len(w.Exercises)-1]
		cur.Sets = append(cur.Sets, s)
		v := s.WeightKg * float64(s.Reps)
		cur.VolumeKg += v
		w.VolumeKg += v
	}
	return &w, rows.Err()
}

// METByCode mengembalikan nilai MET satu kode Compendium.
func (db *DB) METByCode(ctx context.Context, code, version string) (float64, error) {
	var met float64
	err := db.QueryRow(ctx,
		`SELECT met::float8 FROM met_values WHERE compendium_code = $1 AND compendium_version = $2`,
		code, version,
	).Scan(&met)
	return met, err
}

// ---------- Gerakan kustom (FR-6) ----------

// ExerciseDetail dipakai di halaman manajemen gerakan; memuat kode Compendium
// dan apakah gerakan itu bawaan atau milik pengguna.
type ExerciseDetail struct {
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	MuscleGroup      string   `json:"muscle_group"`
	Kind             string   `json:"kind"`
	CompendiumCode   string   `json:"compendium_code"`
	BodyweightFactor *float64 `json:"bodyweight_factor"`
	Measure          string   `json:"measure"`
	IsBuiltin        bool     `json:"is_builtin"`
}

// ListAllExercises mengembalikan semua gerakan (bawaan + milik pengguna), semua jenis.
func (db *DB) ListAllExercises(ctx context.Context, userID string) ([]ExerciseDetail, error) {
	rows, err := db.Query(ctx, `
		SELECT id::text, name, muscle_group, kind, compendium_code,
		       bodyweight_factor::float8, measure, (created_by IS NULL)
		FROM exercises
		WHERE created_by IS NULL OR created_by = $1
		ORDER BY kind, muscle_group, name
	`, userID)
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (ExerciseDetail, error) {
		var e ExerciseDetail
		return e, r.Scan(&e.ID, &e.Name, &e.MuscleGroup, &e.Kind, &e.CompendiumCode,
			&e.BodyweightFactor, &e.Measure, &e.IsBuiltin)
	})
	if list == nil {
		list = []ExerciseDetail{}
	}
	return list, err
}

// CreateExercise membuat gerakan kustom milik pengguna.
func (db *DB) CreateExercise(ctx context.Context, userID, name, muscleGroup, kind, code string, factor *float64) (ExerciseDetail, error) {
	var e ExerciseDetail
	err := db.QueryRow(ctx, `
		INSERT INTO exercises (name, muscle_group, kind, compendium_code, bodyweight_factor, created_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id::text, name, muscle_group, kind, compendium_code,
		          bodyweight_factor::float8, measure, false
	`, name, muscleGroup, kind, code, factor, userID).
		Scan(&e.ID, &e.Name, &e.MuscleGroup, &e.Kind, &e.CompendiumCode,
			&e.BodyweightFactor, &e.Measure, &e.IsBuiltin)
	return e, err
}

// DeleteExercise menghapus gerakan kustom milik pengguna; mengembalikan ErrNotFound
// bila tidak ada atau bukan milik pengguna.
func (db *DB) DeleteExercise(ctx context.Context, userID, id string) error {
	tag, err := db.Exec(ctx,
		`DELETE FROM exercises WHERE id = $1 AND created_by = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
