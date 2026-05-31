import Link from "next/link";

import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { requireParent } from "@/lib/panel-parent";
import { getParentExcuses } from "@/lib/panel/absence-excuses";
import { AbsenceExcuseForm } from "@/components/panel/absence-excuses/absence-excuse-form";
import { AbsenceExcuseList } from "@/components/panel/absence-excuses/absence-excuse-list";

export const dynamic = "force-dynamic";

type SearchParams = { ok?: string; studentId?: string };

export default async function ParentMazeretBildir({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { parent } = await requireParent();
  const sp = await searchParams;

  if (!parent) {
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
              icon="user"
              title="Veli profili bulunamadı"
              description="Bu hesap bir veli kaydına bağlı değil. Yöneticinize danışın."
              action={
                <Link href="/iletisim" className="od-btn od-btn-primary od-btn-sm">
                  İletişime geç
                </Link>
              }
            />
          </CardBody>
        </Card>
      </>
    );
  }

  const childOptions = parent.students
    .map((ps) => ({ studentId: ps.studentId, fullName: ps.student.fullName }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"));

  const excuses = await getParentExcuses(parent.id);
  const pendingCount = excuses.filter((e) => e.status === "PENDING").length;
  const showSuccess = sp.ok === "1";

  return (
    <>
      <PageHeader
        title="Mazeret bildir"
        subtitle="Çocuğunuzun devamsızlığı için resmi mazeret bildirimi"
        breadcrumbs={[
          { label: "Veli Paneli", href: "/panel/veli" },
          { label: "Mazeret bildir" },
        ]}
        meta={
          pendingCount > 0 ? (
            <Badge tone="warn">{pendingCount} beklemede</Badge>
          ) : null
        }
      />

      {showSuccess ? (
        <Card padded>
          <div className="od-row" style={{ gap: 8, alignItems: "center" }}>
            <Badge tone="ok">İletildi</Badge>
            <span className="od-muted" style={{ fontSize: 13 }}>
              Mazeretiniz kaydedildi. İncelendiğinde durum güncellenecek.
            </span>
          </div>
        </Card>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Card>
          <CardHeader title="Yeni mazeret" subtitle="Çocuk, tarih aralığı ve sebep" />
          <CardBody>
            <AbsenceExcuseForm
              childOptions={childOptions}
              defaultStudentId={sp.studentId ?? undefined}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Son bildirimleriniz"
            subtitle={`${excuses.length} kayıt`}
          />
          <CardBody>
            <AbsenceExcuseList excuses={excuses} allowCancel />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
