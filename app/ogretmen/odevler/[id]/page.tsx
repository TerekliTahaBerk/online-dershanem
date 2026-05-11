import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { GradeForm } from "./_grade-form";

export const dynamic = "force-dynamic";

export default async function OgretmenOdevDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { teacherId, isAdmin } = await requireTeacher();
  if (!teacherId && !isAdmin) redirect("/giris");

  const a = await prisma.assignment.findUnique({
    where: { id },
    include: {
      classroom: { select: { name: true } },
      student: { select: { fullName: true } },
      submissions: {
        include: { student: { select: { fullName: true } } },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      },
    },
  });
  if (!a) notFound();
  if (!isAdmin && teacherId && a.teacherId !== teacherId) {
    redirect("/ogretmen/odevler");
  }

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <Link href="/ogretmen/odevler" className="pd-link" style={{ fontSize: 12 }}>
            ← Ödevler
          </Link>
          <h1 className="pd-page-title">{a.title}</h1>
          <p className="pd-page-subtitle">
            {a.classroom?.name ?? a.student?.fullName ?? "—"}
            {a.dueAt && ` · Son tarih: ${new Date(a.dueAt).toLocaleDateString("tr-TR")}`}
            {a.maxScore != null && ` · Maks: ${a.maxScore}`}
          </p>
        </div>
      </div>

      {a.description && (
        <div className="pd-card" style={{ padding: 16, marginBottom: 16, fontSize: 13 }}>
          <h3 style={{ fontSize: 13, marginBottom: 6 }}>Açıklama</h3>
          <p style={{ whiteSpace: "pre-wrap", color: "var(--pd-ink-3)" }}>{a.description}</p>
          {a.attachmentUrl && (
            <a href={a.attachmentUrl} target="_blank" rel="noreferrer" className="pd-link" style={{ fontSize: 12 }}>
              Eki indir →
            </a>
          )}
        </div>
      )}

      <h2 style={{ fontSize: 16, marginBottom: 8 }}>Teslimler ({a.submissions.length})</h2>
      <div className="pd-card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--pd-bg-2)" }}>
              <th style={{ padding: 10, textAlign: "left" }}>Öğrenci</th>
              <th style={{ padding: 10, textAlign: "left" }}>Durum</th>
              <th style={{ padding: 10, textAlign: "left" }}>Teslim</th>
              <th style={{ padding: 10, textAlign: "left" }}>Puan</th>
              <th style={{ padding: 10, textAlign: "left" }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {a.submissions.map((s: any) => (
              <tr key={s.id} style={{ borderTop: "1px solid var(--pd-line)" }}>
                <td style={{ padding: 10 }}>{s.student.fullName}</td>
                <td style={{ padding: 10 }}>
                  <strong>{s.status}</strong>
                </td>
                <td style={{ padding: 10 }}>
                  {s.submittedAt ? new Date(s.submittedAt).toLocaleString("tr-TR") : "—"}
                  {s.attachmentUrl && (
                    <a href={s.attachmentUrl} target="_blank" rel="noreferrer" className="pd-link" style={{ fontSize: 11, marginLeft: 8 }}>
                      Dosya
                    </a>
                  )}
                </td>
                <td style={{ padding: 10 }}>
                  {s.score != null ? `${s.score}${a.maxScore ? `/${a.maxScore}` : ""}` : "—"}
                </td>
                <td style={{ padding: 10 }}>
                  {s.status === "SUBMITTED" || s.status === "LATE" || s.status === "GRADED" ? (
                    <GradeForm submissionId={s.id} initialScore={s.score} initialFeedback={s.feedback} />
                  ) : (
                    <span style={{ color: "var(--pd-muted-2)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
