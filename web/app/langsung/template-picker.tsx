"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Template } from "@/lib/template-types";
import { touchTemplate } from "../template/actions";

export function TemplatePicker({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (templates.length === 0) return null;

  const start = (t: Template) => {
    startTransition(async () => {
      await touchTemplate(t.id);
      router.push(`/langsung/sesi?templateId=${t.id}`);
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted">Dari template</p>
      <div className="space-y-2">
        {templates.map((t) => {
          const kind = t.kind === "gym" ? "Gym" : "Bodyweight";
          const sub = `${kind} · ${t.exercise_count} gerakan`;
          return (
            <button
              key={t.id}
              onClick={() => start(t)}
              disabled={pending}
              className="w-full flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3 text-left hover:bg-card/80 transition-colors disabled:opacity-60"
            >
              <div>
                <p className="font-medium text-ink text-sm">{t.name}</p>
                <p className="text-xs text-muted mt-0.5">{sub}</p>
              </div>
              <span className="text-muted text-sm">▶</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
