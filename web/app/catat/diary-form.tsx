"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextInput } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { formatWeightUnit, parseDecimal, unitWeightToKg, type Unit } from "@/lib/format";
import type { Exercise, Profile } from "@/lib/types";
import { saveWeight } from "./actions";
import { CardioForm } from "./cardio-form";
import { StrengthForm } from "./strength-form";

type Kind = "cardio" | "gym" | "bodyweight";

/** Kalori butuh berat badan; selama profil belum punya, minta di sini. */
function WeightPrompt({
  current,
  onSaved,
  onCancel,
  unit = "metric",
}: {
  current: number | null;
  onSaved: (weightKg: number) => void;
  onCancel?: () => void;
  unit?: Unit;
}) {
  const displayCurrent = current != null
    ? (unit === "imperial" ? parseFloat((current * 2.20462).toFixed(1)) : current)
    : null;
  const [value, setValue] = useState(displayCurrent === null ? "" : String(displayCurrent).replace(".", ","));
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const unitLabel = unit === "imperial" ? "lb" : "kg";

  const save = () => {
    const v = parseDecimal(value);
    if (v === null) return setError(`Isi berat badan dalam ${unitLabel}.`);
    const kg = unitWeightToKg(v, unit);
    startSaving(async () => {
      const r = await saveWeight(kg);
      if ("error" in r) return setError(r.error);
      if (r.profile.weight_kg != null) onSaved(r.profile.weight_kg);
    });
  };

  return (
    <Card className="space-y-3">
      <div>
        <p className="font-medium text-ink">{current === null ? "Berat badan belum diisi" : "Ubah berat badan"}</p>
        <p className="mt-0.5 text-sm text-muted">
          Dipakai untuk memperkirakan kalori. Tanpa ini, cardio dan gym tetap tersimpan tanpa kalori; bodyweight tidak bisa disimpan.
        </p>
      </div>
      <div className="flex gap-2">
        <TextInput
          aria-label={`Berat badan (${unitLabel})`}
          inputMode="decimal"
          placeholder={unit === "imperial" ? "154" : "70"}
          unit={unitLabel}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button onClick={save} disabled={saving}>
          {saving ? "…" : "Simpan"}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel}>
            Batal
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </Card>
  );
}

export function DiaryForm({
  initialKind,
  profile,
  gymExercises,
  bodyweightExercises,
}: {
  initialKind: Kind;
  profile: Profile;
  gymExercises: Exercise[];
  bodyweightExercises: Exercise[];
}) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [weightKg, setWeightKg] = useState(profile.weight_kg);
  const [editingWeight, setEditingWeight] = useState(false);
  const weightCard = useRef<HTMLDivElement>(null);
  const unit = (profile.unit as Unit) ?? "metric";

  // Server menolak karena profil belum punya berat badan: tampilkan kartunya.
  const askWeight = () => {
    setWeightKg(null);
    weightCard.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="space-y-5">
      <Segmented
        label="Jenis latihan"
        value={kind}
        onChange={setKind}
        options={[
          { value: "cardio", label: "Cardio" },
          { value: "gym", label: "Gym" },
          { value: "bodyweight", label: "Bodyweight" },
        ]}
      />

      <div ref={weightCard}>
        {weightKg === null || editingWeight ? (
          <WeightPrompt
            current={weightKg}
            unit={unit}
            onSaved={(kg) => {
              setWeightKg(kg);
              setEditingWeight(false);
            }}
            onCancel={weightKg === null ? undefined : () => setEditingWeight(false)}
          />
        ) : (
          <div className="flex items-center justify-between gap-3 text-sm text-muted">
            <span>
              Berat badan <span className="font-medium text-ink">{formatWeightUnit(weightKg, unit)}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => setEditingWeight(true)}>
              Ubah
            </Button>
          </div>
        )}
      </div>

      {/* Semuanya tetap terpasang supaya isian tidak hilang saat berpindah segmen. */}
      <div hidden={kind !== "cardio"}>
        <CardioForm weightKg={weightKg} unit={unit} />
      </div>
      <div hidden={kind !== "gym"}>
        <StrengthForm kind="gym" exercises={gymExercises} weightKg={weightKg} onWeightMissing={askWeight} unit={unit} />
      </div>
      <div hidden={kind !== "bodyweight"}>
        <StrengthForm kind="bodyweight" exercises={bodyweightExercises} weightKg={weightKg} onWeightMissing={askWeight} unit={unit} />
      </div>
    </div>
  );
}
