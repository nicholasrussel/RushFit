"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  saveLiveSession,
  loadLiveSession,
  clearLiveSession,
  elapsedSec,
  formatElapsed,
  type LiveSession,
  type LiveExercise,
  type LiveSet,
} from "@/lib/live-session";
import type { Exercise } from "@/lib/types";
import type { Template } from "@/lib/template-types";
import { saveLiveWorkout } from "../actions";
import { LiveExerciseCard } from "./exercise-card";
import { AddExercisePanel } from "./add-exercise";

type Phase = "loading" | "ready";

function buildLiveExercise(e: Exercise): LiveExercise {
  return {
    exercise_id: e.id,
    name: e.name,
    muscle_group: e.muscle_group,
    measure: e.measure,
    use_extra: false,
    sets: [
      {
        key: Date.now(),
        target_weight_kg: null,
        target_reps: null,
        actual_weight: "",
        actual_reps: "",
        done: false,
      },
    ],
  };
}

function buildLiveExerciseFromTemplate(
  ex: { exercise_id: string; name: string; measure: "reps" | "seconds"; sets: { weight_kg: number | null; reps: number }[] },
  exById: Map<string, Exercise>,
): LiveExercise {
  const ref = exById.get(ex.exercise_id);
  let key = Date.now();
  return {
    exercise_id: ex.exercise_id,
    name: ref?.name ?? ex.name,
    muscle_group: ref?.muscle_group ?? "",
    measure: ex.measure,
    use_extra: false,
    sets: ex.sets.map((s) => ({
      key: key++,
      target_weight_kg: s.weight_kg,
      target_reps: s.reps,
      actual_weight: s.weight_kg != null ? String(s.weight_kg).replace(".", ",") : "",
      actual_reps: String(s.reps),
      done: false,
    })),
  };
}

function LiveSessionInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [phase, setPhase] = useState<Phase>("loading");
  const [session, setSession] = useState<LiveSession | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [addingEx, setAddingEx] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [restTarget, setRestTarget] = useState<number | null>(null);
  const [restLeft, setRestLeft] = useState(0);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialise session and load exercises on mount
  useEffect(() => {
    const existing = loadLiveSession();
    const kind = (existing?.kind ?? sp.get("kind") ?? "gym") as "gym" | "bodyweight";

    // Load exercises for the kind
    fetch(`/api/go?path=/v1/exercises%3Fkind%3D${kind}`)
      .then((r) => r.json())
      .then((list: Exercise[]) => setExercises(list))
      .catch(() => {});

    if (existing) {
      setSession(existing);
      setPhase("ready");
      return;
    }

    const templateId = sp.get("templateId");

    if (templateId) {
      fetch(`/api/go?path=/v1/templates/${encodeURIComponent(templateId)}`)
        .then((r) => r.json())
        .then((t: Template) => {
          // We need exercises loaded first; re-fetch to build map
          fetch(`/api/go?path=/v1/exercises%3Fkind%3D${t.kind}`)
            .then((r) => r.json())
            .then((list: Exercise[]) => {
              setExercises(list);
              const byId = new Map(list.map((e) => [e.id, e]));
              const s: LiveSession = {
                startedAt: new Date().toISOString(),
                kind: t.kind,
                templateId: t.id,
                templateName: t.name,
                exercises: t.exercises.map((e) => buildLiveExerciseFromTemplate(e, byId)),
              };
              saveLiveSession(s);
              setSession(s);
              setPhase("ready");
            });
        })
        .catch(() => {
          const s: LiveSession = {
            startedAt: new Date().toISOString(),
            kind,
            exercises: [],
          };
          saveLiveSession(s);
          setSession(s);
          setPhase("ready");
        });
      return;
    }

    // No existing session and no params to start one — user navigated here stale
    if (!sp.get("kind") && !sp.get("templateId")) {
      router.replace("/langsung");
      return;
    }

    const s: LiveSession = {
      startedAt: new Date().toISOString(),
      kind,
      exercises: [],
    };
    saveLiveSession(s);
    setSession(s);
    setPhase("ready");
  }, [sp]);

  // Elapsed timer
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setElapsed(elapsedSec(session.startedAt)), 1000);
    setElapsed(elapsedSec(session.startedAt));
    return () => clearInterval(id);
  }, [session?.startedAt]);

  // Rest timer
  useEffect(() => {
    if (restTarget === null) return;
    setRestLeft(restTarget);
    restRef.current = setInterval(() => {
      setRestLeft((prev) => {
        if (prev <= 1) {
          clearInterval(restRef.current!);
          setRestTarget(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (restRef.current) clearInterval(restRef.current); };
  }, [restTarget]);

  const updateSession = useCallback((fn: (s: LiveSession) => LiveSession) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      saveLiveSession(next);
      return next;
    });
  }, []);

  const updateExercise = useCallback((idx: number, fn: (e: LiveExercise) => LiveExercise) => {
    updateSession((s) => ({
      ...s,
      exercises: s.exercises.map((e, i) => (i === idx ? fn(e) : e)),
    }));
  }, [updateSession]);

  const markDone = useCallback((exIdx: number, setKey: number) => {
    updateSession((s) => ({
      ...s,
      exercises: s.exercises.map((e, i) => {
        if (i !== exIdx) return e;
        return { ...e, sets: e.sets.map((st) => st.key === setKey ? { ...st, done: true } : st) };
      }),
    }));
    setRestTarget(90);
  }, [updateSession]);

  const finishSession = async () => {
    if (!session) return;
    const hasAnything = session.exercises.some((e) => e.sets.some((s) => s.done));
    if (!hasAnything) {
      setFinishError("Selesaikan minimal satu set terlebih dahulu.");
      return;
    }
    setFinishError(null);
    setSaving(true);
    const done = { ...session, endedAt: new Date().toISOString() };
    const r = await saveLiveWorkout(done);
    setSaving(false);
    if ("error" in r) {
      setFinishError(r.error);
      return;
    }
    clearLiveSession();
    router.push(`/sesi/${r.workoutId}`);
  };

  const discardSession = () => {
    clearLiveSession();
    router.push("/langsung");
  };

  if (phase === "loading" || !session) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-paper">
        <p className="text-sm text-muted">Memuat sesi…</p>
      </main>
    );
  }

  const kind = session.kind;

  // Group exercises by muscle_group for display — build a simple map of id → ex
  const exById = new Map(exercises.map((e) => [e.id, e]));

  return (
    <main className="min-h-dvh bg-paper pb-28">
      {/* Sticky header with timer */}
      <div className="sticky top-0 z-10 border-b border-line bg-paper px-4 py-3">
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <div>
            <p className="text-xs text-muted">
              {session.templateName ?? (kind === "gym" ? "Gym" : "Bodyweight")}
            </p>
            <p className="font-mono text-2xl font-semibold tabular-nums text-ink">
              {formatElapsed(elapsed)}
            </p>
          </div>
          <button
            onClick={discardSession}
            className="text-sm text-muted hover:text-danger"
          >
            Batalkan
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md space-y-4 px-4 pt-4">
        {/* Rest timer banner */}
        {restTarget !== null && (
          <div className="flex items-center justify-between rounded-2xl bg-accent/10 px-4 py-3">
            <p className="text-sm font-medium text-accent">Istirahat</p>
            <p className="font-mono text-lg font-semibold tabular-nums text-accent">
              {formatElapsed(restLeft)}
            </p>
            <button
              className="text-sm text-accent hover:underline"
              onClick={() => { clearInterval(restRef.current!); setRestTarget(null); }}
            >
              Lewati
            </button>
          </div>
        )}

        {session.exercises.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            Belum ada gerakan. Tambah di bawah.
          </p>
        ) : (
          session.exercises.map((ex, idx) => (
            <LiveExerciseCard
              key={`${ex.exercise_id}-${idx}`}
              exercise={ex}
              exRef={exById.get(ex.exercise_id)}
              kind={kind}
              onUpdate={(fn) => updateExercise(idx, fn)}
              onMarkDone={(setKey) => markDone(idx, setKey)}
              onRemove={
                session.exercises.length > 1
                  ? () => updateSession((s) => ({ ...s, exercises: s.exercises.filter((_, i) => i !== idx) }))
                  : undefined
              }
            />
          ))
        )}

        <Button variant="secondary" block onClick={() => setAddingEx(true)}>
          + Tambah gerakan
        </Button>

        {finishError ? <Banner tone="error">{finishError}</Banner> : null}

        <Button block onClick={finishSession} disabled={saving}>
          {saving ? "Menyimpan…" : "Selesai latihan"}
        </Button>
      </div>

      {addingEx && (
        <AddExercisePanel
          kind={kind}
          exercises={exercises}
          onAdd={(ex) => {
            updateSession((s) => ({ ...s, exercises: [...s.exercises, buildLiveExercise(ex)] }));
            setAddingEx(false);
          }}
          onClose={() => setAddingEx(false)}
        />
      )}
    </main>
  );
}

export default function LiveSessionPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-paper">
          <p className="text-sm text-muted">Memuat sesi…</p>
        </main>
      }
    >
      <LiveSessionInner />
    </Suspense>
  );
}
