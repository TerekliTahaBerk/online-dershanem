import type { Metadata } from "next";
import Link from "next/link";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { SearchInput } from "@/components/panel/ui/search-input";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const metadata: Metadata = {
  title: "ODK Öğrencileri · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const fmtDate = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("tr-TR").format(d) : "—";

export default async function OdkStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireOdkPanel("admin");
  const sp = await searchParams;
  const q = sp.q?.trim() || "";

  const now = new Date();

  // ODK erişimi olan kullanıcı = aktif OdkUserAccessTag (service=ODK) VEYA
  // aktif OdkEntitlement.
  const userWhere: Record<string, unknown> = {
    OR: [
      {
        odkUserAccessTags: {
          some: {
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            accessTag: { service: "ODK", isActive: true },
          },
        },
      },
      {
        odkEntitlements: {
          some: {
            status: "ACTIVE",
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        },
      },
    ],
  };
  if (q) {
    userWhere.AND = [
      {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { student: { fullName: { contains: q, mode: "insensitive" } } },
          { student: { phone: { contains: q } } },
        ],
      },
    ];
  }

  const users = await prisma.user.findMany({
    where: userWhere,
    take: 200,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      student: { select: { id: true, fullName: true, phone: true } },
      odkEntitlements: {
        where: { status: "ACTIVE" },
        orderBy: { expiresAt: "desc" },
        take: 1,
        select: {
          expiresAt: true,
          package: { select: { title: true } },
        },
      },
      odkUserAccessTags: {
        where: { revokedAt: null, accessTag: { service: "ODK" } },
        select: { accessTag: { select: { title: true, key: true } } },
      },
      odkAttempts: {
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: {
          submittedAt: true,
          score: true,
          cheatViolationCount: true,
        },
      },
      _count: {
        select: {
          odkAttempts: { where: { status: "SUBMITTED" } },
        },
      },
    },
  });

  // Ortalama net (basit yaklaşım): son 10 attempt'ten avg score
  // Performans için sadece liste seviyesinde gösterilen son attempt'ten yola çıkıyoruz.

  return (
    <>
      <PageHeader
        title="ODK Öğrencileri"
        subtitle={`${users.length} aktif ODK kullanıcısı`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <SearchInput placeholder="Ad, email, telefon…" />
            <Link
              href="/panel/admin/odk/siparisler/yeni"
              className="od-btn od-btn-primary od-btn-sm"
            >
              + Manuel paket
            </Link>
            <Badge tone="purple">ODK</Badge>
          </div>
        }
      />

      <Card>
        {users.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState
              icon="users"
              title="ODK öğrencisi yok"
              description="Henüz aktif ODK erişimi olan kullanıcı yok. Manuel paket tanımlayarak ekleyebilirsiniz."
            />
          </div>
        ) : (
          <table className="od-table">
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>Aktif paket</th>
                <th>Bitiş</th>
                <th>Çözülen deneme</th>
                <th>Son deneme</th>
                <th>Cheat</th>
                <th>Tag</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const ent = u.odkEntitlements[0];
                const last = u.odkAttempts[0];
                const cheatTotal = last?.cheatViolationCount ?? 0;
                return (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name ?? u.student?.fullName ?? "—"}</strong>
                      <div className="od-muted" style={{ fontSize: 11 }}>
                        {u.email}
                        {u.student?.phone ? " · " + u.student.phone : ""}
                      </div>
                    </td>
                    <td>{ent?.package?.title ?? <span className="od-muted">—</span>}</td>
                    <td className="od-mono">{fmtDate(ent?.expiresAt ?? null)}</td>
                    <td className="od-mono">{u._count.odkAttempts}</td>
                    <td className="od-mono">
                      {last?.score?.toString() ?? "—"}
                      {last?.submittedAt ? (
                        <div className="od-muted" style={{ fontSize: 11 }}>
                          {fmtDate(last.submittedAt)}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {cheatTotal > 0 ? (
                        <Badge tone="bad">{cheatTotal}</Badge>
                      ) : (
                        <span className="od-muted">—</span>
                      )}
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {u.odkUserAccessTags.length === 0 ? (
                          <span className="od-muted">—</span>
                        ) : (
                          u.odkUserAccessTags.slice(0, 3).map((t, i) => (
                            <Badge key={i} tone="purple">
                              {t.accessTag.title}
                            </Badge>
                          ))
                        )}
                        {u.odkUserAccessTags.length > 3 ? (
                          <span className="od-muted" style={{ fontSize: 11 }}>
                            +{u.odkUserAccessTags.length - 3}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`/panel/admin/odk/ogrenciler/${u.id}`}
                        className="od-btn od-btn-ghost od-btn-sm"
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
