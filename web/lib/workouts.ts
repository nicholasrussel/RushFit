import "server-only";
import { goFetch } from "@/lib/go-api";
import type { Workout } from "@/lib/types";

/** Ambil satu sesi. "missing" = tidak ada atau bukan milik pengguna; "error" = server bermasalah. */
export async function fetchWorkout(email: string, id: string): Promise<Workout | "missing" | "error"> {
  try {
    const res = await goFetch(`/v1/workouts/${encodeURIComponent(id)}`, email);
    if (res.status === 404) return "missing";
    if (!res.ok) return "error";
    return (await res.json()) as Workout;
  } catch {
    return "error";
  }
}
