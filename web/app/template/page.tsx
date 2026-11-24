import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { goFetch } from "@/lib/go-api";
import { currentEmail } from "@/lib/session";
import type { Template } from "@/lib/template-types";
import { TemplateList } from "./template-list";

export const instant = false;

async function loadTemplates(email: string): Promise<Template[] | null> {
  try {
    const res = await goFetch("/v1/templates", email);
    if (!res.ok) return null;
    return (await res.json()) as Template[];
  } catch {
    return null;
  }
}

export default async function TemplatePage() {
  const email = await currentEmail();
  if (!email) redirect("/login");
  const templates = await loadTemplates(email);

  return (
    <main className="min-h-dvh bg-paper px-4 pb-10 pt-2">
      <div className="mx-auto w-full max-w-md space-y-5">
        <PageHeader title="Template" backHref="/langsung" />

        {templates === null ? (
          <p className="text-sm text-danger">Server belum bisa dihubungi. Muat ulang halaman.</p>
        ) : (
          <TemplateList templates={templates} />
        )}

        <Link
          href="/template/baru"
          className="block w-full rounded-2xl border border-dashed border-line py-4 text-center text-sm text-muted hover:bg-card transition-colors"
        >
          + Buat template baru
        </Link>
      </div>
    </main>
  );
}
