export type TemplateSet = {
  weight_kg: number | null;
  reps: number;
};

export type TemplateExercise = {
  exercise_id: string;
  name: string;
  measure: "reps" | "seconds";
  sets: TemplateSet[];
};

export type Template = {
  id: string;
  name: string;
  kind: "gym" | "bodyweight";
  exercises: TemplateExercise[];
  exercise_count: number;
  set_count: number;
  last_used_at?: string;
  created_at: string;
};
