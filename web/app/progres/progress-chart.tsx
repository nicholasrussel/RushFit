"use client";

import { useMemo } from "react";
import type { ProgressPoint, Projection } from "./types";

type Props = {
  points: ProgressPoint[];
  projection?: Projection | null;
  width?: number;
  height?: number;
};

const PAD = { top: 16, right: 24, bottom: 32, left: 44 };

function niceMax(v: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / (mag / 2)) * (mag / 2);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function ProgressChart({ points, projection, width = 340, height = 200 }: Props) {
  const chartW = width - PAD.left - PAD.right;
  const chartH = height - PAD.top - PAD.bottom;

  const { minV, maxV, minT, maxT, projPoint } = useMemo(() => {
    const vals = points.map((p) => p.orm1_est);
    const times = points.map((p) => new Date(p.started_at).getTime());
    let minV = Math.min(...vals) * 0.9;
    let maxV = niceMax(Math.max(...vals) * 1.1);
    let maxT = Math.max(...times);

    let projPoint: { t: number; v: number } | null = null;
    if (projection) {
      projPoint = {
        t: maxT + projection.in_weeks * 7 * 86400 * 1000,
        v: projection.orm1_kg,
      };
      maxT = projPoint.t;
      if (projPoint.v > maxV) maxV = niceMax(projPoint.v * 1.05);
    }

    return { minV, maxV, minT: Math.min(...times), maxT, projPoint };
  }, [points, projection]);

  const toX = (t: number) => PAD.left + ((t - minT) / (maxT - minT || 1)) * chartW;
  const toY = (v: number) => PAD.top + chartH - ((v - minV) / (maxV - minV || 1)) * chartH;

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const range = maxV - minV;
    const step = niceMax(range / 4);
    const ticks: number[] = [];
    for (let v = Math.ceil(minV / step) * step; v <= maxV; v += step) {
      ticks.push(Math.round(v));
    }
    return ticks;
  }, [minV, maxV]);

  // X-axis ticks — pick up to 5 evenly-spaced points
  const xTicks = useMemo(() => {
    if (points.length <= 1) return points;
    const step = Math.max(1, Math.floor(points.length / 4));
    const ticks = [];
    for (let i = 0; i < points.length; i += step) ticks.push(points[i]);
    if (ticks[ticks.length - 1] !== points[points.length - 1]) {
      ticks.push(points[points.length - 1]);
    }
    return ticks;
  }, [points]);

  const lineD = points
    .map((p, i) => {
      const x = toX(new Date(p.started_at).getTime());
      const y = toY(p.orm1_est);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const projD = (() => {
    if (!projPoint || points.length === 0) return "";
    const last = points[points.length - 1];
    const x1 = toX(new Date(last.started_at).getTime());
    const y1 = toY(last.orm1_est);
    const x2 = toX(projPoint.t);
    const y2 = toY(projPoint.v);
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  })();

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      aria-label="Grafik progres 1RM"
    >
      {/* Y-axis grid + labels */}
      {yTicks.map((v) => {
        const y = toY(v);
        return (
          <g key={v}>
            <line
              x1={PAD.left}
              y1={y}
              x2={PAD.left + chartW}
              y2={y}
              stroke="var(--color-line, #DAD6CC)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y + 4}
              textAnchor="end"
              fontSize={10}
              fill="var(--color-muted, #6B7079)"
            >
              {v}
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {xTicks.map((p) => {
        const x = toX(new Date(p.started_at).getTime());
        return (
          <text
            key={p.started_at}
            x={x}
            y={height - 6}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-muted, #6B7079)"
          >
            {formatDate(p.date)}
          </text>
        );
      })}

      {/* Axes */}
      <line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={PAD.top + chartH}
        stroke="var(--color-line, #DAD6CC)"
        strokeWidth={1}
      />
      <line
        x1={PAD.left}
        y1={PAD.top + chartH}
        x2={PAD.left + chartW}
        y2={PAD.top + chartH}
        stroke="var(--color-line, #DAD6CC)"
        strokeWidth={1}
      />

      {/* Data line */}
      {lineD && (
        <path
          d={lineD}
          fill="none"
          stroke="var(--color-accent, #E8501D)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Projection dashed line */}
      {projD && (
        <path
          d={projD}
          fill="none"
          stroke="var(--color-accent, #E8501D)"
          strokeWidth={2}
          strokeDasharray="5 4"
          strokeLinecap="round"
          opacity={0.55}
        />
      )}

      {/* Data dots */}
      {points.map((p) => {
        const x = toX(new Date(p.started_at).getTime());
        const y = toY(p.orm1_est);
        return (
          <circle
            key={p.started_at}
            cx={x}
            cy={y}
            r={4}
            fill="var(--color-accent, #E8501D)"
          />
        );
      })}

      {/* Projection dot */}
      {projPoint && (
        <circle
          cx={toX(projPoint.t)}
          cy={toY(projPoint.v)}
          r={4}
          fill="none"
          stroke="var(--color-accent, #E8501D)"
          strokeWidth={2}
          opacity={0.55}
        />
      )}
    </svg>
  );
}
