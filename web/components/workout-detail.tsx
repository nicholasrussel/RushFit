import { Card, StatCard } from "@/components/ui/card";
import { formatDistance, formatDuration, formatKcal, formatNumber, formatPaceUnit, formatWeightUnit, type Unit } from "@/lib/format";
import type { Workout, WorkoutSet } from "@/lib/types";

/** Gym: "60 kg × 10". Bodyweight: "20 rep" atau "8 rep +10 kg". Tahan: "45 dtk". */
function setText(kind: Workout["kind"], s: WorkoutSet, measure: string, unit: Unit): string {
  if (measure === "seconds") return `${s.reps} dtk`;
  if (kind !== "bodyweight") return `${formatWeightUnit(s.weight_kg, unit)} × ${s.reps}`;
  return s.extra_weight_kg
    ? `${s.reps} rep +${formatWeightUnit(s.extra_weight_kg, unit)}`
    : `${s.reps} rep`;
}

/** Empat kartu hasil: jarak/durasi/pace/kalori atau volume/set/durasi/kalori. */
export function WorkoutStats({ w, unit = "metric" }: { w: Workout; unit?: Unit }) {
  const kcal = w.calories != null ? formatKcal(w.calories) : "–";
  const duration = w.duration_sec ? formatDuration(w.duration_sec) : "–";
  const setCount = w.exercises.reduce((n, e) => n + e.sets.length, 0);
  return (
    <div className="grid grid-cols-2 gap-3">
      {w.cardio ? (
        <>
          <StatCard label="Jarak" value={formatDistance(w.cardio.distance_m, unit)} />
          <StatCard label="Durasi" value={duration} />
          <StatCard label="Pace" value={formatPaceUnit(w.cardio.pace_sec_per_km, unit)} />
        </>
      ) : (
        <>
          <StatCard label="Volume" value={formatWeightUnit(w.volume_kg, unit)} />
          <StatCard label="Set" value={String(setCount)} />
          <StatCard label="Durasi" value={duration} />
        </>
      )}
      <StatCard label="Kalori" value={kcal} accent />
    </div>
  );
}

/** Penjelasan asal angka kalori: MET, berat badan, durasi, dan cara MET dipilih. */
export function CalorieFormula({ w }: { w: Workout }) {
  if (w.calories == null) {
    const reason =
      w.duration_sec == null
        ? "Durasi tidak diisi, jadi kalori tidak dihitung."
        : "Berat badan belum diisi saat sesi ini dicatat, jadi kalori tidak dihitung.";
    return <p className="text-sm text-muted">{reason}</p>;
  }
  return (
    <div className="text-sm text-muted">
      <p>
        Estimasi: MET {formatNumber(w.met ?? 0, 2)} × {formatNumber(w.body_weight_kg ?? 0, 1)} kg ×{" "}
        {formatNumber((w.duration_sec ?? 0) / 3600, 2)} jam. MET dipilih otomatis.
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer font-medium text-ink underline underline-offset-4">Cara menghitung</summary>
        <p className="mt-2">Kalori adalah estimasi dari MET aktivitas × berat badan × durasi.</p>
        <p className="mt-1">
          MET diambil dari Compendium of Physical Activities {w.compendium_version}
          {w.kind === "cardio"
            ? " menurut aktivitas dan kecepatan rata-rata."
            : w.kind === "gym"
              ? ", dirata-rata menurut jumlah set tiap gerakan."
              : " menurut kepadatan latihan (total repetisi per menit)."}{" "}
          Berat badan adalah yang tersimpan saat sesi dicatat.
        </p>
      </details>
    </div>
  );
}

/** Daftar gerakan dengan set, volume, dan kalori per gerakan. */
export function ExerciseList({ w, unit = "metric" }: { w: Workout; unit?: Unit }) {
  return (
    <>
      {w.exercises.map((e, i) => (
        <Card key={i}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-medium text-ink">{e.name}</p>
            {e.calories != null ? <p className="text-sm text-accent">{formatKcal(e.calories)}</p> : null}
          </div>
          <p className="mt-1 text-sm text-muted tabular-nums">
            {e.sets.map((s) => setText(w.kind, s, e.measure, unit)).join("  ·  ")}
          </p>
          <p className="mt-1 text-sm text-muted">
            {w.kind === "bodyweight" && e.measure !== "seconds" && e.sets[0]
              ? `Beban efektif ${formatWeightUnit(e.sets[0].weight_kg, unit)} · `
              : ""}
            {e.measure === "seconds"
              ? "Gerakan tahan, tidak dihitung ke volume"
              : `Volume ${formatWeightUnit(e.volume_kg, unit)}`}
          </p>
        </Card>
      ))}
    </>
  );
}
