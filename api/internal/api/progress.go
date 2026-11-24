package api

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/tripleboys27/rushfit/api/internal/store"
)

// GET /v1/progress/:exercise_id?range=4w|12w|all
func (s *Server) getProgress(c *gin.Context) {
	rangeParam := c.DefaultQuery("range", "12w")
	var days int
	switch rangeParam {
	case "4w":
		days = 28
	case "12w":
		days = 84
	case "all":
		days = 0
	default:
		d, err := strconv.Atoi(rangeParam)
		if err != nil || d < 0 {
			fail(c, inputError{"rentang tidak valid, gunakan 4w, 12w, atau all"})
			return
		}
		days = d
	}

	result, err := s.db.GetProgress(c.Request.Context(), currentUser(c).ID, c.Param("exercise_id"), days)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "gerakan tidak ditemukan"})
		return
	}
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// GET /v1/progress  — daftar gerakan yang punya data progres
func (s *Server) listProgressExercises(c *gin.Context) {
	uid := currentUser(c).ID
	rows, err := s.db.Query(c.Request.Context(), `
		SELECT e.id, e.name, e.muscle_group, e.kind, COUNT(s.id) AS set_count
		FROM workouts w
		JOIN workout_exercises we ON we.workout_id = w.id
		JOIN sets s ON s.workout_exercise_id = we.id
		JOIN exercises e ON e.id = we.exercise_id
		WHERE w.user_id = $1
		  AND w.kind IN ('gym','bodyweight')
		  AND s.reps > 0
		GROUP BY e.id, e.name, e.muscle_group, e.kind
		ORDER BY e.muscle_group, e.name
	`, uid)
	if err != nil {
		fail(c, err)
		return
	}
	defer rows.Close()

	type item struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		MuscleGroup string `json:"muscle_group"`
		Kind        string `json:"kind"`
		SetCount    int    `json:"set_count"`
	}
	var list []item
	for rows.Next() {
		var it item
		if err := rows.Scan(&it.ID, &it.Name, &it.MuscleGroup, &it.Kind, &it.SetCount); err != nil {
			fail(c, err)
			return
		}
		list = append(list, it)
	}
	if list == nil {
		list = []item{}
	}
	c.JSON(http.StatusOK, list)
}
