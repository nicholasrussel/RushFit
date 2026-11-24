package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/tripleboys27/rushfit/api/internal/store"
)

// ========== Pattern analysis ==========

type muscleFreq struct {
	MuscleGroup  string
	SessionCount int
}

type workoutPattern struct {
	TotalSessions  int
	AvgPerWeek     float64
	MuscleFreqs    []muscleFreq
	MissingMuscles []string
}

var allMuscleGroups = []string{"Dada", "Punggung", "Bahu", "Lengan", "Kaki", "Perut", "Betis"}

func (s *Server) analyzePattern(ctx context.Context, userID string) (*workoutPattern, error) {
	// Total sesi dalam 4 minggu terakhir
	var total int
	if err := s.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM workouts
		WHERE user_id = $1::uuid
		  AND kind IN ('gym','bodyweight')
		  AND started_at >= now() - interval '28 days'
	`, userID).Scan(&total); err != nil {
		return nil, err
	}

	// Frekuensi per kelompok otot dalam 4 minggu
	rows, err := s.db.Query(ctx, `
		SELECT e.muscle_group, COUNT(DISTINCT w.id) AS session_count
		FROM workouts w
		JOIN workout_exercises we ON we.workout_id = w.id
		JOIN exercises e ON e.id = we.exercise_id
		WHERE w.user_id = $1::uuid
		  AND w.kind IN ('gym','bodyweight')
		  AND w.started_at >= now() - interval '28 days'
		GROUP BY e.muscle_group
		ORDER BY session_count DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	trained := map[string]bool{}
	var freqs []muscleFreq
	for rows.Next() {
		var mf muscleFreq
		if err := rows.Scan(&mf.MuscleGroup, &mf.SessionCount); err != nil {
			return nil, err
		}
		freqs = append(freqs, mf)
		trained[mf.MuscleGroup] = true
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	var missing []string
	for _, g := range allMuscleGroups {
		if !trained[g] {
			missing = append(missing, g)
		}
	}

	avg := 0.0
	if total > 0 {
		avg = float64(total) / 4.0
	}

	return &workoutPattern{
		TotalSessions:  total,
		AvgPerWeek:     avg,
		MuscleFreqs:    freqs,
		MissingMuscles: missing,
	}, nil
}

func patternToPrompt(p *workoutPattern) string {
	var buf bytes.Buffer
	buf.WriteString("Kamu adalah pelatih kebugaran yang menganalisis pola latihan pengguna.\n\n")
	buf.WriteString(fmt.Sprintf("Data latihan 4 minggu terakhir:\n- Total sesi: %d (rata-rata %.1f per minggu)\n", p.TotalSessions, p.AvgPerWeek))

	if len(p.MuscleFreqs) > 0 {
		buf.WriteString("- Kelompok otot yang dilatih (jumlah sesi):\n")
		for _, mf := range p.MuscleFreqs {
			buf.WriteString(fmt.Sprintf("  · %s: %d sesi\n", mf.MuscleGroup, mf.SessionCount))
		}
	}

	if len(p.MissingMuscles) > 0 {
		buf.WriteString(fmt.Sprintf("- Belum dilatih sama sekali: %v\n", p.MissingMuscles))
	}

	buf.WriteString("\nBerikan tepat 3 saran latihan yang spesifik, singkat, dan bisa langsung dilakukan dalam Bahasa Indonesia.\n")
	buf.WriteString("Fokus pada ketidakseimbangan, kelompok otot yang jarang dilatih, atau variasi yang bermanfaat.\n")
	buf.WriteString("Format jawaban: JSON array berisi 3 string saja. Contoh:\n")
	buf.WriteString(`["Saran satu.", "Saran dua.", "Saran tiga."]` + "\n")
	buf.WriteString("Hanya balas dengan JSON array tersebut, tanpa teks lain.")
	return buf.String()
}

// ========== Claude API call ==========

type claudeMsg struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type claudeReq struct {
	Model     string      `json:"model"`
	MaxTokens int         `json:"max_tokens"`
	Messages  []claudeMsg `json:"messages"`
}

type claudeResp struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func callClaude(ctx context.Context, prompt string) ([]string, error) {
	apiKey := os.Getenv("ANTHROPIC_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("ANTHROPIC_API_KEY tidak diset")
	}

	body, err := json.Marshal(claudeReq{
		Model:     "claude-haiku-5-5",
		MaxTokens: 512,
		Messages:  []claudeMsg{{Role: "user", Content: prompt}},
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("content-type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var cr claudeResp
	if err := json.Unmarshal(raw, &cr); err != nil {
		return nil, fmt.Errorf("parse claude response: %w", err)
	}
	if cr.Error != nil {
		return nil, fmt.Errorf("claude: %s", cr.Error.Message)
	}
	if len(cr.Content) == 0 {
		return nil, fmt.Errorf("respons claude kosong")
	}

	text := cr.Content[0].Text
	var recs []string
	if err := json.Unmarshal([]byte(text), &recs); err != nil {
		return nil, fmt.Errorf("parse saran JSON: %w (resp: %s)", err, text)
	}
	if len(recs) == 0 {
		return nil, fmt.Errorf("tidak ada saran yang dihasilkan")
	}
	return recs, nil
}

// ========== Handlers ==========

// GET /v1/recommendations
func (s *Server) listRecommendations(c *gin.Context) {
	uid := currentUser(c).ID

	fresh, err := s.db.HasFreshRecommendations(c.Request.Context(), uid)
	if err != nil {
		fail(c, err)
		return
	}

	if !fresh {
		if err := s.generateAndStore(c.Request.Context(), uid); err != nil {
			// Jika Claude gagal (key tidak ada dll), tetap lanjutkan dan return list kosong
			c.JSON(http.StatusOK, gin.H{"recommendations": []store.Recommendation{}, "generated": false, "error": err.Error()})
			return
		}
	}

	list, err := s.db.ListRecommendations(c.Request.Context(), uid)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"recommendations": list, "generated": !fresh})
}

// POST /v1/recommendations/refresh — paksa regenerasi
func (s *Server) refreshRecommendations(c *gin.Context) {
	uid := currentUser(c).ID
	if err := s.generateAndStore(c.Request.Context(), uid); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}
	list, err := s.db.ListRecommendations(c.Request.Context(), uid)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"recommendations": list, "generated": true})
}

// PATCH /v1/recommendations/:id  body: {"action":"dismiss"|"star"}
func (s *Server) patchRecommendation(c *gin.Context) {
	uid := currentUser(c).ID
	id := c.Param("id")
	var body struct {
		Action string `json:"action" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		fail(c, inputError{"action harus berisi 'dismiss' atau 'star'"})
		return
	}

	var err error
	switch body.Action {
	case "dismiss":
		err = s.db.DismissRecommendation(c.Request.Context(), uid, id)
	case "star":
		err = s.db.ToggleStarRecommendation(c.Request.Context(), uid, id)
	default:
		fail(c, inputError{"action tidak valid"})
		return
	}

	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "saran tidak ditemukan"})
		return
	}
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

func (s *Server) generateAndStore(ctx context.Context, userID string) error {
	pattern, err := s.analyzePattern(ctx, userID)
	if err != nil {
		return err
	}

	if pattern.TotalSessions == 0 {
		return fmt.Errorf("belum ada data latihan untuk dianalisis")
	}

	prompt := patternToPrompt(pattern)
	recs, err := callClaude(ctx, prompt)
	if err != nil {
		return err
	}

	_, err = s.db.CreateRecommendations(ctx, userID, recs)
	return err
}
