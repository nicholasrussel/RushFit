"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";
import {
  loadDoneSession,
  clearDoneSession,
  elapsedSec,
  formatElapsed,
  type DoneSession,
} from "@/lib/live-session";
import { saveLiveWorkout } from "../actions";

export default function SelesaiPage() {
  const router = useRouter();
  const [session, setSession] = useState<DoneSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);
  const [workoutId, setWorkoutId] = useState<string | null>(null);

  useEffect(() => {
    const s = loadDoneSession();
    if (!s) {
      router.replace("/langsung");
      return;
    }
    setSession(s);
  }, [router]);

  if (!session) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-paper">
        <p className="text-sm text-muted">Memuat…</p>
      </main>
    );
  }

  const durationSec = Math.floor(
    (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000,
  );

  const totalSets = session.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.done).length,
    0,
  );

  const kind = session.kind === "gym" ? "Gym" : "Bodyweight";

  const handleSave = () => {
    setError(null);
    startSaving(async () => {
      const r = await saveLiveWorkout(session);
      if ("error" in r) return setError(r.error);
      clearDoneSession();
      setSaved(true);
      setWorkoutId(r.workoutId);
    });
  };

  const handleDiscard = () => {
    clearDoneSession();
    router.push("/dashboard");
  };

  if (saved && workoutId) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-paper px-4">
        <div className="text-center space-y-2">
          <p className="text-4xl">🎉</p>
          <p className="text-xl font-semibold text-ink">Sesi tersimpan!</p>
          <p className="text-sm text-muted">
            {kind} · {formatElapsed(durationSec)} · {totalSets} set selesai
          </p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <Link
            href={`/sesi/${workoutId}`}
            className="block w-full rounded-2xl bg-accent py-3 text-center text-sm font-medium text-white hover:bg-accent/90 transition-colors"
          >
            Lihat detail sesi
          </Link>
          <Link
            href="/dashboard"
            className="block w-full rounded-2xl border border-line bg-card py-3 text-center text-sm font-medium text-ink hover:bg-card/80 transition-colors"
          >
            Kembali ke beranda
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-paper px-4 pb-10 pt-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <p className="text-3xl">💪</p>
          <p className="text-xl font-semibold text-ink">Latihan selesai!</p>
          {session.templateName && (
            <p className="text-sm text-muted">{session.templateName}</p>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-line bg-card p-3 text-center">
            <p className="text-xs text-muted">Durasi</p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums text-ink">
              {formatElapsed(durationSec)}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-3 text-center">
            <p className="text-xs text-muted">Gerakan</p>
            <p className="mt-1 text-base font-semibold text-ink">
              {session.exercises.length}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-3 text-center">
            <p className="text-xs text-muted">Set selesai</p>
            <p className="mt-1 text-base font-semibold text-ink">{totalSets}</p>
          </div>
        </div>

        {/* Exercise breakdown */}
        {session.exercises.length > 0 && (
          <div className="rounded-2xl border border-line bg-card p-4 space-y-2">
            {session.exercises.map((e, i) => {
              const doneSets = e.sets.filter((s) => s.done).length;
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-ink truncate">{e.name}</span>
                  <span className="ml-2 shrink-0 text-muted">{doneSets} set</span>
                </div>
              );
            })}
          </div>
        )}

        {error ? <Banner tone="error">{error}</Banner> : null}

        <Button block onClick={handleSave} disabled={saving}>
          {saving ? "Menyimpan…" : "Simpan ke riwayat"}
        </Button>

        <button
          onClick={handleDiscard}
          className="block w-full text-center text-sm text-muted hover:text-danger"
        >
          Buang dan keluar
        </button>
      </div>
    </main>
  );
}
