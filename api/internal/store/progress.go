package store

import (
	"context"
	"math"
	"time"
)

// ProgressPoint adalah estimasi 1RM dan volume untuk satu sesi latihan.
type ProgressPoint struct {
	Date      string  `json:"date"`       // "2026-10-01"
	StartedAt string  `json:"started_at"` // ISO-8601
	Orm1Est   float64 `json:"orm1_est"`   // kg, dibulatkan 1 desimal
	VolumeKg  float64 `json:"volume_kg"`  // kg, dibulatkan 1 desimal
}

// Projection adalah proyeksi 1RM dari regresi linear; nil bila data kurang.
type Projection struct {
	Orm1Kg  float64 `json:"orm1_kg"`
	InWeeks int     `json:"in_weeks"`
}

// ProgressResult adalah respons lengkap untuk satu gerakan.
type ProgressResult struct {
	ExerciseID   string          `json:"exercise_id"`
	ExerciseName string          `json:"exercise_name"`
	Kind         string          `json:"kind"`
	Points       []ProgressPoint `json:"points"`
	CurrentOrm1  *float64        `json:"current_orm1,omitempty"`
	WeekVolumeKg *float64        `json:"week_volume_kg,omitempty"`
	Projection   *Projection     `json:"projection,omitempty"`
}

// orm1Epley menghitung estimasi 1RM dengan rumus Epley.
func orm1Epley(weightKg, extraKg, bodyWeightKg, factor, reps float64, isGym bool) float64 {
	var w float64
	if isGym {
		w = weightKg
	} else {
		w = bodyWeightKg*factor + extraKg
	}
	if w <= 0 || reps <= 0 {
		return 0
	}
	return w * (1 + reps/30)
}

func round1(v float64) float64 {
	return math.Round(v*10) / 10
}

// GetProgress mengembalikan data progres per gerakan untuk rentang waktu tertentu.
// rangeDays: 0 = semua data.
func (db *DB) GetProgress(ctx context.Context, userID, exerciseID string, rangeDays int) (*ProgressResult, error) {
	// Cek gerakan ada dan milik user (atau bawaan)
	var exName, exKind string
	var bodyweightFactor *float64
	err := db.QueryRow(ctx,
		`SELECT name, kind, bodyweight_factor FROM exercises
		 WHERE id = $1::uuid AND (created_by::text = $2 OR created_by IS NULL)`,
		exerciseID, userID,
	).Scan(&exName, &exKind, &bodyweightFactor)
	if err != nil {
		return nil, ErrNotFound
	}

	var since *time.Time
	if rangeDays > 0 {
		t := time.Now().AddDate(0, 0, -rangeDays)
		since = &t
	}

	// Kueri semua set gerakan ini per sesi
	rows, err := db.Query(ctx, `
		SELECT
			w.started_at,
			s.weight_kg::float8,
			COALESCE(s.extra_weight_kg, 0)::float8,
			s.reps,
			COALESCE(w.body_weight_snapshot_kg, 0)::float8
		FROM workouts w
		JOIN workout_exercises we ON we.workout_id = w.id
		JOIN sets s ON s.workout_exercise_id = we.id
		WHERE w.user_id = $1::uuid
		  AND we.exercise_id = $2::uuid
		  AND ($3::timestamptz IS NULL OR w.started_at >= $3::timestamptz)
		  AND s.reps > 0
		ORDER BY w.started_at ASC, s.position ASC
	`, userID, exerciseID, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Agregasi per sesi (tanggal + startedAt sudah cukup sebagai kunci karena satu latihan per hari)
	type sessionData struct {
		startedAt time.Time
		bestOrm1  float64
		volume    float64
	}
	var sessions []sessionData
	var current *sessionData

	const tz = "Asia/Jakarta"
	loc, _ := time.LoadLocation(tz)

	factor := 0.0
	if bodyweightFactor != nil {
		factor = *bodyweightFactor
	}
	isGym := exKind == "gym"

	for rows.Next() {
		var startedAt time.Time
		var weightKg, extraKg, bodyWeight float64
		var reps int
		if err := rows.Scan(&startedAt, &weightKg, &extraKg, &reps, &bodyWeight); err != nil {
			return nil, err
		}

		// Mulai sesi baru bila startedAt berubah
		if current == nil || !current.startedAt.Equal(startedAt) {
			if current != nil {
				sessions = append(sessions, *current)
			}
			current = &sessionData{startedAt: startedAt}
		}

		orm1 := orm1Epley(weightKg, extraKg, bodyWeight, factor, float64(reps), isGym)
		if orm1 > current.bestOrm1 {
			current.bestOrm1 = orm1
		}

		var vol float64
		if isGym {
			vol = weightKg * float64(reps)
		} else {
			vol = (bodyWeight*factor + extraKg) * float64(reps)
		}
		current.volume += vol
	}
	if current != nil {
		sessions = append(sessions, *current)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Bangun ProgressPoints
	points := make([]ProgressPoint, 0, len(sessions))
	for _, s := range sessions {
		if s.bestOrm1 <= 0 {
			continue
		}
		localDate := s.startedAt.In(loc).Format("2006-01-02")
		points = append(points, ProgressPoint{
			Date:      localDate,
			StartedAt: s.startedAt.Format(time.RFC3339),
			Orm1Est:   round1(s.bestOrm1),
			VolumeKg:  round1(s.volume),
		})
	}

	res := &ProgressResult{
		ExerciseID:   exerciseID,
		ExerciseName: exName,
		Kind:         exKind,
		Points:       points,
	}

	if len(points) > 0 {
		last := points[len(points)-1]
		v := last.Orm1Est
		res.CurrentOrm1 = &v
	}

	// Volume minggu ini
	weekStart := time.Now().In(loc).AddDate(0, 0, -int(time.Now().In(loc).Weekday()))
	weekStart = time.Date(weekStart.Year(), weekStart.Month(), weekStart.Day(), 0, 0, 0, 0, loc)
	var weekVol float64
	for _, s := range sessions {
		if s.startedAt.In(loc).After(weekStart) || s.startedAt.In(loc).Equal(weekStart) {
			weekVol += s.volume
		}
	}
	wv := round1(weekVol)
	res.WeekVolumeKg = &wv

	// Proyeksi: regresi linear bila ≥ 4 titik
	if len(points) >= 4 {
		res.Projection = linearProjection(points)
	}

	return res, nil
}

// linearProjection menghitung proyeksi 1RM dari regresi linear sederhana terhadap waktu.
// Mengembalikan nil bila kemiringan tidak positif.
func linearProjection(points []ProgressPoint) *Projection {
	n := float64(len(points))
	t0, _ := time.Parse(time.RFC3339, points[0].StartedAt)

	var sumX, sumY, sumXY, sumXX float64
	for _, p := range points {
		t, _ := time.Parse(time.RFC3339, p.StartedAt)
		x := t.Sub(t0).Hours() / 24 // hari sejak titik pertama
		y := p.Orm1Est
		sumX += x
		sumY += y
		sumXY += x * y
		sumXX += x * x
	}

	denom := n*sumXX - sumX*sumX
	if denom == 0 {
		return nil
	}
	slope := (n*sumXY - sumX*sumY) / denom
	intercept := (sumY - slope*sumX) / n

	if slope <= 0 {
		return nil
	}

	tLast, _ := time.Parse(time.RFC3339, points[len(points)-1].StartedAt)
	xLast := tLast.Sub(t0).Hours() / 24
	currentFit := slope*xLast + intercept

	// Proyeksi 10% kenaikan dari 1RM sekarang
	target := currentFit * 1.10
	xTarget := (target - intercept) / slope
	daysUntil := xTarget - xLast
	weeksUntil := int(math.Round(daysUntil / 7))
	if weeksUntil < 1 {
		weeksUntil = 1
	}
	if weeksUntil > 52 {
		return nil // proyeksi terlalu jauh
	}

	return &Projection{
		Orm1Kg:  round1(target),
		InWeeks: weeksUntil,
	}
}
