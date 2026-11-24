"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { goFetch } from "@/lib/go-api";
import { currentEmail } from "@/lib/session";
import type { DoneSession, LiveSet, LiveExercise } from "@/lib/live-session";

type SetPayload = {
  weight_kg: number;
  reps: number;
  extra_weight_kg: number;
};

type ExPayload = {
  exercise_id: string;
  sets: SetPayload[];
};

function parseDecimal(s: string): number {
  return parseFloat(s.replace(",", ".")) || 0;
}

function buildSets(isGym: boolean, sets: LiveSet[]): SetPayload[] {
  return sets
    .filter((s) => s.done)
    .map((s) => {
      const reps = parseInt(s.actual_reps, 10) || 0;
      const weight = parseDecimal(s.actual_weight);
      if (isGym) {
        return { weight_kg: weight, reps, extra_weight_kg: 0 };
      }
      return { weight_kg: 0, reps, extra_weight_kg: weight };
    });
}

function buildExercises(kind: "gym" | "bodyweight", exercises: LiveExercise[]): ExPayload[] {
  return exercises
    .map((e) => ({
      exercise_id: e.exercise_id,
      sets: buildSets(kind === "gym" || e.use_extra, e.sets),
    }))
    .filter((e) => e.sets.length > 0);
}

export async function saveLiveWorkout(
  session: DoneSession,
): Promise<{ workoutId: string } | { error: string }> {
  const email = await currentEmail();
  if (!email) redirect("/login");

  const startedAt = new Date(session.startedAt);
  const endedAt = new Date(session.endedAt);
  const durationSec = Math.max(1, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));

  const body = {
    kind: session.kind,
    started_at: startedAt.toISOString(),
    duration_sec: durationSec,
    exercises: buildExercises(session.kind, session.exercises),
  };

  const res = await goFetch("/v1/workouts", email, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.error ?? "Gagal menyimpan sesi." };
  }

  const data = await res.json();
  revalidatePath("/riwayat");
  revalidatePath("/dashboard");
  return { workoutId: data.id };
}
