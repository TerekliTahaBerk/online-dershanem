import Link from "next/link";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { requireParent } from "@/lib/panel-parent";
import {
  getParentLinkedStudents,
  pickSelectedStudent,
  getParentTodayTimeline,
  getParentUpcomingLessons,
  getParentAttendanceSummary,
  getParentHomeworkSummary,
  getParentPaymentSummary,
  getParentOdkSnapshot,
} from "@/lib/panel/parent-dashboard";
import { ChildSwitcher } from "@/components/panel/parent/dashboard/child-switcher";
import { ParentTodayTimeline } from "@/components/panel/parent/dashboard/parent-today-timeline";
import { ParentUpcomingLessons } from "@/components/panel/parent/dashboard/parent-upcoming-lessons";
import { ParentAttendanceSummaryCard } from "@/components/panel/parent/dashboard/parent-attendance-summary";
import { ParentHomeworkSummaryCard } from "@/components/panel/parent/dashboard/parent-homework-summary";
import { ParentPaymentSummaryCard } from "@/components/panel/parent/dashboard/parent-payment-summary";
import { ParentOdkSnapshotCard } from "@/components/panel/parent/dashboard/parent-odk-snapshot";

export const dynamic = "force-dynamic";

const TODAY_FMT = new Intl.DateTimeFormat("tr-TR", {
  weekday: "long", day: "2-digit", month: "long", year: "numeric",
});

/**
 * Parent Dashboard — Phase 2 / Session 3.
 *
 * Child-centered cockpit. The parent picks one linked child via
 * `?studentId=…` (or auto-select first/primary). Every helper below
 * re-verifies the ParentStudent link before issuing any further query —
 * it is impossible for a parent to view another family's data even by
 * forging the URL.
 */
export default async function ParentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { parent } = await requireParent();
  const { studentId: requestedId } = await searchParams;

  if (!parent) {
    return (
      <>
        <PageHeader title="Veli Paneli" />
        <Card>
          <CardBody>
            <EmptyState
              icon="user"
              title="Veli profili bulunamadı"
              description="Hesabınız henüz bir veli kaydına bağlanmamış. Yöneticinizle iletişime geçin."
              action={
                <Link href="/iletisim" className="od-btn od-btn-primary od-btn-sm">İletişime geç</Link>
              }
            />
          </CardBody>
        </Card>
      </>
    );
  }

  const roster = await getParentLinkedStudents(parent.id);

  if (roster.length === 0) {
    return (
      <>
        <PageHeader
          title="Veli Paneli"
          subtitle={`${parent.fullName} · ${TODAY_FMT.format(new Date())}`}
        />
        <Card>
          <CardBody>
            <EmptyState
              icon="users"
              title="Henüz bağlı öğrenci yok"
              description="Hesabınıza bir öğrenci eşleştirmesi yapılmamış. Yönetimden çocuğunuzu hesabınıza eşleştirmesini rica edin."
              action={
                <Link href="/iletisim" className="od-btn od-btn-primary od-btn-sm">İletişime geç</Link>
              }
            />
          </CardBody>
        </Card>
      </>
    );
  }

  const { selected, isFallback } = pickSelectedStudent(roster, requestedId);
  // pickSelectedStudent never returns null when roster is non-empty.
  const child = selected!;

  const [timeline, upcoming, attendance, homework, payment, odk] = await Promise.all([
    getParentTodayTimeline(parent.id, child.studentId, child.userId),
    getParentUpcomingLessons(parent.id, child.studentId),
    getParentAttendanceSummary(parent.id, child.studentId),
    getParentHomeworkSummary(parent.id, child.studentId),
    getParentPaymentSummary(parent.id, child.studentId),
    getParentOdkSnapshot(parent.id, child.studentId, child.userId),
  ]);

  const firstName = child.fullName.split(" ")[0];

  return (
    <>
      <PageHeader
        title="Veli Paneli"
        subtitle={`${parent.fullName} · ${TODAY_FMT.format(new Date())}`}
        right={
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Link href="/panel/veli/mazeret" className="od-btn od-btn-primary od-btn-sm">
              Mazeret bildir
            </Link>
            <Link href="/panel/veli/odev-takibi" className="od-btn od-btn-ghost od-btn-sm">
              Ödevleri gör
            </Link>
            <Link href="/panel/veli/ders-programi" className="od-btn od-btn-ghost od-btn-sm">
              Ders programı
            </Link>
            <Link href="/panel/veli/odemeler" className="od-btn od-btn-ghost od-btn-sm">
              Ödemeler
            </Link>
          </div>
        }
      />

      <ChildSwitcher roster={roster} selectedId={child.studentId} />

      {isFallback ? (
        <div style={{
          padding: "8px 10px", borderRadius: 8, marginBottom: 12,
          background: "var(--pd-soft)", fontSize: 12,
        }} className="od-muted">
          ℹ Seçtiğiniz öğrenci hesabınıza bağlı olmadığı için <strong>{firstName}</strong> gösteriliyor.
        </div>
      ) : null}

      {/* Row 1 — today timeline (full width) */}
      <div style={{ marginBottom: 12 }}>
        <ParentTodayTimeline events={timeline} childFirstName={firstName} />
      </div>

      {/* Row 2 — upcoming lessons (full width) */}
      <div style={{ marginBottom: 12 }}>
        <ParentUpcomingLessons lessons={upcoming} />
      </div>

      {/* Row 3 — attendance + homework */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <ParentAttendanceSummaryCard summary={attendance} />
        <ParentHomeworkSummaryCard summary={homework} />
      </div>

      {/* Row 4 — payments + odk */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <ParentPaymentSummaryCard summary={payment} />
        <ParentOdkSnapshotCard snapshot={odk} childUserId={child.userId} />
      </div>

      {/* Footer: link to detailed child profile */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link
          href={`/panel/veli/cocuklarim/${child.studentId}`}
          className="od-btn od-btn-ghost od-btn-sm"
        >
          {firstName} hakkında detaylı bilgi →
        </Link>
      </div>
    </>
  );
}
