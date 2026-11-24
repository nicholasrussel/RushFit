export type ExerciseDetail = {
  id: string;
  name: string;
  muscle_group: string;
  kind: "gym" | "bodyweight";
  compendium_code: string;
  bodyweight_factor: number | null;
  measure: "reps" | "seconds";
  is_builtin: boolean;
};

/** Label singkat kode Compendium untuk ditampilkan di UI. */
export const CODE_LABELS: Record<string, string> = {
  "02052": "Squat/Deadlift · MET 5,0",
  "02054": "Beban umum · MET 3,5",
  "02056": "Bodyweight umum · MET 3,0",
  "02057": "Bodyweight intensitas tinggi · MET 6,5",
};

/** Kode yang bisa dipilih pengguna saat membuat gerakan kustom. */
export const GYM_CODES = ["02054", "02052"] as const;
export const BW_CODES = ["02056", "02057"] as const;
