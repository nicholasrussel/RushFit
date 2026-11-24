"use client";

import { useState, useTransition } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/field";
import { CODE_LABELS, GYM_CODES, BW_CODES } from "@/lib/exercise-types";
import { createExercise } from "./actions";

const MUSCLE_GROUPS = ["Dada", "Punggung", "Bahu", "Kaki", "Lengan", "Perut", "Seluruh tubuh"];

export function CreateExerciseForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [customGroup, setCustomGroup] = useState("");
  const [kind, setKind] = useState<"gym" | "bodyweight">("gym");
  const [code, setCode] = useState<string>(GYM_CODES[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const codes = kind === "gym" ? GYM_CODES : BW_CODES;

  const handleKindChange = (k: "gym" | "bodyweight") => {
    setKind(k);
    setCode(k === "gym" ? GYM_CODES[0] : BW_CODES[0]);
  };

  const submit = () => {
    const group = muscleGroup === "__custom__" ? customGroup.trim() : muscleGroup;
    if (!name.trim()) return setError("Nama gerakan harus diisi.");
    if (!group) return setError("Kelompok otot harus diisi.");
    setError(null);
    startSaving(async () => {
      const r = await createExercise({
        name: name.trim(),
        muscle_group: group,
        kind,
        compendium_code: code,
      });
      if (r?.error) return setError(r.error);
      setName("");
      setMuscleGroup("");
      setCustomGroup("");
      onCreated();
    });
  };

  return (
    <div className="rounded-2xl border border-line bg-card p-5 space-y-4">
      <p className="font-medium text-ink">Tambah gerakan baru</p>

      <Field label="Nama gerakan" htmlFor="ex-name">
        <TextInput
          id="ex-name"
          placeholder="mis. Dumbbell lateral raise"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
        />
      </Field>

      <Field label="Kelompok otot" htmlFor="ex-group">
        <Select id="ex-group" value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)}>
          <option value="" disabled>Pilih kelompok otot</option>
          {MUSCLE_GROUPS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
          <option value="__custom__">Lainnya…</option>
        </Select>
      </Field>

      {muscleGroup === "__custom__" && (
        <Field label="Nama kelompok" htmlFor="ex-group-custom">
          <TextInput
            id="ex-group-custom"
            placeholder="mis. Leher"
            value={customGroup}
            onChange={(e) => setCustomGroup(e.target.value)}
            maxLength={50}
          />
        </Field>
      )}

      <Field label="Jenis" htmlFor="ex-kind">
        <Select id="ex-kind" value={kind} onChange={(e) => handleKindChange(e.target.value as "gym" | "bodyweight")}>
          <option value="gym">Gym (dengan beban)</option>
          <option value="bodyweight">Bodyweight</option>
        </Select>
      </Field>

      <Field label="Kategori MET (Compendium)" htmlFor="ex-code"
        hint="Menentukan estimasi kalori. Pilih yang paling mendekati gerakan ini.">
        <Select id="ex-code" value={code} onChange={(e) => setCode(e.target.value)}>
          {codes.map((c) => (
            <option key={c} value={c}>{CODE_LABELS[c]}</option>
          ))}
        </Select>
      </Field>

      {error ? <Banner tone="error">{error}</Banner> : null}

      <div className="flex gap-2">
        <Button block onClick={submit} disabled={saving}>
          {saving ? "Menyimpan…" : "Simpan gerakan"}
        </Button>
      </div>
    </div>
  );
}
