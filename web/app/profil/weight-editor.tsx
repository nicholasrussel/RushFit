"use client";

import { useState, useTransition } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { formatNumber, kgToUnit, parseDecimal, unitWeightToKg, type Unit } from "@/lib/format";
import { saveWeight } from "./actions";

export function WeightEditor({ initial, unit = "metric" }: { initial: number | null; unit?: Unit }) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const displayValue = initial != null ? kgToUnit(initial, unit) : null;
  const unitLabel = unit === "imperial" ? "lb" : "kg";

  const startEditing = () => {
    setInputValue(displayValue != null ? String(displayValue).replace(".", ",") : "");
    setError(null);
    setEditing(true);
  };

  const save = () => {
    const v = parseDecimal(inputValue);
    if (v === null || v <= 0) return setError(`Masukkan berat badan yang valid dalam ${unitLabel}.`);
    const kg = unitWeightToKg(v, unit);
    if (kg < 20 || kg > 400) return setError("Berat badan harus antara 20 dan 400 kg.");
    setError(null);
    startSaving(async () => {
      const r = await saveWeight(kg);
      if (r?.error) return setError(r.error);
      setEditing(false);
    });
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-2xl font-semibold text-ink tabular-nums">
          {displayValue != null ? formatNumber(displayValue, 1) : "–"}
        </span>
        <span className="text-sm text-muted">{unitLabel}</span>
        <button
          onClick={startEditing}
          className="ml-auto text-sm text-accent underline-offset-2 hover:underline"
        >
          Ubah
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TextInput
          inputMode="decimal"
          placeholder={unit === "imperial" ? "154" : "70"}
          unit={unitLabel}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          autoFocus
        />
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? "…" : "Simpan"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setError(null); }}>
          Batal
        </Button>
      </div>
      {error ? <Banner tone="error">{error}</Banner> : null}
    </div>
  );
}
