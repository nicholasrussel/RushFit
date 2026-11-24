package store

import (
	"context"
	"errors"
	"time"
)

type User struct {
	ID          string     `json:"id"`
	Email       string     `json:"email"`
	Name        *string    `json:"name"`
	Role        string     `json:"role"`
	CreatedAt   time.Time  `json:"created_at"`
	LastLoginAt *time.Time `json:"last_login_at"`
}

var ErrNotAllowed = errors.New("email not in allowlist")

func (db *DB) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	var u User
	err := db.QueryRow(ctx, `
		SELECT u.id, u.email, u.name, ae.role, u.created_at, u.last_login_at
		FROM users u
		JOIN allowed_emails ae ON ae.email = u.email
		WHERE u.email = $1 AND ae.is_active
	`, email).Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.CreatedAt, &u.LastLoginAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (db *DB) GetOrCreateUser(ctx context.Context, email, name string) (*User, error) {
	var role string
	var isActive bool
	err := db.QueryRow(ctx,
		`SELECT role, is_active FROM allowed_emails WHERE email = $1`, email,
	).Scan(&role, &isActive)
	if err != nil || !isActive {
		return nil, ErrNotAllowed
	}

	var namePtr *string
	if name != "" {
		namePtr = &name
	}
	var u User
	err = db.QueryRow(ctx, `
		INSERT INTO users (email, name, last_login_at)
		VALUES ($1, $2, now())
		ON CONFLICT (email) DO UPDATE
		  SET name = COALESCE($2, users.name),
		      last_login_at = now()
		RETURNING id, email, name, $3::text AS role, created_at, last_login_at
	`, email, namePtr, role).Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.CreatedAt, &u.LastLoginAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}
