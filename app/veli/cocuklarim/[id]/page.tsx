import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireParent, assertParentSeesStudent } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { canSeeOwnedPackagePrice, formatPriceMasked } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const ATT_LABEL: Record<string, string> = {
  PRESENT: "Geldi",
  ABSENT: "Gelmedi",
  LATE: "Geç",
  EXCUSED: "Mazeretli",
};

export default async function VeliCocukDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, parentId, isAdmin } = await requireParent();
  if (!parentId && !isAdmin) redirect("/giris");
  if (parentId) await assertParentSeesStudent(parentId, id);

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true } },
      packages: {
        where: { revokedAt: null },
        include: { package: { select: { name: true, price: true } } },
        orderBy: { assignedAt: "desc" },
      },
      lessons: { orderBy: { scheduledAt: "desc" }, take: 10 },
      attendances: {
        orderBy: { sessionDate: "desc" },
        take: 10,
        include: { lesson: { select: { title: true, scheduledAt: true } } },
      },
      tags: { include: { tag: true } },
      comments: {
        where: { visibleToParent: true },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { teacher: { select: { user: { select: { name: true } } } } },
      },
      submissions: {
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: { assignment: { select: { title: true, dueAt: true } } },
      },
    },
  });
  if (!student) notFound();

  const role = (session.user?.role ?? "PARENT") as any;

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <Link href="/veli/cocuklarim" className="pd-link" style={{ fontSize: 12 }}>← Çocuklarım</Link>
          <h1 className="pd-page-title">{student.fullName}</h1>
          <p className="pd-page-subtitle">
            {student.classLevel ?? "—"} · {student.user?.email ?? student.email ?? "—"}
          </p>
        </div>
      </div>

      {student.tags.length > 0 && (
        <section className="pd-card" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Etiketler</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {student.tags.map((t: any) => (
              <span key={t.tagId} className="pd-chip" style={{ fontSize: 11 }}>{t.tag.label}</span>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
        <section className="pd-card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Aktif Paketler</h3>
          {student.packages.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>Aktif paket yok.</p>
          ) : (
            <ul style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 16 }}>
              {student.packages.map((p: any) => (
                <li key={p.id}><strong>{p.package.name}</strong> · <span style={{ color: "var(--pd-muted-2)" }}>{formatPriceMasked(p.package.price, canSeeOwnedPackagePrice(role))}</span></li>
              ))}
            </ul>
          )}
        </section>

        <section className="pd-card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Son Dersler</h3>
          {student.lessons.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>Ders kaydı yok.</p>
          ) : (
            <ul style={{ fontSize: 12, lineHeight: 1.7, paddingLeft: 16 }}>
              {student.lessons.map((l: any) => (
                <li key={l.id}>{new Date(l.scheduledAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {l.title ?? "Ders"} · <em>{l.status}</em></li>
              ))}
            </ul>
          )}
        </section>

        <section className="pd-card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Devamsızlık</h3>
          {student.attendances.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>Yoklama yok.</p>
          ) : (
            <ul style={{ fontSize: 12, lineHeight: 1.7, paddingLeft: 16 }}>
              {student.attendances.map((a: any) => (
                <li key={a.id}>{a.lesson?.title ?? "Ders"} · {new Date(a.sessionDate).toLocaleDateString("tr-TR")} · <strong>{ATT_LABEL[a.status] ?? a.status}</strong></li>
              ))}
            </ul>
          )}
        </section>

        <section className="pd-card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Öğretmen Yorumları</h3>
          {student.comments.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>Veliye açık yorum yok.</p>
          ) : (
            <ul style={{ fontSize: 12, lineHeight: 1.7, listStyle: "none", padding: 0 }}>
              {student.comments.map((c: any) => (
                <li key={c.id} style={{ borderTop: "1px solid var(--pd-line)", padding: "8px 0" }}>
                  <div style={{ color: "var(--pd-muted-2)", fontSize: 11 }}>{c.teacher?.user?.name ?? "Öğretmen"} · {new Date(c.createdAt).toLocaleDateString("tr-TR")}</div>
                  <div>{c.content}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="pd-card" style={{ padding: 16, gridColumn: "1 / -1" }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Son Ödev Teslimleri</h3>
          {student.submissions.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>Henüz teslim yok.</p>
          ) : (
            <ul style={{ fontSize: 12, lineHeight: 1.7, paddingLeft: 16 }}>
              {student.submissions.map((s: any) => (
                <li key={s.id}>{s.assignment.title} · <strong>{s.status}</strong>{s.score != null && ` · ${s.score} puan`}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
