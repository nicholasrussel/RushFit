"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { LiveExercise, LiveSet } from "@/lib/live-session";
import type { Exercise } from "@/lib/types";

type Props = {
  exercise: LiveExercise;
  exRef: Exercise | undefined;
  kind: "gym" | "bodyweight";
  onUpdate: (fn: (e: LiveExercise) => LiveExercise) => void;
  onMarkDone: (setKey: number) => void;
  onRemove?: () => void;
};

const cell =
  "h-12 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-center text-base text-ink tabular-nums outline-none " +
  "placeholder:text-muted/60 focus:border-ink focus:ring-1 focus:ring-ink disabled:opacity-50";

function LiveSetRow({
  s,
  idx,
  showWeight,
  repsLabel,
  onWeightChange,
  onRepsChange,
  onMark,
  onRemove,
}: {
  s: LiveSet;
  idx: number;
  showWeight: boolean;
  repsLabel: string;
  onWeightChange: (v: string) => void;
  onRepsChange: (v: string) => void;
  onMark: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className={`flex items-center gap-2 ${s.done ? "opacity-60" : ""}`}>
      <span className="w-7 text-center text-base font-medium tabular-nums text-muted">{idx}</span>

      {showWeight && (
        <input
          className={cell}
          inputMode="decimal"
          aria-label={`Beban set ${idx}`}
          placeholder="0"
          value={s.actual_weight}
          onChange={(e) => onWeightChange(e.target.value)}
          disabled={s.done}
        />
      )}

      <input
        className={cell}
        inputMode="numeric"
        aria-label={`${repsLabel} set ${idx}`}
        placeholder="0"
        value={s.actual_reps}
        onChange={(e) => onRepsChange(e.target.value)}
        disabled={s.done}
      />

      {s.done ? (
        <div className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/15 text-green-600">
          ✓
        </div>
      ) : (
        <button
          type="button"
          onClick={onMark}
          aria-label={`Selesaikan set ${idx}`}
          className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-base text-muted hover:bg-accent hover:text-white hover:border-accent transition-colors"
        >
          ✓
        </button>
      )}
    </div>
  );
}

export function LiveExerciseCard({ exercise: ex, kind, onUpdate, onMarkDone, onRemove }: Props) {
  const timed = ex.measure === "seconds";
  const showWeight = !timed && (kind === "gym" || ex.use_extra);
  const repsLabel = timed ? "Detik" : "Rep";
  const weightLabel = kind === "gym" ? "Beban (kg)" : "Tambahan (kg)";

  const updateSet = (key: number, patch: Partial<LiveSet>) => {
    onUpdate((e) => ({
      ...e,
      sets: e.sets.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    }));
  };

  const addSet = () => {
    const last = ex.sets[ex.sets.length - 1];
    onUpdate((e) => ({
      ...e,
      sets: [
        ...e.sets,
        {
          key: Date.now(),
          target_weight_kg: null,
          target_reps: null,
          actual_weight: last?.actual_weight ?? "",
          actual_reps: last?.actual_reps ?? "",
          done: false,
        },
      ],
    }));
  };

  const done = ex.sets.filter((s) => s.done).length;
  const total = ex.sets.length;

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-ink">{ex.name}</p>
          <p className="text-xs text-muted">
            {ex.muscle_group ? `${ex.muscle_group} · ` : ""}
            {done}/{total} set selesai
          </p>
        </div>
        {onRemove && (
          <button onClick={onRemove} className="shrink-0 text-xs text-muted hover:text-danger">
            Hapus
          </button>
        )}
      </div>

      {kind === "bodyweight" && !timed && (
        <Switch
          label="Pakai beban tambahan"
          checked={ex.use_extra}
          onChange={(v) => onUpdate((e) => ({ ...e, use_extra: v }))}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="w-7 text-center">Set</span>
        {showWeight && <span className="flex-1 text-center">{weightLabel}</span>}
        <span className="flex-1 text-center">{repsLabel}</span>
        <span className="w-10" />
      </div>

      {ex.sets.map((s, i) => (
        <LiveSetRow
          key={s.key}
          s={s}
          idx={i + 1}
          showWeight={showWeight}
          repsLabel={repsLabel}
          onWeightChange={(w) => updateSet(s.key, { actual_weight: w })}
          onRepsChange={(r) => updateSet(s.key, { actual_reps: r })}
          onMark={() => onMarkDone(s.key)}
          onRemove={
            ex.sets.length > 1 && !s.done
              ? () => onUpdate((e) => ({ ...e, sets: e.sets.filter((x) => x.key !== s.key) }))
              : undefined
          }
        />
      ))}

      <Button variant="secondary" size="sm" onClick={addSet}>
        + Set
      </Button>
    </Card>
  );
}
