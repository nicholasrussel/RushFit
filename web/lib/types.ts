export type WorkoutKind = "cardio" | "gym" | "bodyweight";
export type CardioActivity = "run" | "walk" | "cycle" | "swim";

export const CARDIO_ACTIVITIES: { key: CardioActivity; label: string }[] = [
  { key: "run", label: "Lari" },
  { key: "walk", label: "Jalan kaki" },
  { key: "cycle", label: "Bersepeda" },
  { key: "swim", label: "Renang" },
];

export function activityLabel(key: string): string {
  return CARDIO_ACTIVITIES.find((a) => a.key === key)?.label ?? key;
}

export type Profile = { weight_kg: number | null; unit: string };

export type Exercise = {
  id: string;
  name: string;
  muscle_group: string;
  kind: "gym" | "bodyweight";
  bodyweight_factor: number | null;
  /** "seconds" untuk gerakan tahan (wall sit): kolom repetisi berisi detik. */
  measure: "reps" | "seconds";
  last_weight_kg: number | null;
  last_reps: number | null;
  last_extra_kg: number | null;
  last_sets: number | null;
};

/** Gym mengirim weight_kg; bodyweight mengirim extra_weight_kg (beban tambahan). */
export type SetInput = { reps: number; weight_kg?: number; extra_weight_kg?: number };

/** Set tersimpan. Untuk bodyweight, weight_kg adalah beban efektif. */
export type WorkoutSet = { weight_kg: number; reps: number; extra_weight_kg: number | null };

/** Kontrak POST /v1/workouts dan POST /v1/calc/workout di layanan Go. */
export type WorkoutInput = {
  /** Hanya untuk pratinjau saat mengedit: pakai berat badan snapshot sesi ini. */
  workout_id?: string;
  kind: WorkoutKind;
  started_at?: string;
  duration_sec?: number | null;
  notes?: string;
  cardio?: { activity: CardioActivity; distance_m: number };
  exercises?: { exercise_id: string; sets: SetInput[] }[];
};

export type CalcResult = {
  pace_sec_per_km: number | null;
  met: number | null;
  compendium_code: string | null;
  compendium_version: string;
  body_weight_kg: number | null;
  calories: number | null;
  volume_kg: number;
  exercises: { exercise_id: string; volume_kg: number; calories: number | null; set_weights_kg: number[] }[];
};

export type Workout = {
  id: string;
  kind: WorkoutKind;
  mode: string;
  started_at: string;
  duration_sec: number | null;
  notes: string;
  body_weight_kg: number | null;
  met: number | null;
  compendium_version: string | null;
  calories: number | null;
  volume_kg: number;
  cardio: { activity: CardioActivity; distance_m: number; pace_sec_per_km: number } | null;
  exercises: {
    exercise_id: string;
    name: string;
    measure: "reps" | "seconds";
    calories: number | null;
    volume_kg: number;
    sets: WorkoutSet[];
  }[];
};

/** Satu baris riwayat dari GET /v1/workouts. */
export type WorkoutSummary = {
  id: string;
  kind: WorkoutKind;
  started_at: string;
  duration_sec: number | null;
  calories: number | null;
  cardio: { activity: CardioActivity; distance_m: number; pace_sec_per_km: number } | null;
  exercise_names: string[];
  set_count: number;
  volume_kg: number;
};

/** Judul sesi: aktivitas cardio, atau nama gerakan ("Push up", "Bench press, Squat +2"). */
export function workoutTitle(w: { cardio: { activity: string } | null }, exerciseNames: string[]): string {
  if (w.cardio) return activityLabel(w.cardio.activity);
  if (exerciseNames.length <= 2) return exerciseNames.join(", ") || "Sesi";
  return `${exerciseNames.slice(0, 2).join(", ")} +${exerciseNames.length - 2}`;
}
