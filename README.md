# RushFit — Aplikasi Latihan & Progres Kebugaran

Aplikasi kebugaran pribadi untuk mencatat latihan harian, memantau progres kekuatan, dan mendapat rekomendasi latihan berbasis data. Login hanya dengan akun Google yang terdaftar.

## Fitur

| Fitur | Keterangan |
|---|---|
| 🔐 **Login Google** | Auth.js + Google OAuth; hanya email di tabel `allowed_emails` yang bisa masuk |
| 🏃 **Diary Cardio** | Catat lari, jalan, bersepeda, renang — estimasi kalori dari MET Compendium 2024 |
| 🏋️ **Diary Gym** | Gerakan beban dengan set, repetisi, dan beban; estimasi kalori dari MET |
| 🤸 **Diary Bodyweight** | Gerakan tanpa beban dengan opsi tambahan beban; beban efektif dari berat badan × faktor |
| ✏️ **Edit & Hapus Sesi** | Ubah atau hapus sesi yang sudah tercatat |
| 📋 **Riwayat** | Daftar semua sesi, bisa disaring per jenis |
| 🏠 **Dashboard** | Ringkasan hari ini: sesi aktif, kalori, volume |
| ⚡ **Latihan Langsung** | Sesi real-time dengan timer, rest timer 90 detik, dan auto-save ke diary |
| 📄 **Template Latihan** | Simpan susunan gerakan favorit; gunakan langsung di sesi latihan |
| 📈 **Grafik Progres** | Estimasi 1RM (formula Epley) per gerakan dari waktu ke waktu + volume mingguan |
| 🎯 **Proyeksi Beban** | Regresi linear dari tren 1RM; tampil saat data ≥ 4 sesi |
| 💡 **Rekomendasi AI** | Kode mendeteksi ketidakseimbangan kelompok otot, Claude API menyusun saran; bisa disimpan atau diabaikan |

## Arsitektur

```mermaid
flowchart LR
    U([User]) -->|Login Google| W[Next.js Web\nVercel]
    W -->|Server Action / Server Component| A[Go API\nGin, Vercel]
    A <--> DB[(Neon Postgres)]
    A -->|Rekomendasi AI| C[Claude API\nAnthropic]
    W -->|/api/go proxy| A
```

Alur singkat:

1. User login dengan Google → Auth.js memanggil Go API (`GET /v1/me`) untuk validasi email di allowlist.
2. Server Components membaca data langsung dari Go API melalui `goFetch` (server-only).
3. Client Components menggunakan route proxy `/api/go?path=...` supaya tidak langsung menghubungi Go API.
4. Sesi latihan langsung disimpan di `localStorage` selama berlangsung; saat selesai dikirim ke Go API dan masuk ke diary.
5. Go API menganalisis pola latihan dan memanggil Claude API untuk menghasilkan rekomendasi.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Auth.js v5
- **Backend**: Go 1.25, Gin, pgx/v5
- **Database**: Neon Postgres (migrasi dengan goose)
- **AI**: Claude API (Anthropic) — rekomendasi latihan
- **Infra**: Vercel (web + API sebagai dua service terpisah)

## Struktur Folder

```
api/
  cmd/api/          # HTTP API server (Gin)
  cmd/allow/        # CLI untuk mengelola allowlist email
  internal/api/     # handler + middleware (X-Internal-Key, X-User-Email)
  internal/store/   # akses database (pgx)
  migrations/       # skema database (goose, 0001–0008)
web/
  app/              # halaman: dashboard, catat, riwayat, progres, langsung, template, profil
  components/       # UI components bersama
  lib/              # utilitas: format, session, go-api, live-session, template-types
neon.ts             # konfigurasi Neon (project RushFit, terpisah dari StocksAnalytics)
vercel.json         # konfigurasi monorepo Vercel (web + api)
```

## Menjalankan Secara Lokal

```bash
# 1. API
cd api
cp .env.example .env              # DATABASE_URL dari ../.env.local (hasil `neon link`)
go run ./cmd/api                  # http://localhost:8080

# 2. Web (terminal lain)
cd web
cp .env.example .env.local        # AUTH_*, API_BASE_URL, INTERNAL_API_KEY
npm install
npm run dev                       # http://localhost:3000
```

`INTERNAL_API_KEY` harus sama di `api/.env` dan `web/.env.local`.

## Database

```bash
cd api

# Migrasi (pakai koneksi direct/unpooled dari Neon)
go run github.com/pressly/goose/v3/cmd/goose@v3.24.1 \
  -dir migrations postgres "$DATABASE_URL_DIRECT" up

# Tambah/nonaktifkan email di allowlist
go run ./cmd/allow -email kamu@gmail.com -role admin
go run ./cmd/allow -email orang@gmail.com -disable
go run ./cmd/allow -list
```

Neon: project `RushFit` (`aged-cell-94215914`), region `aws-ap-southeast-1`, branch `main`.  
`npx neon env pull` memperbarui `.env.local` di root.

## Variabel Lingkungan

### `api/.env`

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Koneksi pooled Neon (pgBouncer) |
| `DATABASE_URL_DIRECT` | Koneksi direct Neon (untuk goose) |
| `INTERNAL_API_KEY` | Kunci rahasia antara Next.js dan Go API |
| `ANTHROPIC_API_KEY` | Kunci Claude API untuk fitur rekomendasi |
| `PORT` | Port server (default `8080`) |

### `web/.env.local`

| Variabel | Keterangan |
|---|---|
| `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |
| `AUTH_SECRET` | Secret untuk enkripsi sesi Auth.js |
| `API_BASE_URL` | URL Go API (otomatis diisi Vercel dari binding) |
| `INTERNAL_API_KEY` | Harus sama dengan `api/.env` |

## API Endpoints

| Method | Path | Fungsi |
|---|---|---|
| `GET` | `/v1/me` | Validasi email (dipanggil Auth.js saat login) |
| `GET/PATCH` | `/v1/profile` | Profil pengguna (berat badan, satuan) |
| `GET` | `/v1/exercises?kind=gym\|bodyweight` | Daftar gerakan |
| `POST` | `/v1/calc/workout` | Hitung kalori/volume tanpa menyimpan |
| `POST` | `/v1/workouts` | Simpan sesi latihan |
| `GET` | `/v1/workouts?kind=` | Riwayat sesi |
| `GET/PUT/DELETE` | `/v1/workouts/:id` | Detail, edit, hapus sesi |
| `GET/POST` | `/v1/templates` | Daftar dan buat template |
| `GET/PUT/DELETE` | `/v1/templates/:id` | Detail, edit, hapus template |
| `POST` | `/v1/templates/:id/start` | Tandai template terakhir dipakai |
| `GET` | `/v1/progress` | Daftar gerakan yang punya data progres |
| `GET` | `/v1/progress/:exercise_id?range=4w\|12w\|all` | Data progres + proyeksi 1RM |
| `GET` | `/v1/recommendations` | Daftar rekomendasi (auto-generate jika stale) |
| `POST` | `/v1/recommendations/refresh` | Paksa regenerasi rekomendasi |
| `PATCH` | `/v1/recommendations/:id` | Simpan atau abaikan rekomendasi |
