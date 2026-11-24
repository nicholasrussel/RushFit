"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { goFetch } from "@/lib/go-api";
import { currentEmail } from "@/lib/session";

export async function dismissRec(id: string) {
  const email = await currentEmail();
  if (!email) redirect("/login");
  await goFetch(`/v1/recommendations/${id}`, email, {
    method: "PATCH",
    body: JSON.stringify({ action: "dismiss" }),
  });
  revalidatePath("/progres");
}

export async function starRec(id: string) {
  const email = await currentEmail();
  if (!email) redirect("/login");
  await goFetch(`/v1/recommendations/${id}`, email, {
    method: "PATCH",
    body: JSON.stringify({ action: "star" }),
  });
  revalidatePath("/progres");
}

export async function refreshRecs() {
  const email = await currentEmail();
  if (!email) redirect("/login");
  await goFetch("/v1/recommendations/refresh", email, { method: "POST" });
  revalidatePath("/progres");
}
