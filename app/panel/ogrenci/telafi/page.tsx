import { notFound } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { loadStudentRecoveryPackages, recoveryItemWebHref } from "@/lib/panel/student-review-recovery-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { StudentRecoveryPackages } from "@/components/panel/student-recovery-packages";
import {
  PAGE_EYEBROW_CLASS,
  PAGE_TITLE_CLASS,
  PAGE_DESCRIPTION_CLASS,
} from "@/components/panel/ui";
import { ReviewRecoveryTabs } from "@/components/panel/student/review-recovery-tabs";

export const dynamic = "force-dynamic";
export default async function StudentRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ lessonId?: string }>;
}) {
  const session = await requireRole("STUDENT");
  if (!getPanelFeatureFlags().recoveryPackage) notFound();
  const requestedLessonId = (await searchParams).lessonId || null;
  // Sorgu + ilk görüntüleme kaydı mobil `GET /api/panel/student/recovery` ile
  // ortak yükleyicide; davranış değişmedi.
  const packages = await loadStudentRecoveryPackages({ studentUserId: session.userId, role: session.role });
  const rows = packages.map((item) => ({
    ...item,
    lessonDate: item.lessonDate.toISOString(),
    dueAt: item.dueAt.toISOString(),
    items: item.items.map((row) => ({ id: row.id, kind: row.kind, title: row.title, completed: row.completed, href: recoveryItemWebHref(row) })),
  }));
  const orderedRows = requestedLessonId
    ? [...rows].sort((a, b) =>
        a.lessonId === requestedLessonId
          ? -1
          : b.lessonId === requestedLessonId
            ? 1
            : 0,
      )
    : rows;
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <header>
        <p className={PAGE_EYEBROW_CLASS}>
          <PackageCheck size={15} /> Kaçırdığım ders
        </p>
        <h1 className={PAGE_TITLE_CLASS}>
          Bu dersi kaçırdın
        </h1>
        <p className={PAGE_DESCRIPTION_CLASS}>
          25 dakikada toparlayabilirsin: konu özeti, materyal ve küçük çalışma
          tek sırada hazır.
        </p>
      </header>
      <ReviewRecoveryTabs active="telafi" />
      <div className="mt-7">
        <StudentRecoveryPackages rows={orderedRows} />
      </div>
    </PanelShell>
  );
}
