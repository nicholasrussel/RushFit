package store

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

type TemplateSet struct {
	WeightKg *float64 `json:"weight_kg"`
	Reps     int      `json:"reps"`
}

type TemplateExercise struct {
	ExerciseID string        `json:"exercise_id"`
	Name       string        `json:"name"`
	Measure    string        `json:"measure"`
	Sets       []TemplateSet `json:"sets"`
}

type Template struct {
	ID            string             `json:"id"`
	Name          string             `json:"name"`
	Kind          string             `json:"kind"`
	Exercises     []TemplateExercise `json:"exercises"`
	ExerciseCount int                `json:"exercise_count"`
	SetCount      int                `json:"set_count"`
	LastUsedAt    *time.Time         `json:"last_used_at,omitempty"`
	CreatedAt     time.Time          `json:"created_at"`
}

func exerciseCounts(exs []TemplateExercise) (exCount, setCount int) {
	exCount = len(exs)
	for _, e := range exs {
		setCount += len(e.Sets)
	}
	return
}

const templateCols = `id, name, kind, exercises, last_used_at, created_at`

func scanTemplate(row pgx.Row) (*Template, error) {
	var t Template
	var exJSON []byte
	if err := row.Scan(&t.ID, &t.Name, &t.Kind, &exJSON, &t.LastUsedAt, &t.CreatedAt); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(exJSON, &t.Exercises); err != nil {
		return nil, err
	}
	t.ExerciseCount, t.SetCount = exerciseCounts(t.Exercises)
	return &t, nil
}

func (db *DB) ListTemplates(ctx context.Context, userID string) ([]Template, error) {
	rows, err := db.Query(ctx,
		`SELECT `+templateCols+` FROM templates WHERE user_id = $1
		 ORDER BY COALESCE(last_used_at, created_at) DESC`,
		userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Template
	for rows.Next() {
		t, err := scanTemplate(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *t)
	}
	if list == nil {
		list = []Template{}
	}
	return list, rows.Err()
}

func (db *DB) CreateTemplate(ctx context.Context, userID, name, kind string, exercises []TemplateExercise) (*Template, error) {
	exJSON, err := json.Marshal(exercises)
	if err != nil {
		return nil, err
	}
	row := db.QueryRow(ctx,
		`INSERT INTO templates (user_id, name, kind, exercises)
		 VALUES ($1, $2, $3, $4)
		 RETURNING `+templateCols,
		userID, name, kind, exJSON)
	return scanTemplate(row)
}

func (db *DB) GetTemplate(ctx context.Context, userID, id string) (*Template, error) {
	row := db.QueryRow(ctx,
		`SELECT `+templateCols+` FROM templates WHERE id = $1 AND user_id = $2`,
		id, userID)
	t, err := scanTemplate(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

func (db *DB) UpdateTemplate(ctx context.Context, userID, id, name string, exercises []TemplateExercise) (*Template, error) {
	exJSON, err := json.Marshal(exercises)
	if err != nil {
		return nil, err
	}
	row := db.QueryRow(ctx,
		`UPDATE templates SET name = $3, exercises = $4, updated_at = now()
		 WHERE id = $1 AND user_id = $2
		 RETURNING `+templateCols,
		id, userID, name, exJSON)
	t, err := scanTemplate(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

func (db *DB) DeleteTemplate(ctx context.Context, userID, id string) error {
	tag, err := db.Exec(ctx,
		`DELETE FROM templates WHERE id = $1 AND user_id = $2`,
		id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (db *DB) TouchTemplate(ctx context.Context, userID, id string) error {
	tag, err := db.Exec(ctx,
		`UPDATE templates SET last_used_at = now() WHERE id = $1 AND user_id = $2`,
		id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
