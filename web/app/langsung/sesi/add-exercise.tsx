"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import type { Exercise } from "@/lib/types";

type Props = {
  kind: "gym" | "bodyweight";
  exercises: Exercise[];
  onAdd: (e: Exercise) => void;
  onClose: () => void;
};

export function AddExercisePanel({ kind, exercises, onAdd, onClose }: Props) {
  const [exerciseId, setExerciseId] = useState("");
  const [error, setError] = useState("");

  const groups = useMemo(() => {
    const map = new Map<string, Exercise[]>();
    for (const e of exercises) {
      const list = map.get(e.muscle_group) ?? [];
      list.push(e);
      map.set(e.muscle_group, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [exercises]);

  const submit = () => {
    if (!exerciseId) return setError("Pilih gerakan terlebih dahulu.");
    const ex = exercises.find((e) => e.id === exerciseId);
    if (!ex) return setError("Gerakan tidak ditemukan.");
    setError("");
    onAdd(ex);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-ink/40">
      <div className="rounded-t-3xl bg-paper px-4 pb-8 pt-5 space-y-4 max-h-[70dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-ink">Tambah gerakan</p>
          <button onClick={onClose} className="text-sm text-muted">Tutup</button>
        </div>

        <Field label="Gerakan" htmlFor="add-ex-select">
          {exercises.length === 0 ? (
            <p className="text-sm text-muted py-2">Memuat daftar gerakan…</p>
          ) : (
            <Select
              id="add-ex-select"
              value={exerciseId}
              onChange={(e) => setExerciseId(e.target.value)}
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
          )}
        </Field>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <Button block onClick={submit} disabled={!exerciseId}>
          Tambahkan
        </Button>
      </div>
    </div>
  );
}
