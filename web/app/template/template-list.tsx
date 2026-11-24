"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";
import type { Template } from "@/lib/template-types";
import { deleteTemplate } from "./actions";

function TemplateCard({ t }: { t: Template }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDeleting] = useTransition();

  const kind = t.kind === "gym" ? "Gym" : "Bodyweight";
  const sub = `${kind} · ${t.exercise_count} gerakan · ${t.set_count} set`;

  const handleDelete = () => {
    startDeleting(async () => {
      const r = await deleteTemplate(t.id);
      if (r?.error) { setError(r.error); setConfirming(false); }
    });
  };

  return (
    <div className="rounded-2xl border border-line bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-ink truncate">{t.name}</p>
          <p className="text-xs text-muted mt-0.5">{sub}</p>
        </div>
        <Link
          href={`/template/${t.id}/edit`}
          className="shrink-0 text-sm text-accent hover:underline"
        >
          Edit
        </Link>
      </div>

      {error ? <Banner tone="error">{error}</Banner> : null}

      {confirming ? (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
            Batal
          </Button>
          <Button size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Menghapus…" : "Ya, hapus"}
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="text-xs text-danger hover:underline"
        >
          Hapus
        </button>
      )}
    </div>
  );
}

export function TemplateList({ templates }: { templates: Template[] }) {
  if (templates.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        Belum ada template. Buat dari sesi yang selesai atau mulai dari kosong.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {templates.map((t) => (
        <TemplateCard key={t.id} t={t} />
      ))}
    </div>
  );
}
