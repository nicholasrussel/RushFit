package calc

import (
	"math"
	"testing"
)

const mph = 1.609344

// Potongan tabel Running Compendium 2024 (batas bawah dalam km/h).
var runRows = []METRow{
	{"12026", 0, 3.3},
	{"12028", 4.0 * mph, 6.5},
	{"12029", 4.3 * mph, 7.8},
	{"12030", 5.0 * mph, 8.5},
	{"12045", 5.5 * mph, 9.0},
	{"12050", 6.0 * mph, 9.3},
	{"12060", 6.7 * mph, 10.5},
	{"12070", 7.0 * mph, 11.0},
}

func almost(a, b, tol float64) bool { return math.Abs(a-b) <= tol }

func TestPaceSecPerKm(t *testing.T) {
	// Contoh wireframe: 5,2 km dalam 31:20 → 6:02 /km.
	got, ok := PaceSecPerKm(31*60+20, 5200)
	if !ok || got != 362 {
		t.Fatalf("pace = %d, %v; want 362", got, ok)
	}
	if got, _ := PaceSecPerKm(3000, 10000); got != 300 {
		t.Fatalf("pace = %d; want 300", got)
	}
	for _, c := range [][2]int{{0, 5000}, {1800, 0}, {-1, 5000}} {
		if _, ok := PaceSecPerKm(c[0], c[1]); ok {
			t.Fatalf("PaceSecPerKm(%d, %d) should not be ok", c[0], c[1])
		}
	}
}

func TestSelectCardioMET(t *testing.T) {
	cases := []struct {
		name  string
		speed float64
		code  string
	}{
		{"contoh wireframe 9,96 km/h", 9.957, "12050"},
		{"tepat di batas 6 mph", 6.0 * mph, "12050"},
		{"sedikit di bawah 6 mph", 6.0*mph - 0.01, "12045"},
		{"celah antar baris (6,5 mph) ikut baris bawah", 6.5 * mph, "12050"},
		{"sangat lambat", 3.0, "12026"},
		{"lebih cepat dari baris terakhir", 30, "12070"},
	}
	for _, c := range cases {
		got, ok := SelectCardioMET(runRows, c.speed)
		if !ok || got.Code != c.code {
			t.Errorf("%s: code = %s; want %s", c.name, got.Code, c.code)
		}
	}

	// Urutan baris tidak boleh berpengaruh.
	rev := make([]METRow, len(runRows))
	for i, r := range runRows {
		rev[len(runRows)-1-i] = r
	}
	if got, _ := SelectCardioMET(rev, 9.957); got.Code != "12050" {
		t.Errorf("reversed: code = %s; want 12050", got.Code)
	}

	if _, ok := SelectCardioMET(nil, 10); ok {
		t.Error("empty rows should not be ok")
	}
}

func TestCalories(t *testing.T) {
	// Lari 31:20, 70 kg, MET 9,3 → ≈340 kkal.
	if got := Calories(9.3, 70, 31*60+20); !almost(got, 340, 0.5) {
		t.Errorf("cardio calories = %.2f; want ≈340", got)
	}
	// Gym 52 menit, 70 kg, MET 3,5 → ≈212 kkal.
	if got := Calories(3.5, 70, 52*60); !almost(got, 212.33, 0.01) {
		t.Errorf("gym calories = %.2f; want ≈212.33", got)
	}
	if Calories(3.5, 70, 0) != 0 || Calories(3.5, 0, 600) != 0 || Calories(0, 70, 600) != 0 {
		t.Error("missing input should give 0")
	}
}

func TestVolume(t *testing.T) {
	sets := []Set{{60, 10}, {60, 10}, {65, 8}}
	if got := Volume(sets); got != 1720 {
		t.Errorf("volume = %v; want 1720", got)
	}
	if Volume(nil) != 0 {
		t.Error("empty volume should be 0")
	}
}

func TestWeightedMET(t *testing.T) {
	// 3 set squat (5,0) + 3 set gerakan lain (3,5) → 4,25.
	got, ok := WeightedMET([]float64{5.0, 3.5}, []int{3, 3})
	if !ok || !almost(got, 4.25, 1e-9) {
		t.Errorf("weighted = %v, %v; want 4.25", got, ok)
	}
	// 1 set squat + 3 set lain → (5 + 10,5) / 4 = 3,875.
	got, _ = WeightedMET([]float64{5.0, 3.5}, []int{1, 3})
	if !almost(got, 3.875, 1e-9) {
		t.Errorf("weighted = %v; want 3.875", got)
	}
	if _, ok := WeightedMET(nil, nil); ok {
		t.Error("empty should not be ok")
	}
	if _, ok := WeightedMET([]float64{3.5}, []int{0}); ok {
		t.Error("zero sets should not be ok")
	}
	if _, ok := WeightedMET([]float64{3.5}, []int{1, 2}); ok {
		t.Error("length mismatch should not be ok")
	}
}

func TestSplitByVolume(t *testing.T) {
	// Contoh wireframe: 212 kkal, volume 1.720 dan 1.200 → ≈125 dan ≈87.
	got := SplitByVolume(212, []float64{1720, 1200})
	if !almost(got[0], 124.9, 0.1) || !almost(got[1], 87.1, 0.1) {
		t.Errorf("split = %v; want ≈[124.9 87.1]", got)
	}
	if !almost(got[0]+got[1], 212, 1e-9) {
		t.Errorf("split should sum to total, got %v", got[0]+got[1])
	}
	// Volume nol → bagi rata.
	got = SplitByVolume(100, []float64{0, 0})
	if got[0] != 50 || got[1] != 50 {
		t.Errorf("zero volume split = %v; want [50 50]", got)
	}
	if len(SplitByVolume(100, nil)) != 0 {
		t.Error("empty should give empty")
	}
}

func TestRound(t *testing.T) {
	if Round(212.3333, 1) != 212.3 || Round(3.875, 2) != 3.88 || Round(2.5, 0) != 3 {
		t.Error("round mismatch")
	}
}

func TestEffectiveWeight(t *testing.T) {
	// Push up, 70 kg, faktor 0,64, tanpa beban tambahan → 44,8 kg.
	if got := EffectiveWeight(70, 0.64, 0); !almost(got, 44.8, 1e-9) {
		t.Errorf("effective = %v; want 44.8", got)
	}
	// Pull up berbeban 10 kg, faktor 1,0 → 80 kg.
	if got := EffectiveWeight(70, 1.0, 10); !almost(got, 80, 1e-9) {
		t.Errorf("effective = %v; want 80", got)
	}
}

func TestBodyweightCode(t *testing.T) {
	// Contoh wireframe: push up 5 × 20 dalam 18 menit = 5,56 rep/menit →
	// intensitas tinggi (MET 6,5 × 70 kg × 0,3 jam ≈ 137 kkal).
	code, ok := BodyweightCode(100, 18*60)
	if !ok || code != BodyweightHighCode {
		t.Errorf("code = %s, %v; want %s", code, ok, BodyweightHighCode)
	}
	if got := Calories(6.5, 70, 18*60); !almost(got, 136.5, 0.01) {
		t.Errorf("calories = %.2f; want 136.5", got)
	}
	// Tepat di ambang: 5 rep/menit → tinggi.
	if code, _ := BodyweightCode(50, 10*60); code != BodyweightHighCode {
		t.Errorf("at threshold: code = %s; want high", code)
	}
	// Di bawah ambang: 60 rep dalam 30 menit = 2 rep/menit → umum.
	if code, _ := BodyweightCode(60, 30*60); code != BodyweightGeneralCode {
		t.Errorf("low density: code = %s; want general", code)
	}
	// Tanpa durasi atau tanpa repetisi: tidak ada kode.
	if _, ok := BodyweightCode(100, 0); ok {
		t.Error("no duration should not be ok")
	}
	if _, ok := BodyweightCode(0, 600); ok {
		t.Error("no reps should not be ok")
	}
}
