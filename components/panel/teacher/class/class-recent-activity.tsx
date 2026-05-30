import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";

/**
 * Class recent activity feed — Phase 2 / Session 2.
 *
 * Deferred: this codebase has multiple potential sources (`audit.ts`,
 * `InboxMessage`, `Attendance.createdAt`, `AssignmentSubmission.gradedAt`),
 * none of which currently expose a clean per-classroom activity stream.
 * Building one would require a polymorphic union query plus a dedicated
 * helper. We render an honest empty state instead of inventing fake events,
 * matching the project constraint: "Do not invent fake events."
 */
export function ClassRecentActivity() {
  return (
    <Card>
      <CardHeader title="Son hareketler" subtitle="Sınıf bazlı aktivite akışı" />
      <CardBody>
        <EmptyState
          icon="inbox"
          title="Yakında: sınıf aktivite akışı"
          description="Yoklama, ödev, ders ve veli işlemleri tek bir akışta listelenecek. Şu an aktif kayıtlarını ilgili kartlardan takip edebilirsin."
        />
      </CardBody>
    </Card>
  );
}
