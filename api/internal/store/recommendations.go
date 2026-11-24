package store

import (
	"context"
	"time"
)

type Recommendation struct {
	ID          string     `json:"id"`
	Content     string     `json:"content"`
	GeneratedAt time.Time  `json:"generated_at"`
	DismissedAt *time.Time `json:"dismissed_at,omitempty"`
	StarredAt   *time.Time `json:"starred_at,omitempty"`
}

// ListRecommendations mengembalikan saran aktif (belum diabaikan) dan yang di-bintang.
// "Aktif" = belum dismissed. Yang di-bintang tetap tampil walau dismissed.
func (db *DB) ListRecommendations(ctx context.Context, userID string) ([]Recommendation, error) {
	rows, err := db.Query(ctx, `
		SELECT id, content, generated_at, dismissed_at, starred_at
		FROM recommendations
		WHERE user_id = $1::uuid
		  AND (dismissed_at IS NULL OR starred_at IS NOT NULL)
		ORDER BY starred_at DESC NULLS LAST, generated_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Recommendation
	for rows.Next() {
		var r Recommendation
		if err := rows.Scan(&r.ID, &r.Content, &r.GeneratedAt, &r.DismissedAt, &r.StarredAt); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	if list == nil {
		list = []Recommendation{}
	}
	return list, rows.Err()
}

// HasFreshRecommendations returns true bila ada saran aktif yang dibuat dalam 24 jam terakhir.
func (db *DB) HasFreshRecommendations(ctx context.Context, userID string) (bool, error) {
	var count int
	err := db.QueryRow(ctx, `
		SELECT COUNT(*) FROM recommendations
		WHERE user_id = $1::uuid
		  AND dismissed_at IS NULL
		  AND generated_at >= now() - interval '24 hours'
	`, userID).Scan(&count)
	return count > 0, err
}

// CreateRecommendations menyimpan saran baru dalam satu batch.
func (db *DB) CreateRecommendations(ctx context.Context, userID string, contents []string) ([]Recommendation, error) {
	tx, err := db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var list []Recommendation
	for _, c := range contents {
		var r Recommendation
		err := tx.QueryRow(ctx,
			`INSERT INTO recommendations (user_id, content) VALUES ($1::uuid, $2)
			 RETURNING id, content, generated_at, dismissed_at, starred_at`,
			userID, c,
		).Scan(&r.ID, &r.Content, &r.GeneratedAt, &r.DismissedAt, &r.StarredAt)
		if err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, tx.Commit(ctx)
}

// DismissRecommendation menandai saran sebagai diabaikan.
func (db *DB) DismissRecommendation(ctx context.Context, userID, id string) error {
	tag, err := db.Exec(ctx,
		`UPDATE recommendations SET dismissed_at = now()
		 WHERE id = $1::uuid AND user_id = $2::uuid AND dismissed_at IS NULL`,
		id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ToggleStarRecommendation menyimpan atau melepas bintang dari saran.
func (db *DB) ToggleStarRecommendation(ctx context.Context, userID, id string) error {
	tag, err := db.Exec(ctx, `
		UPDATE recommendations
		SET starred_at = CASE WHEN starred_at IS NULL THEN now() ELSE NULL END
		WHERE id = $1::uuid AND user_id = $2::uuid
	`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
