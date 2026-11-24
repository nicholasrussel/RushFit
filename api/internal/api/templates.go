package api

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/tripleboys27/rushfit/api/internal/store"
)

// GET /v1/templates
func (s *Server) listTemplates(c *gin.Context) {
	list, err := s.db.ListTemplates(c.Request.Context(), currentUser(c).ID)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, list)
}

// POST /v1/templates
func (s *Server) createTemplate(c *gin.Context) {
	var in struct {
		Name      string                   `json:"name"`
		Kind      string                   `json:"kind"`
		Exercises []store.TemplateExercise `json:"exercises"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, inputError{"input tidak valid"})
		return
	}
	if strings.TrimSpace(in.Name) == "" {
		fail(c, inputError{"nama template wajib diisi"})
		return
	}
	if in.Kind != "gym" && in.Kind != "bodyweight" {
		fail(c, inputError{"jenis harus gym atau bodyweight"})
		return
	}
	if len(in.Exercises) == 0 {
		fail(c, inputError{"template harus memiliki minimal satu gerakan"})
		return
	}
	t, err := s.db.CreateTemplate(c.Request.Context(), currentUser(c).ID,
		strings.TrimSpace(in.Name), in.Kind, in.Exercises)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusCreated, t)
}

// GET /v1/templates/:id
func (s *Server) getTemplate(c *gin.Context) {
	t, err := s.db.GetTemplate(c.Request.Context(), currentUser(c).ID, c.Param("id"))
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "template tidak ditemukan"})
		return
	}
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, t)
}

// PUT /v1/templates/:id
func (s *Server) updateTemplate(c *gin.Context) {
	var in struct {
		Name      string                   `json:"name"`
		Exercises []store.TemplateExercise `json:"exercises"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, inputError{"input tidak valid"})
		return
	}
	if strings.TrimSpace(in.Name) == "" {
		fail(c, inputError{"nama template wajib diisi"})
		return
	}
	if len(in.Exercises) == 0 {
		fail(c, inputError{"template harus memiliki minimal satu gerakan"})
		return
	}
	t, err := s.db.UpdateTemplate(c.Request.Context(), currentUser(c).ID,
		c.Param("id"), strings.TrimSpace(in.Name), in.Exercises)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "template tidak ditemukan"})
		return
	}
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(http.StatusOK, t)
}

// DELETE /v1/templates/:id
func (s *Server) deleteTemplate(c *gin.Context) {
	err := s.db.DeleteTemplate(c.Request.Context(), currentUser(c).ID, c.Param("id"))
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "template tidak ditemukan"})
		return
	}
	if err != nil {
		fail(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// POST /v1/templates/:id/start  — tandai template sebagai baru dipakai
func (s *Server) touchTemplate(c *gin.Context) {
	err := s.db.TouchTemplate(c.Request.Context(), currentUser(c).ID, c.Param("id"))
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "template tidak ditemukan"})
		return
	}
	if err != nil {
		fail(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
