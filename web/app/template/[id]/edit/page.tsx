import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { goFetch } from "@/lib/go-api";
import { currentEmail } from "@/lib/session";
import type { Template } from "@/lib/template-types";
import { TemplateEditor } from "../../editor";

export const instant = false;

export default async function EditTemplatePage({ params }: PageProps<"/template/[id]/edit">) {
  const email = await currentEmail();
  if (!email) redirect("/login");
  const { id } = await params;

  let template: Template | null = null;
  try {
    const res = await goFetch(`/v1/templates/${id}`, email);
    if (res.status === 404) notFound();
    if (res.ok) template = (await res.json()) as Template;
  } catch {}

  if (!template) {
    return (
      <main className="min-h-dvh bg-paper px-4 pb-10 pt-2">
        <div className="mx-auto w-full max-w-md space-y-4">
          <PageHeader title="Edit template" backHref="/template" />
          <p className="text-sm text-danger">Server belum bisa dihubungi. Muat ulang halaman.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-paper px-4 pb-10 pt-2">
      <div className="mx-auto w-full max-w-md space-y-4">
        <PageHeader title="Edit template" backHref="/template" />
        <TemplateEditor initial={template} />
      </div>
    </main>
  );
}
