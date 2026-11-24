import { redirect } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/ui/bottom-nav";
import { PageHeader } from "@/components/ui/page-header";
import { goFetch } from "@/lib/go-api";
import { currentEmail } from "@/lib/session";
import { formatNumber } from "@/lib/format";
import type { ProgressExercise } from "./types";
import { RecSection, type Recommendation } from "./rec-card";

export const instant = false;

async function loadExercises(email: string): Promise<ProgressExercise[] | null> {
  try {
    const res = await goFetch("/v1/progress", email);
    if (!res.ok) return null;
    return (await res.json()) as ProgressExercise[];
  } catch {
    return null;
  }
}

type RecsData = { recommendations: Recommendation[]; error?: string };

async function loadRecommendations(email: string): Promise<RecsData> {
  try {
    const res = await goFetch("/v1/recommendations", email);
    if (!res.ok) return { recommendations: [] };
    const data = await res.json();
    return {
      recommendations: data.recommendations ?? [],
      error: data.error,
    };
  } catch {
    return { recommendations: [] };
  }
}

function groupByMuscle(list: ProgressExercise[]): [string, ProgressExercise[]][] {
  const map = new Map<string, ProgressExercise[]>();
  for (const e of list) {
    const g = map.get(e.muscle_group) ?? [];
    g.push(e);
    map.set(e.muscle_group, g);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export default async function ProgresPage() {
  const email = await currentEmail();
  if (!email) redirect("/login");
  const [exercises, recsData] = await Promise.all([
    loadExercises(email),
    loadRecommendations(email),
  ]);

  return (
    <main className="min-h-dvh bg-paper px-4 pb-28 pt-2">
      <div className="mx-auto w-full max-w-md space-y-5">
        <PageHeader title="Progres" />

        <RecSection
          recs={recsData.recommendations}
          error={recsData.error}
        />

        {exercises === null ? (
          <p className="py-8 text-center text-sm text-danger">
            Server belum bisa dihubungi. Muat ulang halaman.
          </p>
        ) : exercises.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-ink">Belum ada data progres</p>
            <p className="text-xs text-muted">
              Catat minimal satu sesi gym atau bodyweight berbeban untuk melihat grafik.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupByMuscle(exercises).map(([group, list]) => (
              <div key={group}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {group}
                </p>
                <div className="space-y-2">
                  {list.map((e) => (
                    <Link
                      key={e.id}
                      href={`/progres/${e.id}`}
                      className="flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3 hover:bg-card/80 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-ink text-sm">{e.name}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {formatNumber(e.set_count)} set tercatat
                        </p>
                      </div>
                      <span className="text-muted">›</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav active="progres" />
    </main>
  );
}
