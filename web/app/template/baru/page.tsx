import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { currentEmail } from "@/lib/session";
import { TemplateEditor } from "../editor";

export const instant = false;

export default async function NewTemplatePage() {
  const email = await currentEmail();
  if (!email) redirect("/login");
  return (
    <main className="min-h-dvh bg-paper px-4 pb-10 pt-2">
      <div className="mx-auto w-full max-w-md space-y-4">
        <PageHeader title="Template baru" backHref="/template" />
        <TemplateEditor />
      </div>
    </main>
  );
}
