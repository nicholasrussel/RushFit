// Command allow mengelola tabel allowed_emails.
//
//	go run ./cmd/allow -email you@gmail.com -role admin
//	go run ./cmd/allow -email someone@gmail.com -disable
//	go run ./cmd/allow -list
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/tripleboys27/rushfit/api/internal/store"
)

func main() {
	_ = godotenv.Load()

	email := flag.String("email", "", "email Google yang diizinkan")
	role := flag.String("role", "member", "admin | member")
	disable := flag.Bool("disable", false, "nonaktifkan email")
	list := flag.Bool("list", false, "tampilkan allowlist")
	flag.Parse()

	ctx := context.Background()
	db, err := store.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		slog.Error("db connect failed", "err", err)
		os.Exit(1)
	}
	defer db.Close()

	if *list {
		rows, err := db.Query(ctx, `SELECT email, role, is_active FROM allowed_emails ORDER BY added_at`)
		if err != nil {
			slog.Error("query failed", "err", err)
			os.Exit(1)
		}
		defer rows.Close()
		for rows.Next() {
			var e, r string
			var active bool
			if err := rows.Scan(&e, &r, &active); err != nil {
				slog.Error("scan failed", "err", err)
				os.Exit(1)
			}
			fmt.Printf("%-40s %-7s active=%v\n", e, r, active)
		}
		return
	}

	e := strings.ToLower(strings.TrimSpace(*email))
	if e == "" {
		flag.Usage()
		os.Exit(2)
	}

	if *disable {
		_, err = db.Exec(ctx, `UPDATE allowed_emails SET is_active = false WHERE email = $1`, e)
	} else {
		_, err = db.Exec(ctx, `
			INSERT INTO allowed_emails (email, role) VALUES ($1, $2)
			ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, is_active = true
		`, e, *role)
	}
	if err != nil {
		slog.Error("update failed", "err", err)
		os.Exit(1)
	}
	fmt.Println("ok:", e)
}
