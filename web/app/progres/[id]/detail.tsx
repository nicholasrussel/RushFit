"use client";

import { StatCard } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import type { ProgressResult } from "../types";
import { ProgressChart } from "../progress-chart";

export function ProgressDetail({ data }: { data: ProgressResult }) {
  const { points, current_orm1, week_volume_kg, projection } = data;

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];

  // Delta 1RM: selisih antara titik pertama dan terakhir
  const delta =
    points.length >= 2
      ? points[points.length - 1].orm1_est - points[0].orm1_est
      : null;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="1RM estimasi"
          value={current_orm1 != null ? `${formatNumber(current_orm1, 1)} kg` : "—"}
        />
        <StatCard
          label="Volume minggu ini"
          value={
            week_volume_kg != null && week_volume_kg > 0
              ? `${formatNumber(week_volume_kg, 0)} kg`
              : "—"
          }
        />
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-line bg-card p-4 overflow-hidden">
        <p className="mb-3 text-xs font-medium text-muted">1RM estimasi (kg)</p>
        <ProgressChart
          points={points}
          projection={projection}
          height={180}
        />
      </div>

      {/* Projection card */}
      {projection && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 space-y-0.5">
          <p className="text-xs font-medium text-accent">Proyeksi dari tren</p>
          <p className="text-sm text-ink">
            {formatNumber(projection.orm1_kg, 1)} kg dalam {projection.in_weeks} minggu
          </p>
          <p className="text-xs text-muted">Dihitung dari regresi linear, bukan LLM.</p>
        </div>
      )}

      {/* Delta */}
      {delta !== null && Math.abs(delta) > 0.05 && (
        <p className="text-sm text-muted text-center">
          Perubahan dalam rentang ini:{" "}
          <span className={delta >= 0 ? "text-green-600 font-medium" : "text-danger font-medium"}>
            {delta >= 0 ? "+" : ""}
            {formatNumber(delta, 1)} kg
          </span>
        </p>
      )}

      {/* Data table */}
      <div className="rounded-2xl border border-line bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="py-2 pl-4 text-left text-xs font-medium text-muted">Tanggal</th>
              <th className="py-2 pr-4 text-right text-xs font-medium text-muted">1RM est.</th>
              <th className="py-2 pr-4 text-right text-xs font-medium text-muted">Volume</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p, i) => (
              <tr
                key={p.started_at}
                className={i < points.length - 1 ? "border-b border-line/50" : ""}
              >
                <td className="py-2 pl-4 text-ink tabular-nums">
                  {new Date(p.started_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-ink">
                  {formatNumber(p.orm1_est, 1)} kg
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-muted">
                  {formatNumber(p.volume_kg, 0)} kg
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
