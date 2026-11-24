export type ProgressPoint = {
  date: string;
  started_at: string;
  orm1_est: number;
  volume_kg: number;
};

export type Projection = {
  orm1_kg: number;
  in_weeks: number;
};

export type ProgressResult = {
  exercise_id: string;
  exercise_name: string;
  kind: "gym" | "bodyweight";
  points: ProgressPoint[];
  current_orm1?: number;
  week_volume_kg?: number;
  projection?: Projection | null;
};

export type ProgressExercise = {
  id: string;
  name: string;
  muscle_group: string;
  kind: "gym" | "bodyweight";
  set_count: number;
};
