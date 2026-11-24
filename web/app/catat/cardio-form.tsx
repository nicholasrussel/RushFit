"use client";

import { useState, useTransition } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/card";
import { DurationInput } from "@/components/ui/duration-input";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { distanceInputToM, formatKcal, formatPaceUnit, mToDistanceInput, parseDecimal, toDateTimeLocal, type Unit } from "@/lib/format";
import { CARDIO_ACTIVITIES, type CardioActivity, type Workout, type WorkoutInput } from "@/lib/types";
import { saveWorkout, updateWorkout } from "./actions";
import { usePreview } from "./use-preview";

/** initial diisi saat mengedit sesi yang sudah ada; tanpa itu form mencatat sesi baru. */
export function CardioForm({ weightKg, initial, unit = "metric" }: { weightKg: number | null; initial?: Workout; unit?: Unit }) {
  const [activity, setActivity] = useState<CardioActivity>(initial?.cardio?.activity ?? "run");
  const [startedAt, setStartedAt] = useState(() => toDateTimeLocal(initial ? new Date(initial.started_at) : new Date()));
  const [durationSec, setDurationSec] = useState<number | null>(initial?.duration_sec ?? null);
  const [distance, setDistance] = useState(
    initial?.cardio ? mToDistanceInput(initial.cardio.distance_m, unit) : "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const userValue = parseDecimal(distance);
  const distanceM = userValue && userValue > 0 ? distanceInputToM(userValue, unit) : null;
  const complete = durationSec !== null && distanceM !== null;

  const calcInput: WorkoutInput | null = complete
    ? { workout_id: initial?.id, kind: "cardio", duration_sec: durationSec, cardio: { activity, distance_m: distanceM } }
    : null;
  const preview = usePreview(calcInput, weightKg);

  const submit = () => {
    if (durationSec === null) return setError("Durasi wajib diisi untuk cardio.");
    if (distanceM === null) return setError("Jarak wajib diisi untuk cardio.");
    const start = new Date(startedAt);
    if (Number.isNaN(start.getTime())) return setError("Waktu mulai belum diisi.");
    setError(null);
    startSaving(async () => {
      const input: WorkoutInput = {
        kind: "cardio",
        started_at: start.toISOString(),
        duration_sec: durationSec,
        notes,
        cardio: { activity, distance_m: distanceM },
      };
      const r = initial ? await updateWorkout(initial.id, input) : await saveWorkout(input);
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
      <Field label="Aktivitas" htmlFor="aktivitas">
        <Select id="aktivitas" value={activity} onChange={(e) => setActivity(e.target.value as CardioActivity)}>
          {CARDIO_ACTIVITIES.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Mulai" htmlFor="mulai-cardio">
        <TextInput
          id="mulai-cardio"
          type="datetime-local"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
          suppressHydrationWarning
        />
      </Field>

      <Field label="Durasi (wajib)">
        <DurationInput defaultValue={durationSec} onChange={setDurationSec} />
      </Field>

      <Field label="Jarak" htmlFor="jarak">
        <TextInput
          id="jarak"
          inputMode="decimal"
          placeholder="0"
          unit={unit === "imperial" ? "mi" : "km"}
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3" aria-live="polite">
        <StatCard label="Pace" value={preview?.pace_sec_per_km ? formatPaceUnit(preview.pace_sec_per_km, unit) : "–"} />
        <StatCard label="Kalori" value={preview?.calories != null ? formatKcal(preview.calories) : "–"} accent />
      </div>

      <Field label="Catatan (opsional)" htmlFor="catatan-cardio">
        <TextArea id="catatan-cardio" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {error ? <Banner tone="error">{error}</Banner> : null}

      <Button type="submit" block disabled={saving}>
        {saving ? "Menyimpan…" : initial ? "Simpan perubahan" : "Simpan"}
      </Button>
    </form>
  );
}
