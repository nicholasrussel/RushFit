// Package calc berisi semua hitungan RushFit sebagai fungsi murni:
// pace, pemilihan MET, kalori, dan volume. Tidak ada akses database di sini.
package calc

import "math"

// CompendiumVersion adalah versi Compendium of Physical Activities yang
// nilai MET-nya dipakai; disimpan di tiap sesi agar bisa dihitung ulang.
const CompendiumVersion = "2024"

// METRow adalah satu baris MET cardio. MinSpeedKmh adalah batas bawah
// kecepatan baris itu.
type METRow struct {
	Code        string
	MinSpeedKmh float64
	MET         float64
}

// Set adalah satu set latihan beban.
type Set struct {
	WeightKg float64
	Reps     int
}

// PaceSecPerKm = durasi / jarak, dibulatkan ke detik terdekat.
func PaceSecPerKm(durationSec int, distanceM int) (int, bool) {
	if durationSec <= 0 || distanceM <= 0 {
		return 0, false
	}
	return int(math.Round(float64(durationSec) / (float64(distanceM) / 1000))), true
}

// SpeedKmh mengembalikan kecepatan rata-rata sesi.
func SpeedKmh(durationSec int, distanceM int) (float64, bool) {
	if durationSec <= 0 || distanceM <= 0 {
		return 0, false
	}
	return (float64(distanceM) / 1000) / (float64(durationSec) / 3600), true
}

// SelectCardioMET memilih baris dengan batas bawah kecepatan tertinggi yang
// masih <= speedKmh. Bila kecepatan di bawah semua batas, baris paling lambat
// yang dipakai. Urutan rows bebas.
func SelectCardioMET(rows []METRow, speedKmh float64) (METRow, bool) {
	if len(rows) == 0 {
		return METRow{}, false
	}
	// Toleransi kecil supaya 10,0 mph yang tersimpan sebagai km/h tidak jatuh
	// ke baris di bawahnya karena pembulatan.
	const eps = 1e-6
	slowest := rows[0]
	var best METRow
	found := false
	for _, r := range rows {
		if r.MinSpeedKmh < slowest.MinSpeedKmh {
			slowest = r
		}
		if r.MinSpeedKmh <= speedKmh+eps && (!found || r.MinSpeedKmh > best.MinSpeedKmh) {
			best, found = r, true
		}
	}
	if !found {
		return slowest, true
	}
	return best, true
}

// Calories = MET × berat badan (kg) × durasi (jam).
func Calories(met, weightKg float64, durationSec int) float64 {
	if met <= 0 || weightKg <= 0 || durationSec <= 0 {
		return 0
	}
	return met * weightKg * float64(durationSec) / 3600
}

// Volume = Σ beban × repetisi.
func Volume(sets []Set) float64 {
	var v float64
	for _, s := range sets {
		v += s.WeightKg * float64(s.Reps)
	}
	return v
}

// WeightedMET adalah MET rata-rata sesi, berbobot menurut jumlah set tiap
// gerakan. mets[i] adalah MET gerakan ke-i, setCounts[i] jumlah set-nya.
func WeightedMET(mets []float64, setCounts []int) (float64, bool) {
	if len(mets) == 0 || len(mets) != len(setCounts) {
		return 0, false
	}
	var sum float64
	var n int
	for i, m := range mets {
		if setCounts[i] <= 0 {
			continue
		}
		sum += m * float64(setCounts[i])
		n += setCounts[i]
	}
	if n == 0 {
		return 0, false
	}
	return sum / float64(n), true
}

// SplitByVolume membagi kalori sesi ke tiap gerakan menurut volumenya.
// Bila volume sesi nol (mis. semua beban 0 kg), kalori dibagi rata.
func SplitByVolume(total float64, volumes []float64) []float64 {
	out := make([]float64, len(volumes))
	if len(volumes) == 0 {
		return out
	}
	var sum float64
	for _, v := range volumes {
		sum += v
	}
	for i, v := range volumes {
		if sum > 0 {
			out[i] = total * v / sum
		} else {
			out[i] = total / float64(len(volumes))
		}
	}
	return out
}

// Round membulatkan x ke sejumlah desimal.
func Round(x float64, decimals int) float64 {
	p := math.Pow(10, float64(decimals))
	return math.Round(x*p) / p
}

// Kode Compendium untuk latihan bodyweight.
const (
	BodyweightGeneralCode = "02056" // umum, MET 3,0
	BodyweightHighCode    = "02057" // intensitas tinggi, MET 6,5
)

// BodyweightHighRepsPerMin adalah ambang kepadatan latihan (total repetisi per
// menit durasi sesi) untuk memakai MET intensitas tinggi. Heuristik RushFit,
// bukan angka dari Compendium; setel di sini bila hasilnya terasa meleset.
const BodyweightHighRepsPerMin = 5.0

// EffectiveWeight = berat badan × faktor gerakan + beban tambahan.
func EffectiveWeight(bodyWeightKg, factor, extraKg float64) float64 {
	return bodyWeightKg*factor + extraKg
}

// RepsPerMinute adalah kepadatan latihan: total repetisi per menit durasi.
func RepsPerMinute(totalReps, durationSec int) (float64, bool) {
	if totalReps <= 0 || durationSec <= 0 {
		return 0, false
	}
	return float64(totalReps) / (float64(durationSec) / 60), true
}

// BodyweightCode memilih kode Compendium menurut kepadatan latihan. Tanpa
// durasi kepadatan tidak diketahui, sehingga tidak ada kode yang dipilih.
func BodyweightCode(totalReps, durationSec int) (string, bool) {
	density, ok := RepsPerMinute(totalReps, durationSec)
	if !ok {
		return "", false
	}
	if density >= BodyweightHighRepsPerMin {
		return BodyweightHighCode, true
	}
	return BodyweightGeneralCode, true
}
