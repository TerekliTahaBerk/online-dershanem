import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Heart, Trash2, User as UserIcon, Star } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { ParentForm } from "../_components/parent-form";
import { InviteButton } from "../_components/invite-button";
import {
  updateParent, deleteParent,
  linkStudentToParent, unlinkStudentFromParent,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function VeliDetayPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const parent = await prisma.parent.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, role: true } },
      students: {
        include: { student: { include: { user: { select: { name: true, email: true } } } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!parent) notFound();

  const linkedIds = new Set(parent.students.map((s: any) => s.studentId));
  const availableStudents = await prisma.student.findMany({
    where: { id: { notIn: Array.from(linkedIds) as string[] } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { fullName: "asc" },
    take: 300,
  });

  const updateBound = updateParent.bind(null, parent.id);

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <Link href="/admin/veliler" className="pd-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            <ArrowLeft size={14} /> Veliler
          </Link>
          <h1 className="pd-page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Heart size={20} /> {parent.fullName}
            {parent.user && <span className="pd-chip" style={{ background: "#d1fae5", color: "#065f46" }}>Panel hesabı bağlı</span>}
          </h1>
        </div>
        <form action={deleteParent}>
          <input type="hidden" name="id" value={parent.id} />
          <button type="submit" className="pd-btn-ghost" style={{ color: "#ef4444" }}>
            <Trash2 size={14} /> Sil
          </button>
        </form>
      </div>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, marginBottom: 8 }}>Veli bilgileri</h2>
        <ParentForm
          action={updateBound}
          mode="edit"
          defaults={{
            fullName: parent.fullName,
            email: parent.email,
            phone: parent.phone,
            notes: parent.notes,
          }}
        />
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, marginBottom: 8 }}>Panel davetı</h2>
        <div className="pd-card" style={{ padding: 14 }}>
          <InviteButton
            parentId={parent.id}
            hasUser={Boolean(parent.user)}
            hasEmail={Boolean(parent.email)}
          />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 15, marginBottom: 8 }}>Bağlı öğrenciler</h2>
        <div className="pd-card" style={{ padding: 0 }}>
          {parent.students.length === 0 ? (
            <div style={{ padding: 14, color: "var(--pd-muted-2)" }}>Bu velinin bağlı öğrencisi yok.</div>
          ) : (
            parent.students.map((ps: any) => (
              <div key={ps.studentId} style={{ display: "flex", padding: "10px 14px", borderBottom: "1px solid var(--pd-border)", alignItems: "center", gap: 8 }}>
                <UserIcon size={14} />
                <Link href={`/admin/ogrenciler/${ps.studentId}`} className="pd-link" style={{ textDecoration: "none", flex: 1 }}>
                  <strong>{ps.student.user?.name ?? ps.student.fullName}</strong>
                </Link>
                {ps.relationship && <span className="pd-chip" style={{ fontSize: 11 }}>{ps.relationship}</span>}
                {ps.isPrimary && <span className="pd-chip" style={{ fontSize: 11, background: "#fef3c7" }}><Star size={10} /> Birincil</span>}
                <form action={unlinkStudentFromParent}>
                  <input type="hidden" name="parentId" value={parent.id} />
                  <input type="hidden" name="studentId" value={ps.studentId} />
                  <button type="submit" className="pd-btn-ghost" style={{ color: "#ef4444" }}>Kaldır</button>
                </form>
              </div>
            ))
          )}
          <form action={linkStudentToParent} style={{ padding: 12, display: "flex", gap: 8, alignItems: "center", borderTop: "1px solid var(--pd-border)" }}>
            <input type="hidden" name="parentId" value={parent.id} />
            <select name="studentId" required className="pd-input" style={{ flex: 1 }} defaultValue="">
              <option value="" disabled>Öğrenci seç…</option>
              {availableStudents.map((s: any) => (
                <option key={s.id} value={s.id}>{s.user?.name ?? s.fullName}</option>
              ))}
            </select>
            <input name="relationship" placeholder="İlişki (Anne/Baba/Vasi)" className="pd-input" style={{ width: 200 }} />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
              <input type="checkbox" name="isPrimary" /> Birincil
            </label>
            <button type="submit" className="pd-btn-accent">Bağla</button>
          </form>
        </div>
      </section>
    </div>
  );
}
