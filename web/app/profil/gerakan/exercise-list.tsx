"use client";

import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import type { ExerciseDetail } from "@/lib/exercise-types";
import { CODE_LABELS } from "@/lib/exercise-types";
import { CreateExerciseForm } from "./create-form";
import { DeleteExerciseButton } from "./delete-button";

type Kind = "gym" | "bodyweight";

export function ExerciseList({ exercises }: { exercises: ExerciseDetail[] }) {
  const [kind, setKind] = useState<Kind>("gym");
  const [showForm, setShowForm] = useState(false);

  const filtered = exercises.filter((e) => e.kind === kind);

  // Group by muscle_group
  const groups = new Map<string, ExerciseDetail[]>();
  for (const e of filtered) {
    const list = groups.get(e.muscle_group) ?? [];
    list.push(e);
    groups.set(e.muscle_group, list);
  }

  return (
    <div className="space-y-5">
      <Segmented<Kind>
        label="Jenis gerakan"
        options={[
          { value: "gym", label: "Gym" },
          { value: "bodyweight", label: "Bodyweight" },
        ]}
        value={kind}
        onChange={setKind}
      />

      {groups.size === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Belum ada gerakan.</p>
      ) : (
        [...groups.entries()].map(([group, list]) => (
          <div key={group}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{group}</p>
            <div className="rounded-2xl border border-line bg-card divide-y divide-line">
              {list.map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{e.name}</p>
                    <p className="text-xs text-muted">{CODE_LABELS[e.compendium_code] ?? e.compendium_code}</p>
                  </div>
                  {!e.is_builtin && (
                    <div className="shrink-0">
                      <DeleteExerciseButton id={e.id} name={e.name} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showForm ? (
        <CreateExerciseForm onCreated={() => setShowForm(false)} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-2xl border border-dashed border-line py-4 text-sm text-muted hover:bg-card transition-colors"
        >
          + Tambah gerakan
        </button>
      )}
    </div>
  );
}
