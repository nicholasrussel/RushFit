"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { goFetch } from "@/lib/go-api";
import { currentEmail } from "@/lib/session";

export async function createExercise(input: {
  name: string;
  muscle_group: string;
  kind: "gym" | "bodyweight";
  compendium_code: string;
}): Promise<{ error: string } | undefined> {
  const email = await currentEmail();
  if (!email) redirect("/login");
  const res = await goFetch("/v1/exercises", email, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.error ?? "Gagal menyimpan gerakan." };
  }
  revalidatePath("/profil");
  revalidatePath("/profil/gerakan");
}

export async function deleteExercise(id: string): Promise<{ error: string } | undefined> {
  const email = await currentEmail();
  if (!email) redirect("/login");
  const res = await goFetch(`/v1/exercises/${encodeURIComponent(id)}`, email, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    return { error: "Gagal menghapus gerakan." };
  }
  revalidatePath("/profil");
  revalidatePath("/profil/gerakan");
}
