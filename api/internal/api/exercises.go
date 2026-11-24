package api

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/tripleboys27/rushfit/api/internal/store"
)

var gymCodes = map[string]bool{"02052": true, "02054": true}
var bwCodes = map[string]bool{"02056": true, "02057": true}

type createExerciseInput struct {
	Name             string   `json:"name"`
	MuscleGroup      string   `json:"muscle_group"`
	Kind             string   `json:"kind"`
	CompendiumCode   string   `json:"compendium_code"`
	BodyweightFactor *float64 `json:"bodyweight_factor"`
}

// listExercisesManage GET /v1/exercises/all — semua gerakan dengan detail kode Compendium.
func (s *Server) listExercisesManage(c *gin.Context) {
	user := c.MustGet("user").(*store.User)
	list, err := s.db.ListAllExercises(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.JSON(http.StatusOK, list)
}

// createExercise POST /v1/exercises — buat gerakan kustom.
func (s *Server) createExercise(c *gin.Context) {
	user := c.MustGet("user").(*store.User)
	var in createExerciseInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "permintaan tidak valid"})
		return
	}

	in.Name = strings.TrimSpace(in.Name)
	in.MuscleGroup = strings.TrimSpace(in.MuscleGroup)

	if in.Name == "" || len(in.Name) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "nama gerakan harus diisi (maks 100 karakter)"})
		return
	}
	if in.MuscleGroup == "" || len(in.MuscleGroup) > 50 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "kelompok otot harus diisi (maks 50 karakter)"})
		return
	}
	if in.Kind != "gym" && in.Kind != "bodyweight" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "jenis harus gym atau bodyweight"})
		return
	}
	valid := gymCodes
	if in.Kind == "bodyweight" {
		valid = bwCodes
	}
	if !valid[in.CompendiumCode] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "kode Compendium tidak valid untuk jenis ini"})
		return
	}

	e, err := s.db.CreateExercise(c.Request.Context(), user.ID,
		in.Name, in.MuscleGroup, in.Kind, in.CompendiumCode, in.BodyweightFactor)
	if err != nil {
		if strings.Contains(err.Error(), "exercises_user_name") {
			c.JSON(http.StatusConflict, gin.H{"error": "gerakan dengan nama ini sudah ada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.JSON(http.StatusCreated, e)
}

// deleteExercise DELETE /v1/exercises/:id — hapus gerakan kustom milik pengguna.
func (s *Server) deleteExercise(c *gin.Context) {
	user := c.MustGet("user").(*store.User)
	id := c.Param("id")
	err := s.db.DeleteExercise(c.Request.Context(), user.ID, id)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "gerakan tidak ditemukan"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.Status(http.StatusNoContent)
}
