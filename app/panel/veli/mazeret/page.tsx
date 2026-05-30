import Link from "next/link";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { requirePanelRole } from "@/lib/panel-access";

export const dynamic = "force-dynamic";

/**
 * Mazeret bildir — Phase 2 / Session 3 deferred state.
 *
 * Honest deferred page: there is no `AbsenceExcuse` model in the current
 * schema, so we cannot persist a parent-submitted excuse. Rather than
 * fake the flow, we explain that the form is coming and link the parent
 * to the existing contact channel.
 *
 * Suggested model for the next session:
 *   model AbsenceExcuse {
 *     id          String   @id @default(cuid())
 *     parentId    String
 *     studentId   String
 *     dateFrom    DateTime
 *     dateTo      DateTime?
 *     reason      String   // "ILLNESS" | "FAMILY" | "OFFICIAL" | "OTHER"
 *     note        String?
 *     attachmentUrl String?
 *     status      String   // "PENDING" | "APPROVED" | "REJECTED"
 *     reviewedById  String?
 *     reviewedAt    DateTime?
 *     createdAt   DateTime @default(now())
 *     parent      Parent   @relation(fields: [parentId], references: [id])
 *     student     Student  @relation(fields: [studentId], references: [id])
 *   }
 */
export default async function ParentMazeretBildir() {
  await requirePanelRole("veli");
  return (
    <>
      <PageHeader
        title="Mazeret bildir"
        breadcrumbs={[
          { label: "Veli Paneli", href: "/panel/veli" },
          { label: "Mazeret bildir" },
        ]}
      />
      <Card>
        <CardBody>
          <EmptyState
            icon="alert"
            title="Mazeret bildirme akışı bir sonraki oturumda aktif edilecek."
            description="Şu an çocuğunuzun devamsızlığı için mazeret bildirimi panel üzerinden alınamıyor. Acil durumlar için lütfen okul yöneticinize ulaşın."
            action={
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                <Link href="/iletisim" className="od-btn od-btn-primary od-btn-sm">
                  Yöneticiye ulaş
                </Link>
                <Link href="/panel/veli" className="od-btn od-btn-ghost od-btn-sm">
                  Panele dön
                </Link>
              </div>
            }
          />
        </CardBody>
      </Card>
    </>
  );
}
