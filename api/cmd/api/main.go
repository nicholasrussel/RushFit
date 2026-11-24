package main

import (
	"context"
	"log/slog"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/tripleboys27/rushfit/api/internal/api"
	"github.com/tripleboys27/rushfit/api/internal/store"
)

func main() {
	_ = godotenv.Load()

	if strings.TrimSpace(os.Getenv("INTERNAL_API_KEY")) == "" {
		slog.Error("INTERNAL_API_KEY is required")
		os.Exit(1)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	ctx := context.Background()
	db, err := store.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		slog.Error("db connect failed", "err", err)
		os.Exit(1)
	}
	defer db.Close()

	r := api.NewServer(db)
	slog.Info("starting api server", "port", port)
	if err := r.Run(":" + port); err != nil {
		slog.Error("server error", "err", err)
		os.Exit(1)
	}
}
