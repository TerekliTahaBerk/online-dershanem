import type { Metadata } from "next";
import Link from "next/link";
import { requirePanelRole } from "@/lib/panel-access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const metadata: Metadata = {
  title: "Kullanıcı Erişimleri · ODK Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Filter = "all" | "od" | "odk" | "both" | "none";

export default async function AccessUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  await requirePanelRole("admin");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const filter = ((sp.filter ?? "all") as Filter);
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = 50;
  const now = new Date();

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        odkUserAccessTags: {
          where: {
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            accessTag: { isActive: true },
          },
          select: {
            id: true,
            expiresAt: true,
            source: true,
            accessTag: { select: { service: true, title: true, key: true } },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const filtered = users.filter((u) => {
    const services = new Set(u.odkUserAccessTags.map((t) => t.accessTag.service));
    const hasOD = services.has("OD");
    const hasODK = services.has("ODK");
    if (filter === "od") return hasOD;
    if (filter === "odk") return hasODK;
    if (filter === "both") return hasOD && hasODK;
    if (filter === "none") return !hasOD && !hasODK;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const filterLink = (f: Filter, label: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (f !== "all") params.set("filter", f);
    const href = `/panel/admin/odk/erisim/kullanicilar${params.toString() ? `?${params}` : ""}`;
    const active = filter === f;
    return (
      <Link
        key={f}
        href={href}
        className="od-btn"
        style={{
          background: active ? "var(--pd-primary, #2563eb)" : "transparent",
          color: active ? "#fff" : "inherit",
        }}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <PageHeader
        title="Kullanıcı Erişimleri"
        subtitle="OD / ODK erişim taglarına sahip kullanıcılar"
        right={
          <Link href="/panel/admin/odk/erisim" className="od-btn od-btn-ghost">
            ← Erişim taglarına dön
          </Link>
        }
      />

      <Card>
        <CardHeader title="Filtreler" />
        <CardBody>
          <form
            method="GET"
            action="/panel/admin/odk/erisim/kullanicilar"
            style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
          >
            <input
              name="q"
              defaultValue={q}
              placeholder="İsim veya e-posta ara…"
              className="od-input"
              style={{ minWidth: 240 }}
            />
            {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
            <button type="submit" className="od-btn od-btn-primary">
              Ara
            </button>
            {q ? (
              <Link href="/panel/admin/odk/erisim/kullanicilar" className="od-btn od-btn-ghost">
                Temizle
              </Link>
            ) : null}
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: 6 }}>
              {filterLink("all", "Tümü")}
              {filterLink("od", "OD")}
              {filterLink("odk", "ODK")}
              {filterLink("both", "OD+ODK")}
              {filterLink("none", "Erişim yok")}
            </div>
          </form>
        </CardBody>
      </Card>

      <div style={{ marginTop: 16 }}>
        <Card>
          <CardHeader
            title={`Kullanıcılar (${filtered.length}${filter !== "all" ? ` / ${users.length} sayfada` : ""})`}
            subtitle={`Toplam ${totalCount} kullanıcı · sayfa ${pageNum}/${totalPages}`}
          />
          <CardBody>
            {filtered.length === 0 ? (
              <EmptyState title="Kullanıcı bulunamadı" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Kullanıcı</th>
                    <th>Rol</th>
                    <th>OD</th>
                    <th>ODK</th>
                    <th>Aktif Taglar</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const services = new Set(u.odkUserAccessTags.map((t) => t.accessTag.service));
                    return (
                      <tr key={u.id}>
                        <td>
                          <strong style={{ fontSize: 13 }}>{u.name ?? "—"}</strong>
                          <div className="od-muted" style={{ fontSize: 11 }}>{u.email}</div>
                        </td>
                        <td>
                          <Badge tone="neutral">{u.role}</Badge>
                        </td>
                        <td>
                          {services.has("OD") ? <Badge tone="accent">✓</Badge> : <span className="od-muted">—</span>}
                        </td>
                        <td>
                          {services.has("ODK") ? <Badge tone="purple">✓</Badge> : <span className="od-muted">—</span>}
                        </td>
                        <td style={{ fontSize: 11 }}>
                          {u.odkUserAccessTags.length === 0 ? (
                            <span className="od-muted">—</span>
                          ) : (
                            u.odkUserAccessTags
                              .map((t) => t.accessTag.title)
                              .slice(0, 3)
                              .join(", ") + (u.odkUserAccessTags.length > 3 ? ` +${u.odkUserAccessTags.length - 3}` : "")
                          )}
                        </td>
                        <td>
                          <Link
                            href={`/panel/admin/odk/erisim/kullanicilar/${u.id}`}
                            className="od-btn od-btn-ghost"
                          >
                            Detay →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {totalPages > 1 ? (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
                {pageNum > 1 ? (
                  <Link
                    href={`/panel/admin/odk/erisim/kullanicilar?${new URLSearchParams({
                      ...(q ? { q } : {}),
                      ...(filter !== "all" ? { filter } : {}),
                      page: String(pageNum - 1),
                    })}`}
                    className="od-btn"
                  >
                    ← Önceki
                  </Link>
                ) : null}
                <span style={{ alignSelf: "center", fontSize: 12 }} className="od-muted">
                  {pageNum} / {totalPages}
                </span>
                {pageNum < totalPages ? (
                  <Link
                    href={`/panel/admin/odk/erisim/kullanicilar?${new URLSearchParams({
                      ...(q ? { q } : {}),
                      ...(filter !== "all" ? { filter } : {}),
                      page: String(pageNum + 1),
                    })}`}
                    className="od-btn"
                  >
                    Sonraki →
                  </Link>
                ) : null}
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
