"use client";

import { useEffect, useRef, useState } from "react";
import { Chip } from "./chip";

const ITEM_H = 44;
const SHORTCUTS_MIN = [15, 30, 45, 60];

function toParts(totalSec: number | null): [number, number, number] {
  if (!totalSec || totalSec <= 0) return [0, 0, 0];
  return [Math.floor(totalSec / 3600), Math.floor((totalSec % 3600) / 60), totalSec % 60];
}

/** Satu kolom roda drum (jam / mnt / dtk). */
function DrumColumn({
  max,
  value,
  onChange,
  label,
}: {
  max: number;
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Tracks the last value we emitted so we can distinguish internal vs external changes.
  const lastEmitted = useRef(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set initial scroll position without animation.
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = value * ITEM_H;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On external value change (e.g. shortcut chip), scroll to that position.
  useEffect(() => {
    const el = ref.current;
    if (!el || lastEmitted.current === value) return;
    el.scrollTo({ top: value * ITEM_H, behavior: "smooth" });
  }, [value]);

  const handleScroll = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const v = Math.max(0, Math.min(Math.round(el.scrollTop / ITEM_H), max));
      if (v !== lastEmitted.current) {
        lastEmitted.current = v;
        onChange(v);
      }
    }, 50);
  };

  const tap = (i: number) => {
    const el = ref.current;
    lastEmitted.current = i;
    onChange(i);
    el?.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
  };

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="relative w-full" style={{ height: ITEM_H * 3 }}>
        {/* Selection highlight band */}
        <div
          className="pointer-events-none absolute inset-x-1 rounded-lg border-y border-line bg-ink/[.06]"
          style={{ top: ITEM_H, height: ITEM_H }}
        />
        {/* Scrollable drum */}
        <div
          ref={ref}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-scroll overscroll-contain [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "y mandatory", scrollbarWidth: "none" }}
        >
          <div style={{ height: ITEM_H }} aria-hidden="true" />
          {Array.from({ length: max + 1 }, (_, i) => (
            <div
              key={i}
              onClick={() => tap(i)}
              style={{ height: ITEM_H, scrollSnapAlign: "center" }}
              className="flex cursor-pointer items-center justify-center text-xl font-medium tabular-nums text-ink"
            >
              {String(i).padStart(2, "0")}
            </div>
          ))}
          <div style={{ height: ITEM_H }} aria-hidden="true" />
        </div>
        {/* Fade gradient top */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-card to-transparent"
          style={{ height: ITEM_H }}
        />
        {/* Fade gradient bottom */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-card to-transparent"
          style={{ height: ITEM_H }}
        />
      </div>
      <span className="mt-1.5 text-xs text-muted">{label}</span>
    </div>
  );
}

/**
 * Pemilih durasi: roda drum jam/menit/detik + pintasan 15/30/45/60 mnt.
 * Nilai dikirim ke onChange sebagai total detik (null bila semua nol).
 */
export function DurationInput({
  defaultValue = null,
  onChange,
}: {
  defaultValue?: number | null;
  onChange: (totalSec: number | null) => void;
}) {
  const [[h, m, s], setParts] = useState<[number, number, number]>(() => toParts(defaultValue));

  const emit = (hv: number, mv: number, sv: number) => {
    const total = hv * 3600 + mv * 60 + sv;
    onChange(total > 0 ? total : null);
  };

  const setH = (v: number) => { setParts([v, m, s]); emit(v, m, s); };
  const setM = (v: number) => { setParts([h, v, s]); emit(h, v, s); };
  const setS = (v: number) => { setParts([h, m, v]); emit(h, m, v); };

  const handleShortcut = (min: number) => {
    const p = toParts(min * 60);
    setParts(p);
    emit(p[0], p[1], p[2]);
  };

  const total = h * 3600 + m * 60 + s;

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {SHORTCUTS_MIN.map((min) => (
          <Chip key={min} active={total === min * 60} onClick={() => handleShortcut(min)}>
            {min} mnt
          </Chip>
        ))}
      </div>
      <div className="flex items-start gap-1">
        <DrumColumn max={23} value={h} onChange={setH} label="jam" />
        <div
          className="flex shrink-0 select-none items-center justify-center text-xl font-medium text-muted"
          style={{ width: 16, height: ITEM_H, marginTop: ITEM_H }}
        >
          :
        </div>
        <DrumColumn max={59} value={m} onChange={setM} label="mnt" />
        <div
          className="flex shrink-0 select-none items-center justify-center text-xl font-medium text-muted"
          style={{ width: 16, height: ITEM_H, marginTop: ITEM_H }}
        >
          :
        </div>
        <DrumColumn max={59} value={s} onChange={setS} label="dtk" />
      </div>
    </div>
  );
}
