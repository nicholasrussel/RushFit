"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteWorkout } from "@/app/catat/actions";

/** Hapus dengan konfirmasi dua langkah, karena sesi yang terhapus tidak bisa dikembalikan. */
export function DeleteButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDeleting] = useTransition();

  if (!confirming) {
    return (
      <Button variant="danger" className="flex-1" onClick={() => setConfirming(true)}>
        Hapus
      </Button>
    );
  }

  return (
    <div className="flex-1 space-y-2">
      <p className="text-sm text-ink">Hapus sesi ini? Tidak bisa dikembalikan.</p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" disabled={deleting} onClick={() => setConfirming(false)}>
          Batal
        </Button>
        <Button
          variant="danger"
          size="sm"
          className="flex-1"
          disabled={deleting}
          onClick={() =>
            startDeleting(async () => {
              const r = await deleteWorkout(id);
              if (r?.error) setError(r.error);
            })
          }
        >
          {deleting ? "Menghapus…" : "Ya, hapus"}
        </Button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
