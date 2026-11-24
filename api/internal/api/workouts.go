package api

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tripleboys27/rushfit/api/internal/calc"
	"github.com/tripleboys27/rushfit/api/internal/store"
)

const (
	maxDurationSec = 24 * 60 * 60
	maxDistanceM   = 1_000_000
	maxExercises   = 30
	maxSets        = 30
	maxWeightKg    = 1000
	maxReps        = 1000
	maxNotesLen    = 1000
	maxHistory     = 300
)

var cardioActivities = map[string]bool{"run": true, "walk": true, "cycle": true, "swim": true}

// ---------- Kontrak request ----------

type setInput struct {
	WeightKg      float64 `json:"weight_kg"` // gym
	Reps          int     `json:"reps"`
	ExtraWeightKg float64 `json:"extra_weight_kg"` // bodyweight; 0 = tanpa beban tambahan
}

type exerciseInput struct {
	ExerciseID string     `json:"exercise_id"`
	Sets       []setInput `json:"sets"`
}

type cardioInput struct {
	Activity  string `json:"activity"`
	DistanceM int    `json:"distance_m"`
}

type workoutInput struct {
	WorkoutID   string          `json:"workout_id"` // hanya untuk pratinjau saat mengedit
	Kind        string          `json:"kind"`
	StartedAt   *time.Time      `json:"started_at"`
	DurationSec *int            `json:"duration_sec"`
	Notes       string          `json:"notes"`
	Cardio      *cardioInput    `json:"cardio"`
	Exercises   []exerciseInput `json:"exercises"`
}

// ---------- Kontrak response hitungan ----------

type exerciseResult struct {
	ExerciseID string   `json:"exercise_id"`
	VolumeKg   float64  `json:"volume_kg"`
	Calories   *float64 `json:"calories"`
	// Beban tiap set yang dipakai untuk volume; untuk bodyweight ini beban efektif.
	SetWeightsKg []float64 `json:"set_weights_kg"`
}

type calcResult struct {
	PaceSecPerKm      *int             `json:"pace_sec_per_km"`
	MET               *float64         `json:"met"`
	CompendiumCode    *string          `json:"compendium_code"`
	CompendiumVersion string           `json:"compendium_version"`
	BodyWeightKg      *float64         `json:"body_weight_kg"`
	Calories          *float64         `json:"calories"` // nil bila durasi atau berat badan tidak diketahui
	VolumeKg          float64          `json:"volume_kg"`
	Exercises         []exerciseResult `json:"exercises"`
}

type inputError struct{ msg string }

func (e inputError) Error() string { return e.msg }

func currentUser(c *gin.Context) *store.User {
	return c.MustGet("user").(*store.User)
}

func fail(c *gin.Context, err error) {
	var ie inputError
	switch {
	case errors.As(err, &ie):
		c.JSON(http.StatusBadRequest, gin.H{"error": ie.msg})
	case errors.Is(err, store.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	default:
		c.Error(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
	}
}

func validate(in *workoutInput, requireStart bool) error {
	in.Notes = strings.TrimSpace(in.Notes)
	if len(in.Notes) > maxNotesLen {
		return inputError{"catatan terlalu panjang"}
	}
	if requireStart {
		if in.StartedAt == nil {
			return inputError{"waktu mulai wajib diisi"}
		}
		if in.StartedAt.After(time.Now().Add(24 * time.Hour)) {
			return inputError{"waktu mulai tidak boleh di masa depan"}
		}
	}
	if in.DurationSec != nil && (*in.DurationSec <= 0 || *in.DurationSec > maxDurationSec) {
		return inputError{"durasi tidak valid"}
	}

	switch in.Kind {
	case "cardio":
		if in.Cardio == nil || !cardioActivities[in.Cardio.Activity] {
			return inputError{"aktivitas tidak dikenal"}
		}
		if in.DurationSec == nil {
			return inputError{"durasi wajib diisi untuk cardio"}
		}
		if in.Cardio.DistanceM <= 0 || in.Cardio.DistanceM > maxDistanceM {
			return inputError{"jarak wajib diisi untuk cardio"}
		}
	case "gym", "bodyweight":
		if len(in.Exercises) == 0 {
			return inputError{"tambahkan minimal satu gerakan"}
		}
		if len(in.Exercises) > maxExercises {
			return inputError{"terlalu banyak gerakan"}
		}
		for _, ex := range in.Exercises {
			if ex.ExerciseID == "" {
				return inputError{"gerakan belum dipilih"}
			}
			if len(ex.Sets) == 0 {
				return inputError{"setiap gerakan butuh minimal satu set"}
			}
			if len(ex.Sets) > maxSets {
				return inputError{"terlalu banyak set"}
			}
			for _, s := range ex.Sets {
				if s.Reps <= 0 || s.Reps > maxReps {
					return inputError{"repetisi tidak valid"}
				}
				if s.WeightKg < 0 || s.WeightKg > maxWeightKg || s.ExtraWeightKg < 0 || s.ExtraWeightKg > maxWeightKg {
					return inputError{"beban tidak valid"}
				}
			}
		}
	default:
		return inputError{"jenis latihan belum didukung"}
	}
	return nil
}

// compute menjalankan semua hitungan untuk satu sesi: pace, pemilihan MET,
// kalori sesi, volume, dan kalori per gerakan.
func (s *Server) compute(ctx context.Context, user *store.User, in *workoutInput, weight *float64) (*calcResult, error) {
	res := &calcResult{
		CompendiumVersion: calc.CompendiumVersion,
		BodyWeightKg:      weight,
		Exercises:         []exerciseResult{},
	}

	var met float64
	var volumes []float64

	switch in.Kind {
	case "cardio":
		rows, err := s.db.CardioMETRows(ctx, in.Cardio.Activity, calc.CompendiumVersion)
		if err != nil {
			return nil, err
		}
		table := make([]calc.METRow, len(rows))
		for i, r := range rows {
			table[i] = calc.METRow{Code: r.Code, MinSpeedKmh: r.MinSpeedKmh, MET: r.MET}
		}
		speed, _ := calc.SpeedKmh(*in.DurationSec, in.Cardio.DistanceM)
		row, ok := calc.SelectCardioMET(table, speed)
		if !ok {
			return nil, errors.New("no MET rows for activity " + in.Cardio.Activity)
		}
		met = row.MET
		res.CompendiumCode = &row.Code
		if pace, ok := calc.PaceSecPerKm(*in.DurationSec, in.Cardio.DistanceM); ok {
			res.PaceSecPerKm = &pace
		}

	case "gym", "bodyweight":
		bodyweight := in.Kind == "bodyweight"
		if bodyweight && weight == nil {
			return nil, inputError{"isi berat badan dulu; beban efektif dihitung dari berat badan"}
		}
		ids := make([]string, len(in.Exercises))
		for i, ex := range in.Exercises {
			ids[i] = ex.ExerciseID
		}
		known, err := s.db.ExerciseMETs(ctx, user.ID, in.Kind, calc.CompendiumVersion, ids)
		if err != nil {
			return nil, err
		}
		mets := make([]float64, len(in.Exercises))
		counts := make([]int, len(in.Exercises))
		volumes = make([]float64, len(in.Exercises))
		totalReps := 0
		for i, ex := range in.Exercises {
			info, ok := known[ex.ExerciseID]
			if !ok {
				return nil, inputError{"gerakan tidak dikenal"}
			}
			factor := 1.0
			if info.Factor != nil {
				factor = *info.Factor
			}
			sets := make([]calc.Set, len(ex.Sets))
			weights := make([]float64, len(ex.Sets))
			for j, st := range ex.Sets {
				w := st.WeightKg
				switch {
				case info.Timed:
					// Gerakan tahan: reps berisi detik, tidak menyumbang volume atau kepadatan.
					w = 0
				case bodyweight:
					w = calc.Round(calc.EffectiveWeight(*weight, factor, st.ExtraWeightKg), 2)
					totalReps += st.Reps
				default:
					totalReps += st.Reps
				}
				sets[j] = calc.Set{WeightKg: w, Reps: st.Reps}
				weights[j] = w
			}
			mets[i], counts[i], volumes[i] = info.MET, len(sets), calc.Volume(sets)
			res.VolumeKg += volumes[i]
			res.Exercises = append(res.Exercises, exerciseResult{
				ExerciseID: ex.ExerciseID, VolumeKg: volumes[i], SetWeightsKg: weights,
			})
		}
		if !bodyweight {
			met, _ = calc.WeightedMET(mets, counts)
		} else if in.DurationSec != nil {
			// Bodyweight: satu MET untuk seluruh sesi, dipilih dari kepadatan latihan.
			code, ok := calc.BodyweightCode(totalReps, *in.DurationSec)
			if !ok {
				// Hanya gerakan tahan: tidak ada repetisi untuk diukur, pakai nilai umum.
				code = calc.BodyweightGeneralCode
			}
			if met, err = s.db.METByCode(ctx, code, calc.CompendiumVersion); err != nil {
				return nil, err
			}
			res.CompendiumCode = &code
		}
	}

	if met > 0 {
		m := calc.Round(met, 2)
		res.MET = &m
	}
	if met > 0 && in.DurationSec != nil && weight != nil {
		total := calc.Calories(met, *weight, *in.DurationSec)
		rounded := calc.Round(total, 1)
		res.Calories = &rounded
		for i, part := range calc.SplitByVolume(total, volumes) {
			p := calc.Round(part, 1)
			res.Exercises[i].Calories = &p
		}
	}
	return res, nil
}

// weightFor menentukan berat badan untuk hitungan. Sesi baru memakai berat
// badan profil saat ini. Sesi yang diedit memakai snapshot yang tersimpan di
// sesi itu, supaya perubahan berat badan tidak mengubah kalori sesi lama.
func (s *Server) weightFor(ctx context.Context, user *store.User, existing *store.Workout) (*float64, error) {
	if existing != nil && existing.BodyWeightKg != nil {
		return existing.BodyWeightKg, nil
	}
	profile, err := s.db.GetProfile(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	return profile.WeightKg, nil
}

func toNewWorkout(user *store.User, in *workoutInput, res *calcResult) store.NewWorkout {
	version := res.CompendiumVersion
	nw := store.NewWorkout{
		UserID:            user.ID,
		Kind:              in.Kind,
		StartedAt:         *in.StartedAt,
		DurationSec:       in.DurationSec,
		Notes:             in.Notes,
		BodyWeightKg:      res.BodyWeightKg,
		MET:               res.MET,
		CompendiumVersion: &version,
		Calories:          res.Calories,
	}
	if in.Kind == "cardio" {
		nw.Cardio = &store.NewCardio{
			Activity:     in.Cardio.Activity,
			DistanceM:    in.Cardio.DistanceM,
			PaceSecPerKm: *res.PaceSecPerKm,
		}
		return nw
	}
	for i, ex := range in.Exercises {
		sets := make([]store.NewSet, len(ex.Sets))
		for j, st := range ex.Sets {
			sets[j] = store.NewSet{WeightKg: res.Exercises[i].SetWeightsKg[j], Reps: st.Reps}
			if in.Kind == "bodyweight" {
				extra := st.ExtraWeightKg
				sets[j].ExtraKg = &extra
			}
		}
		nw.Exercises = append(nw.Exercises, store.NewWorkoutExercise{
			ExerciseID: ex.ExerciseID,
			Calories:   res.Exercises[i].Calories,
			Sets:       sets,
		})
	}
	return nw
}

// POST /v1/calc/workout — hitung tanpa menyimpan (pratinjau saat mengetik).
// Bila workout_id diisi (sedang mengedit), berat badan snapshot sesi itu yang dipakai.
func (s *Server) calcWorkout(c *gin.Context) {
	var in workoutInput
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, inputError{"format data tidak valid"})
		return
	}
	if err := validate(&in, false); err != nil {
		fail(c, err)
		return
	}
	ctx := c.Request.Context()
	user := currentUser(c)
	var existing *store.Workout
	if in.WorkoutID != "" {
		var err error
		if existing, err = s.db.GetWorkout(ctx, user.ID, in.WorkoutID); err != nil {
			fail(c, err)
			return
		}
	}
	weight, err := s.weightFor(ctx, user, existing)
	if err != nil {
		fail(c, err)
		return
	}
	res, err := s.compute(ctx, user, &in, weight)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

// POST /v1/workouts — hitung lalu simpan sesi diary.
func (s *Server) createWorkout(c *gin.Context) {
	var in workoutInput
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, inputError{"format data tidak valid"})
		return
	}
	if err := validate(&in, true); err != nil {
		fail(c, err)
		return
	}
	ctx := c.Request.Context()
	user := currentUser(c)
	weight, err := s.weightFor(ctx, user, nil)
	if err != nil {
		fail(c, err)
		return
	}
	res, err := s.compute(ctx, user, &in, weight)
	if err != nil {
		fail(c, err)
		return
	}
	id, err := s.db.CreateWorkout(ctx, toNewWorkout(user, &in, res))
	if err != nil {
		fail(c, err)
		return
	}
	w, err := s.db.GetWorkout(ctx, user.ID, id)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusCreated, w)
}

// PUT /v1/workouts/:id — ganti isi sesi lalu hitung ulang. Jenis sesi tidak
// bisa diubah, dan berat badan snapshot sesi tetap dipakai.
func (s *Server) updateWorkout(c *gin.Context) {
	var in workoutInput
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, inputError{"format data tidak valid"})
		return
	}
	if err := validate(&in, true); err != nil {
		fail(c, err)
		return
	}
	ctx := c.Request.Context()
	user := currentUser(c)
	existing, err := s.db.GetWorkout(ctx, user.ID, c.Param("id"))
	if err != nil {
		fail(c, err)
		return
	}
	if existing.Kind != in.Kind {
		fail(c, inputError{"jenis sesi tidak bisa diubah"})
		return
	}
	weight, err := s.weightFor(ctx, user, existing)
	if err != nil {
		fail(c, err)
		return
	}
	res, err := s.compute(ctx, user, &in, weight)
	if err != nil {
		fail(c, err)
		return
	}
	if err := s.db.UpdateWorkout(ctx, existing.ID, toNewWorkout(user, &in, res)); err != nil {
		fail(c, err)
		return
	}
	w, err := s.db.GetWorkout(ctx, user.ID, existing.ID)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, w)
}

// DELETE /v1/workouts/:id
func (s *Server) deleteWorkout(c *gin.Context) {
	if err := s.db.DeleteWorkout(c.Request.Context(), currentUser(c).ID, c.Param("id")); err != nil {
		fail(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// GET /v1/workouts?kind=cardio|gym|bodyweight — riwayat, terbaru dulu.
func (s *Server) listWorkouts(c *gin.Context) {
	kind := c.Query("kind")
	if kind != "" && kind != "cardio" && kind != "gym" && kind != "bodyweight" {
		fail(c, inputError{"jenis latihan tidak dikenal"})
		return
	}
	list, err := s.db.ListWorkouts(c.Request.Context(), currentUser(c).ID, kind, maxHistory)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, list)
}

// GET /v1/workouts/:id
func (s *Server) getWorkout(c *gin.Context) {
	w, err := s.db.GetWorkout(c.Request.Context(), currentUser(c).ID, c.Param("id"))
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, w)
}

// GET /v1/exercises?kind=gym
func (s *Server) listExercises(c *gin.Context) {
	kind := c.DefaultQuery("kind", "gym")
	if kind != "gym" && kind != "bodyweight" {
		fail(c, inputError{"jenis gerakan tidak dikenal"})
		return
	}
	list, err := s.db.ListExercises(c.Request.Context(), currentUser(c).ID, kind)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, list)
}

// GET /v1/profile
func (s *Server) getProfile(c *gin.Context) {
	p, err := s.db.GetProfile(c.Request.Context(), currentUser(c).ID)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, p)
}

// PATCH /v1/profile  {"weight_kg": 70} | {"unit": "imperial"} | keduanya
func (s *Server) patchProfile(c *gin.Context) {
	var in struct {
		WeightKg *float64 `json:"weight_kg"`
		Unit     *string  `json:"unit"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, inputError{"input tidak valid"})
		return
	}
	if in.WeightKg == nil && in.Unit == nil {
		fail(c, inputError{"tidak ada yang diubah"})
		return
	}

	ctx := c.Request.Context()
	uid := currentUser(c).ID

	if in.WeightKg != nil {
		if *in.WeightKg < 20 || *in.WeightKg > 400 {
			fail(c, inputError{"berat badan harus antara 20 dan 400 kg"})
			return
		}
		if _, err := s.db.SetProfileWeight(ctx, uid, calc.Round(*in.WeightKg, 2)); err != nil {
			fail(c, err)
			return
		}
	}

	if in.Unit != nil {
		if *in.Unit != "metric" && *in.Unit != "imperial" {
			fail(c, inputError{"satuan tidak valid"})
			return
		}
		if _, err := s.db.SetProfileUnit(ctx, uid, *in.Unit); err != nil {
			fail(c, err)
			return
		}
	}

	p, err := s.db.GetProfile(ctx, uid)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, p)
}
