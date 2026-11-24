import "server-only";
import { connection } from "next/server";
import { auth } from "@/auth";

/** Email pengguna yang sedang login, atau null. */
export async function currentEmail(): Promise<string | null> {
  // auth() memakai nilai acak (crypto) saat memperbarui sesi; tandai sebagai
  // render saat permintaan supaya Next.js tidak mencoba mem-prerender-nya.
  await connection();
  const session = await auth();
  return session?.user?.email ?? null;
}
