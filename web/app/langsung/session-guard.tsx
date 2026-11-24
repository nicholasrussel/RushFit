"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadLiveSession } from "@/lib/live-session";

/**
 * Bila ada sesi yang sedang berlangsung di localStorage, langsung redirect ke
 * halaman sesi aktif. Mencegah pengguna memulai sesi baru secara tidak sengaja.
 */
export function SessionGuard() {
  const router = useRouter();
  useEffect(() => {
    const s = loadLiveSession();
    if (s) router.replace("/langsung/sesi");
  }, [router]);
  return null;
}
