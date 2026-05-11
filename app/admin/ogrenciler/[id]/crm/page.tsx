import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, MessageSquare, Paperclip, Tag as TagIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  StudentNotesPanel, StudentCommentsPanel, StudentFilesPanel,
} from "@/components/student-crm/student-crm-panels";
import { TagBadge } from "@/components/ui/tag-badge";
import {
  addStudentNote, deleteStudentNote,
  addTeacherComment, deleteTeacherComment,
  addStudentFile, deleteStudentFile,
} from "@/lib/student-crm";
import {
  assignTagToStudent, removeTagFromStudent,
} from "@/app/admin/etiketler/actions";

export const dynamic = "force-dynamic";

export default async function StudentCrmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      studentNotes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true, email: true } } },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        include: { teacher: { select: { id: true, user: { select: { name: true } } } } },
      },
      files: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { name: true, email: true } } },
      },
      tags: {
        include: { tag: true },
        orderBy: { assignedAt: "desc" },
      },
    },
  });
  if (!student) notFound();

  const allTags = await prisma.tag.findMany({
    where: { scope: { in: ["STUDENT", "GENERAL"] } },
    orderBy: { label: "asc" },
  });
  const assignedTagIds = new Set(student.tags.map((t: any) => t.tagId));
  const availableTags = allTags.filter((t: any) => !assignedTagIds.has(t.id));

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <Link href={`/admin/ogrenciler/${student.id}`} className="pd-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            <ArrowLeft size={14} /> Öğrenci detayına dön
          </Link>
          <h1 className="pd-page-title">CRM — {student.user?.name ?? student.user?.email ?? student.fullName}</h1>
          <p className="pd-page-subtitle">Notlar, öğretmen yorumları, dosyalar ve etiketler.</p>
        </div>
      </div>

      {/* Etiketler */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <TagIcon size={16} /> Etiketler
        </h2>
        <div className="pd-card" style={{ padding: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {student.tags.length === 0 ? (
              <span style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>Etiket yok.</span>
            ) : (
              student.tags.map((st: any) => (
                <TagBadge
                  key={st.tagId}
                  color={st.tag.color}
                  label={st.tag.label}
                  onRemove={
                    <form action={removeTagFromStudent} style={{ display: "inline" }}>
                      <input type="hidden" name="studentId" value={student.id} />
                      <input type="hidden" name="tagId" value={st.tagId} />
                      <button type="submit" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: 4, fontSize: 12 }}>×</button>
                    </form>
                  }
                />
              ))
            )}
          </div>
          {availableTags.length > 0 && (
            <form action={assignTagToStudent} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="hidden" name="studentId" value={student.id} />
              <select name="tagId" required className="pd-input" style={{ flex: 1 }} defaultValue="">
                <option value="" disabled>Etiket seç…</option>
                {availableTags.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <input name="note" placeholder="Not (opsiyonel)" className="pd-input" style={{ width: 200 }} />
              <button type="submit" className="pd-btn-accent">Ekle</button>
            </form>
          )}
        </div>
      </section>

      {/* Notlar */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <FileText size={16} /> İç Notlar
        </h2>
        <StudentNotesPanel
          studentId={student.id}
          notes={student.studentNotes as any}
          canMarkPrivate={true}
          onAdd={addStudentNote}
          onDelete={deleteStudentNote}
        />
      </section>

      {/* Yorumlar */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <MessageSquare size={16} /> Öğretmen Yorumları
        </h2>
        <StudentCommentsPanel
          studentId={student.id}
          comments={student.comments as any}
          onAdd={addTeacherComment}
          onDelete={deleteTeacherComment}
        />
      </section>

      {/* Dosyalar */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Paperclip size={16} /> Dosyalar
        </h2>
        <StudentFilesPanel
          studentId={student.id}
          files={student.files as any}
          onAdd={addStudentFile}
          onDelete={deleteStudentFile}
        />
      </section>
    </div>
  );
}
