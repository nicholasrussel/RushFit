"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteExercise } from "./actions";

export function DeleteExerciseButton({ id, name }: { id: string; name: string }) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, startDeleting] = useTransition();

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="text-sm text-danger hover:underline"
        aria-label={`Hapus ${name}`}
      >
        Hapus
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted">Yakin?</span>
      <Button
        variant="danger"
        size="sm"
        disabled={deleting}
        onClick={() =>
          startDeleting(async () => {
            await deleteExercise(id);
          })
        }
      >
        {deleting ? "…" : "Ya"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
        Batal
      </Button>
    </div>
  );
}
