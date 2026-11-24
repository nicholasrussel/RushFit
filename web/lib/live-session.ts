/** Tipe dan helper localStorage untuk sesi latihan langsung. */

export type LiveSet = {
  key: number;
  target_weight_kg: number | null;
  target_reps: number | null;
  actual_weight: string;
  actual_reps: string;
  done: boolean;
};

export type LiveExercise = {
  exercise_id: string;
  name: string;
  muscle_group: string;
  measure: "reps" | "seconds";
  use_extra: boolean;
  sets: LiveSet[];
};

export type LiveSession = {
  startedAt: string;
  kind: "gym" | "bodyweight";
  templateId?: string;
  templateName?: string;
  exercises: LiveExercise[];
};

export type DoneSession = LiveSession & { endedAt: string };

const LIVE_KEY = "rushfit:live";
const DONE_KEY = "rushfit:live_done";

export function saveLiveSession(s: LiveSession): void {
  try { localStorage.setItem(LIVE_KEY, JSON.stringify(s)); } catch { /* private window */ }
}

export function loadLiveSession(): LiveSession | null {
  try {
    const raw = localStorage.getItem(LIVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LiveSession;
  } catch { return null; }
}

export function clearLiveSession(): void {
  try { localStorage.removeItem(LIVE_KEY); } catch {}
}

export function saveDoneSession(s: DoneSession): void {
  try { localStorage.setItem(DONE_KEY, JSON.stringify(s)); } catch {}
}

export function loadDoneSession(): DoneSession | null {
  try {
    const raw = localStorage.getItem(DONE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DoneSession;
  } catch { return null; }
}

export function clearDoneSession(): void {
  try { localStorage.removeItem(DONE_KEY); } catch {}
}

/** Hitung total detik yang sudah berlalu dari startedAt hingga sekarang. */
export function elapsedSec(startedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}

/** Format detik → "HH:MM:SS". */
export function formatElapsed(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
