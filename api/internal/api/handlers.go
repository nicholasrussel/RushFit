package api

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/tripleboys27/rushfit/api/internal/store"
)

type Server struct {
	db *store.DB
}

func NewServer(db *store.DB) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	s := &Server{db: db}
	r := gin.Default()

	r.GET("/healthz", func(c *gin.Context) { c.String(http.StatusOK, "ok") })

	v1 := r.Group("/v1", internalKeyMiddleware())
	{
		v1.GET("/me", s.getMe)

		// Endpoint yang butuh user terdaftar taruh di grup ini.
		u := v1.Group("", userMiddleware(db))
		u.GET("/profile", s.getProfile)
		u.PATCH("/profile", s.patchProfile)
		u.GET("/exercises", s.listExercises)
		u.GET("/exercises/all", s.listExercisesManage)
		u.POST("/exercises", s.createExercise)
		u.DELETE("/exercises/:id", s.deleteExercise)
		u.POST("/calc/workout", s.calcWorkout)
		u.POST("/workouts", s.createWorkout)
		u.GET("/workouts", s.listWorkouts)
		u.GET("/workouts/:id", s.getWorkout)
		u.PUT("/workouts/:id", s.updateWorkout)
		u.DELETE("/workouts/:id", s.deleteWorkout)
		u.GET("/recommendations", s.listRecommendations)
		u.POST("/recommendations/refresh", s.refreshRecommendations)
		u.PATCH("/recommendations/:id", s.patchRecommendation)
		u.GET("/progress", s.listProgressExercises)
		u.GET("/progress/:exercise_id", s.getProgress)
		u.GET("/templates", s.listTemplates)
		u.POST("/templates", s.createTemplate)
		u.GET("/templates/:id", s.getTemplate)
		u.PUT("/templates/:id", s.updateTemplate)
		u.DELETE("/templates/:id", s.deleteTemplate)
		u.POST("/templates/:id/start", s.touchTemplate)
	}

	return r
}

func (s *Server) getMe(c *gin.Context) {
	email := strings.ToLower(strings.TrimSpace(c.GetHeader("X-User-Email")))
	name := c.GetHeader("X-User-Name")
	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing X-User-Email"})
		return
	}
	user, err := s.db.GetOrCreateUser(c.Request.Context(), email, name)
	if errors.Is(err, store.ErrNotAllowed) {
		c.JSON(http.StatusForbidden, gin.H{"error": "not allowed"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.JSON(http.StatusOK, user)
}
