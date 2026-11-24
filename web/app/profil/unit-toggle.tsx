"use client";

import { useTransition } from "react";
import type { Unit } from "@/lib/format";
import { saveUnit } from "./actions";

export function UnitToggle({ initial }: { initial: Unit }) {
  const [pending, startTransition] = useTransition();
  const isImperial = initial === "imperial";

  const toggle = () => {
    const next: Unit = isImperial ? "metric" : "imperial";
    startTransition(async () => {
      await saveUnit(next);
    });
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-ink">{isImperial ? "lb · mi" : "kg · km"}</span>
      <button
        onClick={toggle}
        disabled={pending}
        aria-pressed={isImperial}
        aria-label="Ubah satuan"
        className={`relative h-7 w-14 rounded-full transition-colors ${
          isImperial ? "bg-accent" : "bg-ink/15"
        } disabled:opacity-50`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
            isImperial ? "left-8" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
