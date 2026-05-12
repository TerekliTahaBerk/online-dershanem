import type { Metadata } from "next";
import Link from "next/link";
import { requireParentWithChildren } from "@/lib/odk/parent";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const metadata: Metadata = {
  title: "Çocuklarım · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ParentChildrenList() {
  const { children } = await requireParentWithChildren();
  return (
    <>
      <PageHeader title="Çocuklarım" subtitle={`${children.length} kayıt`} />
      <Card>
        <CardHeader title="Bağlı çocukların" />
        <CardBody>
          {children.length === 0 ? (
            <EmptyState title="Bağlı çocuk yok" description="Lütfen okul yöneticinizle iletişime geçin." />
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {children.map((c) => (
                <li key={c.studentId} style={{ padding: "12px 0", borderBottom: "1px solid var(--pd-line)" }}>
                  <Link href={`/panel/veli/odk/cocuklarim/${c.userId}`} style={{ display: "flex", justifyContent: "space-between", textDecoration: "none", color: "inherit" }}>
                    <div>
                      <strong>{c.name ?? "—"}</strong>
                      <div className="od-muted" style={{ fontSize: 11 }}>{c.email} · {c.relationship ?? "—"}</div>
                    </div>
                    <span className="od-muted">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
