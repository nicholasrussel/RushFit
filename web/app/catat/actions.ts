"use server";

import { redirect } from "next/navigation";
import { goFetch } from "@/lib/go-api";
import { currentEmail } from "@/lib/session";
import type { CalcResult, Profile, Workout, WorkoutInput } from "@/lib/types";

const SERVER_DOWN = "Server belum bisa dihubungi. Coba lagi.";

async function call<T>(path: string, method: string, body: unknown): Promise<{ data: T } | { error: string }> {
  const email = await currentEmail();
  if (!email) return { error: "Sesi login berakhir. Muat ulang halaman." };
  try {
    const res = await goFetch(path, email, { method, body: JSON.stringify(body) });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      return { error: res.status === 400 && payload?.error ? payload.error : SERVER_DOWN };
    }
    return { data: (await res.json()) as T };
  } catch {
    return { error: SERVER_DOWN };
  }
}

/** Hitung pace, MET, dan kalori tanpa menyimpan. null bila input belum lengkap. */
export async function previewWorkout(input: WorkoutInput): Promise<CalcResult | null> {
  const r = await call<CalcResult>("/v1/calc/workout", "POST", input);
  return "data" in r ? r.data : null;
}

/** Simpan sesi diary. Berhasil → pindah ke layar "Tersimpan". */
export async function saveWorkout(input: WorkoutInput): Promise<{ error: string; needsWeight?: boolean }> {
  const r = await call<Workout>("/v1/workouts", "POST", input);
  if ("error" in r) {
    // Profil di server belum punya berat badan (mis. halaman dibuka sebelum profil berubah).
    if (r.error.startsWith("isi berat badan")) {
      return { error: "Isi berat badan pada kartu di atas dulu, lalu simpan lagi.", needsWeight: true };
    }
    return r;
  }
  redirect(`/catat/tersimpan/${r.data.id}`);
}

export async function saveWeight(weightKg: number): Promise<{ profile: Profile } | { error: string }> {
  const r = await call<Profile>("/v1/profile", "PATCH", { weight_kg: weightKg });
  return "error" in r ? r : { profile: r.data };
}

/** Ganti isi sesi yang sudah ada. Berhasil → kembali ke detail sesi. */
export async function updateWorkout(
  id: string,
  input: WorkoutInput,
): Promise<{ error: string; needsWeight?: boolean }> {
  const r = await call<Workout>(`/v1/workouts/${encodeURIComponent(id)}`, "PUT", input);
  if ("error" in r) return r;
  redirect(`/sesi/${r.data.id}`);
}

/** Hapus sesi. Berhasil → kembali ke riwayat. */
export async function deleteWorkout(id: string): Promise<{ error: string }> {
  const email = await currentEmail();
  if (!email) return { error: "Sesi login berakhir. Muat ulang halaman." };
  try {
    const res = await goFetch(`/v1/workouts/${encodeURIComponent(id)}`, email, { method: "DELETE" });
    // 404 berarti sudah terhapus; hasil akhirnya sama.
    if (!res.ok && res.status !== 404) return { error: SERVER_DOWN };
  } catch {
    return { error: SERVER_DOWN };
  }
  redirect("/riwayat");
}
