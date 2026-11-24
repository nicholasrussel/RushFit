"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { DurationInput } from "@/components/ui/duration-input";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { SetRow, SetRowHeader } from "@/components/ui/set-row";
import { Switch } from "@/components/ui/switch";
import { formatKcal, formatNumber, formatWeightUnit, kgToUnit, parseDecimal, toDateTimeLocal, unitWeightToKg, type Unit } from "@/lib/format";
import type { Exercise, SetInput, Workout, WorkoutInput } from "@/lib/types";
import { saveWorkout, updateWorkout } from "./actions";
import { usePreview } from "./use-preview";

type Kind = "gym" | "bodyweight";
type SetDraft = { key: number; weight: string; reps: string };
/** useExtra hanya dipakai bodyweight: kolom beban tambahan tampil atau tidak. */
type ExerciseDraft = { key: number; exerciseId: string; useExtra: boolean; sets: SetDraft[] };

const isBlank = (s: SetDraft) => s.weight.trim() === "" && s.reps.trim() === "";
const asText = (n: number) => String(n).replace(".", ",");

/** Ubah draf menjadi set yang valid, atau null bila ada yang belum terisi benar. */
function parseSets(kind: Kind, item: ExerciseDraft, unit: Unit = "metric"): SetInput[] | null {
  const out: SetInput[] = [];
  for (const s of item.sets) {
    const reps = parseDecimal(s.reps);
    if (reps === null || reps < 1 || !Number.isInteger(reps)) return null;
    if (kind === "gym") {
      const weight = parseDecimal(s.weight);
      if (weight === null || weight < 0) return null;
      out.push({ reps, weight_kg: unitWeightToKg(weight, unit) });
    } else {
      // Beban tambahan boleh kosong (= 0), tapi kalau diisi harus angka.
      const extra = item.useExtra && s.weight.trim() !== "" ? parseDecimal(s.weight) : 0;
      if (extra === null || extra < 0) return null;
      out.push({ reps, extra_weight_kg: extra != null ? unitWeightToKg(extra, unit) : extra });
    }
  }
  return out;
}

/** Input lengkap → payload; kalau belum, pesan tentang apa yang kurang. */
function buildExercises(
  kind: Kind,
  items: ExerciseDraft[],
  byId: Map<string, Exercise>,
  unit: Unit = "metric",
): { exercises: NonNullable<WorkoutInput["exercises"]> } | { problem: string } {
  const out = [];
  for (const it of items) {
    if (!it.exerciseId) return { problem: "Pilih gerakan terlebih dahulu." };
    const sets = parseSets(kind, it, unit);
    if (!sets) {
      const what = kind === "gym" ? "beban dan repetisi" : "repetisi";
      return { problem: `Lengkapi ${what} ${byId.get(it.exerciseId)?.name ?? "gerakan"}.` };
    }
    out.push({ exercise_id: it.exerciseId, sets });
  }
  return { exercises: out };
}

function lastText(kind: Kind, e: Exercise, unit: Unit = "metric"): string {
  if (e.last_reps == null) return "Belum pernah dicatat.";
  if (e.measure === "seconds") return `Terakhir: ${e.last_sets ?? 1} × ${e.last_reps} dtk`;
  if (kind === "gym") return `Terakhir: ${formatWeightUnit(e.last_weight_kg ?? 0, unit)} × ${e.last_reps}`;
  const extra = e.last_extra_kg ? ` · +${formatWeightUnit(e.last_extra_kg, unit)}` : "";
  return `Terakhir: ${e.last_sets ?? 1} × ${e.last_reps}${extra}`;
}

/** Draf awal: satu gerakan kosong, atau isi sesi yang sedang diedit. */
function initialItems(kind: Kind, unit: Unit = "metric", initial?: Workout): ExerciseDraft[] {
  if (!initial || initial.exercises.length === 0) {
    return [{ key: 0, exerciseId: "", useExtra: false, sets: [{ key: 1, weight: "", reps: "" }] }];
  }
  let key = 0;
  return initial.exercises.map((e) => ({
    key: key++,
    exerciseId: e.exercise_id,
    useExtra: kind === "bodyweight" && e.sets.some((s) => !!s.extra_weight_kg),
    sets: e.sets.map((s) => ({
      key: key++,
      weight: kind === "gym"
        ? asText(kgToUnit(s.weight_kg, unit))
        : s.extra_weight_kg ? asText(kgToUnit(s.extra_weight_kg, unit)) : "",
      reps: String(s.reps),
    })),
  }));
}

/**
 * Form diary gym dan bodyweight: banyak gerakan, tiap gerakan banyak set.
 * initial diisi saat mengedit sesi yang sudah ada.
 */
export function StrengthForm({
  kind,
  exercises,
  weightKg,
  onWeightMissing,
  initial,
  unit = "metric",
}: {
  kind: Kind;
  exercises: Exercise[];
  weightKg: number | null;
  /** Dipanggil bila server menolak karena profil belum punya berat badan. */
  onWeightMissing?: () => void;
  initial?: Workout;
  unit?: Unit;
}) {
  // Kunci draf awal bernomor kecil; kunci baru mulai jauh di atasnya supaya tidak bertabrakan.
  const nextKey = useRef(100_000);
  const newKey = () => nextKey.current++;

  const [items, setItems] = useState<ExerciseDraft[]>(() => initialItems(kind, unit, initial));
  const [startedAt, setStartedAt] = useState(() => toDateTimeLocal(initial ? new Date(initial.started_at) : new Date()));
  const [durationSec, setDurationSec] = useState<number | null>(initial?.duration_sec ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const groups = useMemo(() => {
    const map = new Map<string, Exercise[]>();
    for (const e of exercises) map.set(e.muscle_group, [...(map.get(e.muscle_group) ?? []), e]);
    return [...map.entries()];
  }, [exercises]);

  const updateItem = (key: number, fn: (item: ExerciseDraft) => ExerciseDraft) =>
    setItems((list) => list.map((it) => (it.key === key ? fn(it) : it)));

  const chooseExercise = (key: number, exerciseId: string) => {
    const last = byId.get(exerciseId);
    updateItem(key, (it) => {
      // Set yang masih kosong diisi dengan angka terakhir gerakan itu sebagai titik awal.
      if (last?.last_reps == null || !it.sets.every(isBlank)) return { ...it, exerciseId };
      const lastWeightKg = kind === "gym" ? last.last_weight_kg : last.last_extra_kg;
      const weight = lastWeightKg ? asText(kgToUnit(lastWeightKg, unit)) : kind === "gym" ? "0" : "";
      return {
        ...it,
        exerciseId,
        useExtra: kind === "bodyweight" && !!last.last_extra_kg,
        sets: it.sets.map((s, i) => (i === 0 ? { ...s, weight, reps: String(last.last_reps) } : s)),
      };
    });
  };

  const addSet = (key: number, copyLast: boolean) => {
    const setKey = newKey();
    updateItem(key, (it) => {
      const prev = it.sets[it.sets.length - 1];
      return {
        ...it,
        sets: [...it.sets, { key: setKey, weight: copyLast ? prev.weight : "", reps: copyLast ? prev.reps : "" }],
      };
    });
  };

  const addExercise = () => {
    const key = newKey();
    const setKey = newKey();
    setItems((list) => [
      ...list,
      { key, exerciseId: "", useExtra: false, sets: [{ key: setKey, weight: "", reps: "" }] },
    ]);
  };

  const built = buildExercises(kind, items, byId, unit);
  // Bodyweight tanpa berat badan profil tidak bisa dihitung, jadi tidak dipratinjau.
  const canCalc = kind === "gym" || weightKg !== null;
  const calcInput: WorkoutInput | null =
    canCalc && "exercises" in built ? { workout_id: initial?.id, kind, duration_sec: durationSec, exercises: built.exercises }
      : null;
  const preview = usePreview(calcInput, weightKg);

  const submit = () => {
    if (!canCalc) {
      onWeightMissing?.();
      return setError("Isi berat badan pada kartu di atas dulu, lalu simpan lagi.");
    }
    if ("problem" in built) return setError(built.problem);
    const start = new Date(startedAt);
    if (Number.isNaN(start.getTime())) return setError("Waktu mulai belum diisi.");
    setError(null);
    startSaving(async () => {
      const input: WorkoutInput = {
        kind,
        started_at: start.toISOString(),
        duration_sec: durationSec,
        notes,
        exercises: built.exercises,
      };
      const r = initial ? await updateWorkout(initial.id, input) : await saveWorkout(input);
      if (r?.needsWeight) onWeightMissing?.();
      if (r?.error) setError(r.error);
    });
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {items.map((it, idx) => {
        const chosen = byId.get(it.exerciseId);
        const timed = chosen?.measure === "seconds";
        const showWeight = !timed && (kind === "gym" || it.useExtra);
        const effective = timed ? null : preview?.exercises[idx]?.set_weights_kg[0];
        return (
          <Card key={it.key} className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Select
                  aria-label={`Gerakan ${idx + 1}`}
                  value={it.exerciseId}
                  onChange={(e) => chooseExercise(it.key, e.target.value)}
                >
                  <option value="" disabled>
                    Pilih gerakan
                  </option>
                  {groups.map(([group, list]) => (
                    <optgroup key={group} label={group}>
                      {list.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
                {chosen ? <p className="mt-1.5 text-sm text-muted">{lastText(kind, chosen, unit)}</p> : null}
              </div>
              {items.length > 1 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-12 text-muted"
                  aria-label={`Hapus gerakan ${idx + 1}`}
                  onClick={() => setItems((list) => list.filter((x) => x.key !== it.key))}
                >
                  Hapus
                </Button>
              ) : null}
            </div>

            {kind === "bodyweight" && !timed ? (
              <Switch
                label="Pakai beban tambahan"
                checked={it.useExtra}
                onChange={(useExtra) => updateItem(it.key, (x) => ({ ...x, useExtra }))}
              />
            ) : null}

            <div className="space-y-2">
              <SetRowHeader
                showWeight={showWeight}
                weightLabel={kind === "gym"
                  ? `Beban (${unit === "imperial" ? "lb" : "kg"})`
                  : `Tambahan (${unit === "imperial" ? "lb" : "kg"})`}
                repsLabel={timed ? "Detik" : "Rep"}
              />
              {it.sets.map((s, i) => (
                <SetRow
                  key={s.key}
                  index={i + 1}
                  showWeight={showWeight}
                  weight={s.weight}
                  reps={s.reps}
                  onWeightChange={(weight) =>
                    updateItem(it.key, (x) => ({
                      ...x,
                      sets: x.sets.map((y) => (y.key === s.key ? { ...y, weight } : y)),
                    }))
                  }
                  onRepsChange={(reps) =>
                    updateItem(it.key, (x) => ({
                      ...x,
                      sets: x.sets.map((y) => (y.key === s.key ? { ...y, reps } : y)),
                    }))
                  }
                  onRemove={
                    it.sets.length > 1
                      ? () => updateItem(it.key, (x) => ({ ...x, sets: x.sets.filter((y) => y.key !== s.key) }))
                      : undefined
                  }
                />
              ))}
            </div>

            {kind === "bodyweight" && effective != null ? (
              <p className="text-sm text-muted">Beban efektif set 1: {formatWeightUnit(effective, unit)}</p>
            ) : null}

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => addSet(it.key, false)}>
                + Tambah set
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => addSet(it.key, true)}>
                Salin set
              </Button>
            </div>
          </Card>
        );
      })}

      <Button variant="secondary" block onClick={addExercise}>
        + Tambah gerakan
      </Button>

      <Field label="Mulai" htmlFor={`mulai-${kind}`}>
        <TextInput
          id={`mulai-${kind}`}
          type="datetime-local"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
          suppressHydrationWarning
        />
      </Field>

      <Field label="Durasi (opsional)" hint="Tanpa durasi, kalori tidak ditampilkan.">
        <DurationInput defaultValue={durationSec} onChange={setDurationSec} />
      </Field>

      <div className="grid grid-cols-2 gap-3" aria-live="polite">
        <StatCard label="Volume" value={preview ? formatWeightUnit(preview.volume_kg, unit) : "–"} />
        <StatCard label="Kalori" value={preview?.calories != null ? formatKcal(preview.calories) : "–"} accent />
      </div>

      {kind === "bodyweight" ? (
        <p className="text-sm text-muted">
          Beban efektif dihitung dari berat badan di profil. Volume adalah total beban yang terangkat: beban efektif ×
          repetisi, dijumlah dari semua set.
        </p>
      ) : null}

      <Field label="Catatan (opsional)" htmlFor={`catatan-${kind}`}>
        <TextArea
          id={`catatan-${kind}`}
          rows={2}
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      {error ? <Banner tone="error">{error}</Banner> : null}

      <Button type="submit" block disabled={saving}>
        {saving ? "Menyimpan…" : initial ? "Simpan perubahan" : "Simpan"}
      </Button>
    </form>
  );
}
