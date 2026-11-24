import "server-only";
import { goFetch } from "@/lib/go-api";
import type { ExerciseDetail } from "@/lib/exercise-types";

export type { ExerciseDetail };

export async function fetchAllExercises(email: string): Promise<ExerciseDetail[] | "error"> {
  try {
    const res = await goFetch("/v1/exercises/all", email);
    if (!res.ok) return "error";
    return (await res.json()) as ExerciseDetail[];
  } catch {
    return "error";
  }
}
