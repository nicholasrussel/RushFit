"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { SetRow, SetRowHeader } from "@/components/ui/set-row";
import { parseDecimal } from "@/lib/format";
import type { Exercise } from "@/lib/types";
import type { Template, TemplateExercise, TemplateSet } from "@/lib/template-types";
import { createTemplate, updateTemplate } from "./actions";

type SetDraft = { key: number; weight: string; reps: string };
type ExDraft = { key: number; exerciseId: string; sets: SetDraft[] };

let nextKey = 1000;
const newKey = () => ++nextKey;

function initialDrafts(t?: Template): ExDraft[] {
  if (!t || t.exercises.length === 0) {
    return [{ key: newKey(), exerciseId: "", sets: [{ key: newKey(), weight: "", reps: "" }] }];
  }
  return t.exercises.map((e) => ({
    key: newKey(),
    exerciseId: e.exercise_id,
    sets: e.sets.map((s) => ({
      key: newKey(),
      weight: s.weight_kg != null ? String(s.weight_kg).replace(".", ",") : "",
      reps: String(s.reps),
    })),
  }));
}

function parseDrafts(
  kind: "gym" | "bodyweight",
  items: ExDraft[],
  byId: Map<string, Exercise>,
): TemplateExercise[] | null {
  const out: TemplateExercise[] = [];
  for (const it of items) {
    if (!it.exerciseId) return null;
    const ref = byId.get(it.exerciseId);
    const sets: TemplateSet[] = [];
    for (const s of it.sets) {
      const reps = parseDecimal(s.reps);
      if (reps === null || reps < 1 || !Number.isInteger(reps)) return null;
      const weight = s.weight.trim() !== "" ? parseDecimal(s.weight) : null;
      sets.push({ weight_kg: weight, reps });
    }
    out.push({
      exercise_id: it.exerciseId,
      name: ref?.name ?? it.exerciseId,
      measure: ref?.measure ?? "reps",
      sets,
    });
  }
  return out;
}

export function TemplateEditor({ initial }: { initial?: Template }) {
  const router = useRouter();
  const [kind, setKind] = useState<"gym" | "bodyweight">(initial?.kind ?? "gym");
  const [name, setName] = useState(initial?.name ?? "");
  const [items, setItems] = useState<ExDraft[]>(() => initialDrafts(initial));
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    fetch(`/api/go?path=/v1/exercises%3Fkind%3D${kind}`)
      .then((r) => r.json())
      .then((list: Exercise[]) => setExercises(list))
      .catch(() => {});
    // Reset exercise drafts when kind changes (only for new templates)
    if (!initial) {
      setItems([{ key: newKey(), exerciseId: "", sets: [{ key: newKey(), weight: "", reps: "" }] }]);
    }
  }, [kind]);

  const groups = useMemo(() => {
    const map = new Map<string, Exercise[]>();
    for (const e of exercises) {
      const list = map.get(e.muscle_group) ?? [];
      list.push(e);
      map.set(e.muscle_group, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [exercises]);

  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  const updateItem = (key: number, fn: (it: ExDraft) => ExDraft) =>
    setItems((list) => list.map((it) => (it.key === key ? fn(it) : it)));

  const chooseExercise = (key: number, exerciseId: string) => {
    const ref = byId.get(exerciseId);
    updateItem(key, (it) => {
      if (!ref?.last_reps || it.sets.some((s) => s.weight || s.reps)) return { ...it, exerciseId };
      return {
        ...it,
        exerciseId,
        sets: it.sets.map((s, i) =>
          i === 0
            ? {
                ...s,
                weight: ref.last_weight_kg ? String(ref.last_weight_kg).replace(".", ",") : "",
                reps: String(ref.last_reps),
              }
            : s,
        ),
      };
    });
  };

  const addSet = (key: number) => {
    const sk = newKey();
    updateItem(key, (it) => {
      const prev = it.sets[it.sets.length - 1];
      return { ...it, sets: [...it.sets, { key: sk, weight: prev?.weight ?? "", reps: prev?.reps ?? "" }] };
    });
  };

  const addExercise = () => {
    setItems((list) => [
      ...list,
      { key: newKey(), exerciseId: "", sets: [{ key: newKey(), weight: "", reps: "" }] },
    ]);
  };

  const submit = () => {
    if (!name.trim()) return setError("Nama template wajib diisi.");
    const exercises_out = parseDrafts(kind, items, byId);
    if (!exercises_out) return setError("Lengkapi semua gerakan dan angka repetisi.");
    if (exercises_out.length === 0) return setError("Tambahkan minimal satu gerakan.");
    setError(null);
    startSaving(async () => {
      const r = initial
        ? await updateTemplate(initial.id, { name: name.trim(), exercises: exercises_out })
        : await createTemplate({ name: name.trim(), kind, exercises: exercises_out });
      if ("error" in r) return setError(r.error);
      router.push("/template");
    });
  };

  const showWeight = kind === "gym";

  return (
    <div className="space-y-5">
      <Field label="Nama template" htmlFor="tmpl-name">
        <TextInput
          id="tmpl-name"
          placeholder="mis. Sesi Dorong A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />
      </Field>

      {!initial && (
        <Field label="Jenis latihan" htmlFor="tmpl-kind">
          <Select
            id="tmpl-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as "gym" | "bodyweight")}
          >
            <option value="gym">Gym / Beban</option>
            <option value="bodyweight">Bodyweight</option>
          </Select>
        </Field>
      )}

      {items.map((it, idx) => (
        <Card key={it.key} className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <Select
                aria-label={`Gerakan ${idx + 1}`}
                value={it.exerciseId}
                onChange={(e) => chooseExercise(it.key, e.target.value)}
              >
                <option value="" disabled>Pilih gerakan</option>
                {groups.map(([group, list]) => (
                  <optgroup key={group} label={group}>
                    {list.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
              {it.exerciseId && byId.get(it.exerciseId) && (
                <p className="mt-1 text-xs text-muted">
                  {byId.get(it.exerciseId)!.last_reps != null
                    ? `Terakhir: ${byId.get(it.exerciseId)!.last_reps} rep${showWeight && byId.get(it.exerciseId)!.last_weight_kg ? ` · ${byId.get(it.exerciseId)!.last_weight_kg} kg` : ""}`
                    : "Belum pernah dicatat."}
                </p>
              )}
            </div>
            {items.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-12 text-muted"
                onClick={() => setItems((list) => list.filter((x) => x.key !== it.key))}
              >
                Hapus
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <SetRowHeader
              showWeight={showWeight}
              weightLabel="Beban (kg)"
              repsLabel="Rep"
            />
            {it.sets.map((s, i) => (
              <SetRow
                key={s.key}
                index={i + 1}
                showWeight={showWeight}
                weight={s.weight}
                reps={s.reps}
                onWeightChange={(w) =>
                  updateItem(it.key, (x) => ({ ...x, sets: x.sets.map((y) => (y.key === s.key ? { ...y, weight: w } : y)) }))
                }
                onRepsChange={(r) =>
                  updateItem(it.key, (x) => ({ ...x, sets: x.sets.map((y) => (y.key === s.key ? { ...y, reps: r } : y)) }))
                }
                onRemove={
                  it.sets.length > 1
                    ? () => updateItem(it.key, (x) => ({ ...x, sets: x.sets.filter((y) => y.key !== s.key) }))
                    : undefined
                }
              />
            ))}
          </div>

          <Button variant="secondary" size="sm" onClick={() => addSet(it.key)}>
            + Tambah set
          </Button>
        </Card>
      ))}

      <Button variant="secondary" block onClick={addExercise}>
        + Tambah gerakan
      </Button>

      {error ? <Banner tone="error">{error}</Banner> : null}

      <Button block onClick={submit} disabled={saving}>
        {saving ? "Menyimpan…" : initial ? "Simpan perubahan" : "Buat template"}
      </Button>
    </div>
  );
}
