"use client";

import { useEffect, useState } from "react";
import type { CalcResult, WorkoutInput } from "@/lib/types";
import { previewWorkout } from "./actions";

/**
 * Hasil hitung dari server untuk input yang sedang diketik. input null berarti
 * form belum lengkap. refreshKey dipakai untuk menghitung ulang setelah berat
 * badan profil berubah.
 */
export function usePreview(input: WorkoutInput | null, refreshKey: unknown = null): CalcResult | null {
  const key = input ? JSON.stringify([input, refreshKey]) : null;
  const [result, setResult] = useState<{ key: string; data: CalcResult | null } | null>(null);

  useEffect(() => {
    if (!key) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const [parsed] = JSON.parse(key) as [WorkoutInput];
      const data = await previewWorkout(parsed).catch(() => null);
      if (!stale) setResult({ key, data });
    }, 350);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [key]);

  // Selama menunggu hitungan baru, hasil sebelumnya tetap tampil agar tidak berkedip.
  return key ? (result?.data ?? null) : null;
}
