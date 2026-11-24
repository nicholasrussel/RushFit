"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { goFetch } from "@/lib/go-api";
import { currentEmail } from "@/lib/session";
import type { Template, TemplateExercise } from "@/lib/template-types";

export async function createTemplate(input: {
  name: string;
  kind: "gym" | "bodyweight";
  exercises: TemplateExercise[];
}): Promise<{ template: Template } | { error: string }> {
  const email = await currentEmail();
  if (!email) redirect("/login");
  const res = await goFetch("/v1/templates", email, {
    method: "POST",
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { error: body.error ?? "Gagal membuat template." };
  revalidatePath("/template");
  return { template: body as Template };
}

export async function updateTemplate(
  id: string,
  input: { name: string; exercises: TemplateExercise[] },
): Promise<{ template: Template } | { error: string }> {
  const email = await currentEmail();
  if (!email) redirect("/login");
  const res = await goFetch(`/v1/templates/${id}`, email, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { error: body.error ?? "Gagal menyimpan template." };
  revalidatePath("/template");
  revalidatePath(`/template/${id}/edit`);
  return { template: body as Template };
}

export async function deleteTemplate(id: string): Promise<{ error: string } | undefined> {
  const email = await currentEmail();
  if (!email) redirect("/login");
  const res = await goFetch(`/v1/templates/${id}`, email, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.error ?? "Gagal menghapus template." };
  }
  revalidatePath("/template");
}

export async function touchTemplate(id: string): Promise<void> {
  const email = await currentEmail();
  if (!email) return;
  await goFetch(`/v1/templates/${id}/start`, email, { method: "POST" }).catch(() => {});
}
