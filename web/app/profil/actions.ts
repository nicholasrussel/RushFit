"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { goFetch } from "@/lib/go-api";
import { currentEmail } from "@/lib/session";

export async function saveWeight(weightKg: number): Promise<{ error: string } | undefined> {
  const email = await currentEmail();
  if (!email) redirect("/login");
  const res = await goFetch("/v1/profile", email, {
    method: "PATCH",
    body: JSON.stringify({ weight_kg: weightKg }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.error ?? "Gagal menyimpan berat badan." };
  }
  revalidatePath("/profil");
}

export async function saveUnit(unit: "metric" | "imperial"): Promise<{ error: string } | undefined> {
  const email = await currentEmail();
  if (!email) redirect("/login");
  const res = await goFetch("/v1/profile", email, {
    method: "PATCH",
    body: JSON.stringify({ unit }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.error ?? "Gagal menyimpan satuan." };
  }
  revalidatePath("/profil");
}
