"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadLiveSession, clearLiveSession, elapsedSec, formatElapsed } from "@/lib/live-session";

export function SessionRecovery() {
  const router = useRouter();
  const [draft, setDraft] = useState<{
    kind: "gym" | "bodyweight";
    templateName?: string;
    exerciseCount: number;
    doneSetCount: number;
    elapsed: number;
    startedAt: string;
  } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [discarding, setDiscarding] = useState(false);

  useEffect(() => {
    const s = loadLiveSession();
    if (!s) return;
    setDraft({
      kind: s.kind,
      templateName: s.templateName,
      exerciseCount: s.exercises.length,
      doneSetCount: s.exercises.reduce((n, e) => n + e.sets.filter((st) => st.done).length, 0),
      elapsed: elapsedSec(s.startedAt),
      startedAt: s.startedAt,
    });
    setElapsed(elapsedSec(s.startedAt));
  }, []);

  // Keep elapsed ticking
  useEffect(() => {
    if (!draft) return;
    const id = setInterval(() => setElapsed(elapsedSec(draft.startedAt)), 1000);
    return () => clearInterval(id);
  }, [draft?.startedAt]);

  if (!draft) return null;

  const kind = draft.kind === "gym" ? "Gym" : "Bodyweight";
  const title = draft.templateName ?? kind;
  const sub = draft.exerciseCount > 0
    ? `${draft.exerciseCount} gerakan · ${draft.doneSetCount} set selesai`
    : "Belum ada gerakan";

  const resume = () => router.push("/langsung/sesi");

  const discard = () => {
    setDiscarding(true);
    clearLiveSession();
    setDraft(null);
    setDiscarding(false);
  };

  return (
    <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-accent">Sesi sedang berjalan</p>
          <p className="mt-0.5 font-medium text-ink truncate">{title}</p>
          <p className="text-xs text-muted">{sub}</p>
        </div>
        <p className="font-mono text-lg font-semibold tabular-nums text-accent shrink-0">
          {formatElapsed(elapsed)}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={resume}
          className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          Lanjutkan
        </button>
        <button
          onClick={discard}
          disabled={discarding}
          className="flex-1 rounded-xl border border-line bg-card py-2.5 text-sm font-medium text-muted hover:text-danger transition-colors disabled:opacity-50"
        >
          Buang draf
        </button>
      </div>
    </div>
  );
}
