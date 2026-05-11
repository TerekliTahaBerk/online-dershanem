import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, School, Users, GraduationCap, CalendarDays, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { ClassroomForm } from "../_components/classroom-form";
import {
  updateClassroom, deleteClassroom,
  addTeacherToClassroom, removeTeacherFromClassroom,
  addStudentToClassroom, removeStudentFromClassroom,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function SinifDetayPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const classroom = await prisma.classroom.findUnique({
    where: { id },
    include: {
      teachers: {
        include: { teacher: { include: { user: { select: { name: true, email: true } } } } },
      },
      students: {
        where: { leftAt: null },
        include: { student: { include: { user: { select: { name: true, email: true } } } } },
        orderBy: { joinedAt: "desc" },
      },
      _count: { select: { lessons: true, assignments: true, attendances: true } },
    },
  });
  if (!classroom) notFound();

  const [allTeachers, allStudents] = await Promise.all([
    prisma.teacher.findMany({
      where: { id: { notIn: classroom.teachers.map((t: any) => t.teacherId) } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.student.findMany({
      where: { id: { notIn: classroom.students.map((s: any) => s.studentId) } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
      take: 200,
    }),
  ]);

  const updateBound = updateClassroom.bind(null, classroom.id);

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <Link href="/admin/siniflar" className="pd-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            <ArrowLeft size={14} /> Sınıflar
          </Link>
          <h1 className="pd-page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <School size={20} /> {classroom.name}
            {classroom.branch && <span className="pd-chip">{classroom.branch}</span>}
            <span className="pd-chip">{classroom.level}</span>
          </h1>
        </div>
        <form action={deleteClassroom}>
          <input type="hidden" name="id" value={classroom.id} />
          <button type="submit" className="pd-btn-ghost" style={{ color: "#ef4444" }}>
            <Trash2 size={14} /> Sil
          </button>
        </form>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
        <Kpi icon={<Users size={16} />} label="Öğrenciler" value={`${classroom.students.length} / ${classroom.capacity}`} />
        <Kpi icon={<GraduationCap size={16} />} label="Öğretmenler" value={String(classroom.teachers.length)} />
        <Kpi icon={<CalendarDays size={16} />} label="Dersler" value={String(classroom._count.lessons)} />
        <Kpi icon={<School size={16} />} label="Ödevler" value={String(classroom._count.assignments)} />
      </div>

      {/* Düzenle */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Sınıf bilgileri</h2>
        <ClassroomForm
          action={updateBound}
          mode="edit"
          defaults={{
            name: classroom.name,
            branch: classroom.branch,
            level: classroom.level,
            capacity: classroom.capacity,
            description: classroom.description,
            isActive: classroom.isActive,
          }}
        />
      </section>

      {/* Öğretmenler */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Öğretmenler</h2>
        <div className="pd-card" style={{ padding: 0 }}>
          {classroom.teachers.length === 0 ? (
            <div style={{ padding: 16, color: "var(--pd-muted-2)" }}>Henüz öğretmen atanmamış.</div>
          ) : (
            <div>
              {classroom.teachers.map((ct: any) => (
                <div key={ct.teacherId} style={{ display: "flex", padding: "10px 14px", borderBottom: "1px solid var(--pd-border)", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <strong>{ct.teacher.user.name ?? ct.teacher.user.email}</strong>
                    {ct.subject && <span className="pd-chip" style={{ marginLeft: 8, fontSize: 11 }}>{ct.subject}</span>}
                    {ct.isLead && <span className="pd-chip" style={{ marginLeft: 8, fontSize: 11, background: "#fef3c7" }}>Lider</span>}
                  </div>
                  <form action={removeTeacherFromClassroom}>
                    <input type="hidden" name="classroomId" value={classroom.id} />
                    <input type="hidden" name="teacherId" value={ct.teacherId} />
                    <button type="submit" className="pd-btn-ghost" style={{ color: "#ef4444" }}>Çıkar</button>
                  </form>
                </div>
              ))}
            </div>
          )}
          <form action={addTeacherToClassroom} style={{ padding: 12, display: "flex", gap: 8, alignItems: "center", borderTop: "1px solid var(--pd-border)" }}>
            <input type="hidden" name="classroomId" value={classroom.id} />
            <select name="teacherId" required className="pd-input" style={{ flex: 1 }} defaultValue="">
              <option value="" disabled>Öğretmen seç…</option>
              {allTeachers.map((t: any) => (
                <option key={t.id} value={t.id}>{t.user.name ?? t.user.email}</option>
              ))}
            </select>
            <input name="subject" placeholder="Branş (opsiyonel)" className="pd-input" style={{ width: 180 }} />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
              <input type="checkbox" name="isLead" /> Lider
            </label>
            <button type="submit" className="pd-btn-accent">Ekle</button>
          </form>
        </div>
      </section>

      {/* Öğrenciler */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Öğrenciler</h2>
        <div className="pd-card" style={{ padding: 0 }}>
          {classroom.students.length === 0 ? (
            <div style={{ padding: 16, color: "var(--pd-muted-2)" }}>Henüz öğrenci eklenmemiş.</div>
          ) : (
            <div>
              {classroom.students.map((cs: any) => (
                <div key={cs.studentId} style={{ display: "flex", padding: "10px 14px", borderBottom: "1px solid var(--pd-border)", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <Link href={`/admin/ogrenciler/${cs.studentId}`} className="pd-link" style={{ textDecoration: "none" }}>
                      <strong>{cs.student.user.name ?? cs.student.user.email}</strong>
                    </Link>
                    <span style={{ marginLeft: 8, fontSize: 12, color: "var(--pd-muted-2)" }}>
                      {new Date(cs.joinedAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  <form action={removeStudentFromClassroom}>
                    <input type="hidden" name="classroomId" value={classroom.id} />
                    <input type="hidden" name="studentId" value={cs.studentId} />
                    <button type="submit" className="pd-btn-ghost" style={{ color: "#ef4444" }}>Çıkar</button>
                  </form>
                </div>
              ))}
            </div>
          )}
          <form action={addStudentToClassroom} style={{ padding: 12, display: "flex", gap: 8, alignItems: "center", borderTop: "1px solid var(--pd-border)" }}>
            <input type="hidden" name="classroomId" value={classroom.id} />
            <select name="studentId" required className="pd-input" style={{ flex: 1 }} defaultValue="">
              <option value="" disabled>Öğrenci seç…</option>
              {allStudents.map((s: any) => (
                <option key={s.id} value={s.id}>{s.user.name ?? s.user.email}</option>
              ))}
            </select>
            <button type="submit" className="pd-btn-accent">Ekle</button>
          </form>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="pd-kpi-card">
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--pd-muted-2)", fontSize: 12 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  );
}
