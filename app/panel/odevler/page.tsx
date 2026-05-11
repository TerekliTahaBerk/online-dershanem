import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { SubmitForm } from "./_submit-form";

export const dynamic = "force-dynamic";

export default async function PanelOdevlerPage() {
  const { studentId, isAdmin } = await requireStudent();
  if (!studentId && !isAdmin) redirect("/giris");

  const subs = studentId
    ? await prisma.assignmentSubmission.findMany({
        where: { studentId },
        include: {
          assignment: {
            include: {
              teacher: { select: { user: { select: { name: true } } } },
            },
          },
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      })
    : [];

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <h1 className="pd-page-title">Ödevlerim</h1>
          <p className="pd-page-subtitle">Verilen ödevler ve teslim durumum.</p>
        </div>
      </div>

      {subs.length === 0 ? (
        <div className="pd-card" style={{ padding: 16, color: "var(--pd-muted-2)" }}>
          Henüz size verilmiş ödev yok.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {subs.map((s: any) => (
            <div key={s.id} className="pd-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <strong style={{ fontSize: 15 }}>{s.assignment.title}</strong>
                  <div style={{ fontSize: 12, color: "var(--pd-muted-2)", marginTop: 2 }}>
                    {s.assignment.teacher?.user?.name ?? "Öğretmen"}
                    {s.assignment.subject && ` · ${s.assignment.subject}`}
                    {s.assignment.dueAt && ` · Son tarih: ${new Date(s.assignment.dueAt).toLocaleDateString("tr-TR")}`}
                  </div>
                </div>
                <span className="pd-chip" style={{ fontSize: 11, height: "fit-content" }}>
                  {s.status}
                </span>
              </div>
              {s.assignment.description && (
                <p style={{ fontSize: 13, color: "var(--pd-ink-3)", whiteSpace: "pre-wrap", marginBottom: 8 }}>
                  {s.assignment.description}
                </p>
              )}
              {s.assignment.attachmentUrl && (
                <a
                  href={s.assignment.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="pd-link"
                  style={{ fontSize: 12, display: "inline-block", marginBottom: 8 }}
                >
                  Ödev eki →
                </a>
              )}
              {s.status === "GRADED" ? (
                <div style={{ fontSize: 13, padding: 8, background: "var(--pd-bg-2)", borderRadius: 4 }}>
                  <strong>Notunuz: {s.score}</strong>
                  {s.feedback && <p style={{ fontSize: 12, marginTop: 4, color: "var(--pd-ink-3)" }}>{s.feedback}</p>}
                </div>
              ) : (
                <SubmitForm assignmentId={s.assignment.id} initialContent={s.content} initialUrl={s.attachmentUrl} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
