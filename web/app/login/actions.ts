"use server";

import { signIn } from "@/auth";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

/** Dipakai dari halaman "ditolak": paksa Google menampilkan pemilih akun. */
export async function signInWithOtherAccount() {
  await signIn("google", { redirectTo: "/dashboard" }, { prompt: "select_account" });
}
