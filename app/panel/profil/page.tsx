import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen, Goal, Lock, TrendingUp, User } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { changePasswordAction, updateStudentProfileAction } from "@/app/panel/actions";

export const dynamic = "force-dynamic";

type UserWithStudent = Prisma.UserGetPayload<{
  include: {
    student: {
      include: {
        goals: true;
        metricSnapshots: true;
      };
    };
  };
}>;

type Props = { searchParams?: Promise<{ error?: string; success?: string }> };

const CLASS_LEVELS = ["8. Sınıf", "9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "Mezun"];
const EXAM_TYPES = ["YKS", "LGS", "TYT-AYT"];

const passwordErrors: Record<string, string> = {
  missing: "Lütfen tüm alanları doldurun.",
  short: "Yeni şifre en az 6 karakter olmalıdır.",
  mismatch: "Yeni şifreler eşleşmiyor.",
  wrong: "Mevcut şifreniz hatalı.",
};

const fieldStyle = {
  width: "100%",
  border: "1px solid var(--pd-line)",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  background: "var(--pd-bg-elevated)",
  color: "var(--pd-ink)",
  outline: "none",
} as const;

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--pd-muted)",
  display: "block",
  marginBottom: 5,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
} as const;

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="pd-card">
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--pd-line)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--pd-accent)" }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--pd-ink)" }}>{title}</span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

export default async function PanelProfilPage({ searchParams }: Props) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      student: {
        include: {
          goals: { where: { status: "ACTIVE" }, orderBy: { dueAt: "asc" }, take: 4 },
          metricSnapshots: { orderBy: { endsAt: "desc" }, take: 6 },
        },
      },
    },
  }) as unknown as UserWithStudent | null;

  const student = user?.student;
  if (!student) redirect("/panel");

  const sp = await searchParams;
  const errorKey = sp?.error ?? "";
  const successKey = sp?.success ?? "";

  const initials = student.fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const netSnapshots = student.metricSnapshots
    .filter((snapshot) => snapshot.metricKey === "net_average")
    .slice(0, 3);

  return (
    <>
      <div className="pd-page-header">
        <h1 className="pd-page-title">Profilim</h1>
        <p className="pd-page-sub">Kişisel bilgilerinizi, hedeflerinizi ve hesap güvenliğinizi yönetin.</p>
      </div>

      <div className="pd-page-body" style={{ maxWidth: 820 }}>
        <div className="pd-card" style={{ marginBottom: 16 }}>
          <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div className="pd-avatar" style={{ width: 60, height: 60, fontSize: 20, borderRadius: 16 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, color: "var(--pd-ink)" }}>{student.fullName}</div>
              {user?.email ? <div style={{ fontSize: 13, color: "var(--pd-muted)", marginTop: 3 }}>{user.email}</div> : null}
              {student.activePackage ? (
                <span className="pd-chip pd-chip-accent" style={{ display: "inline-flex", marginTop: 8 }}>
                  <BookOpen size={11} /> {student.activePackage}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16, marginBottom: 16 }}>
          <Section title="Aktif Hedefler" icon={<Goal size={15} />}>
            {student.goals.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--pd-muted)" }}>Aktif hedef tanımlı değil.</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {student.goals.map((goal) => {
                  const targetValue = goal.targetValue ? Number(goal.targetValue) : 0;
                  const currentValue = goal.currentValue ? Number(goal.currentValue) : 0;
                  const pct = targetValue > 0 ? Math.min(100, Math.round((currentValue / targetValue) * 100)) : 0;
                  return (
                    <div key={goal.id} style={{ border: "1px solid var(--pd-line)", borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--pd-ink)" }}>{goal.title}</div>
                      {goal.description ? <div style={{ marginTop: 4, fontSize: 12, color: "var(--pd-muted)" }}>{goal.description}</div> : null}
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
                        <span style={{ color: "var(--pd-muted)" }}>{goal.unit ?? "hedef"}</span>
                        <span style={{ color: "var(--pd-ink-2)", fontWeight: 600 }}>
                          {currentValue}/{targetValue || "—"}
                        </span>
                      </div>
                      <div style={{ marginTop: 8, height: 6, background: "var(--pd-bg-subtle)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "var(--pd-accent)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <Section title="Performans Özeti" icon={<TrendingUp size={15} />}>
            {netSnapshots.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--pd-muted)" }}>Henüz performans snapshot verisi yok.</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {netSnapshots.map((snapshot) => (
                  <div key={snapshot.id} style={{ border: "1px solid var(--pd-line)", borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 12, color: "var(--pd-muted)" }}>
                      {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(snapshot.startsAt))}
                      {" – "}
                      {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(snapshot.endsAt))}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 24, fontWeight: 600, color: "var(--pd-ink)" }}>
                      {Number(snapshot.value).toFixed(1)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--pd-muted)" }}>{snapshot.unit ?? "ölçüm"}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <Section title="Kişisel Bilgiler" icon={<User size={15} />}>
          {successKey === "profile" ? (
            <div style={{ background: "#e8f5ef", border: "1px solid #b3dfc7", color: "#0d5c3d", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              Bilgileriniz kaydedildi.
            </div>
          ) : null}
          <form action={updateStudentProfileAction} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>İletişim</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Telefon</label>
                  <input name="phone" defaultValue={student.phone ?? ""} style={fieldStyle} placeholder="05xx xxx xx xx" />
                </div>
                <div>
                  <label style={labelStyle}>Şehir</label>
                  <input name="city" defaultValue={student.city ?? ""} style={fieldStyle} placeholder="İstanbul" />
                </div>
                <div>
                  <label style={labelStyle}>İlçe</label>
                  <input name="district" defaultValue={student.district ?? ""} style={fieldStyle} placeholder="Kadıköy" />
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Akademik Bilgiler</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Sınav Türü</label>
                  <select name="examType" defaultValue={student.examType ?? ""} style={fieldStyle}>
                    <option value="">Seçiniz</option>
                    {EXAM_TYPES.map((examType) => <option key={examType} value={examType}>{examType}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Sınıf</label>
                  <select name="classLevel" defaultValue={student.classLevel ?? ""} style={fieldStyle}>
                    <option value="">Seçiniz</option>
                    {CLASS_LEVELS.map((classLevel) => <option key={classLevel} value={classLevel}>{classLevel}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Okul Adı</label>
                  <input name="schoolName" defaultValue={student.schoolName ?? ""} style={fieldStyle} placeholder="Okul adınızı girin" />
                </div>
                <div>
                  <label style={labelStyle}>Hedef Okul / Üniversite</label>
                  <input name="targetSchool" defaultValue={student.targetSchool ?? ""} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Hedef (Puan / Sıralama)</label>
                  <input name="targetGoal" defaultValue={student.targetGoal ?? ""} style={fieldStyle} placeholder="Örn: 450 puan" />
                </div>
                <div>
                  <label style={labelStyle}>Hedef Bölüm</label>
                  <input name="department" defaultValue={student.department ?? ""} style={fieldStyle} placeholder="Örn: Tıp, Hukuk" />
                </div>
                <div>
                  <label style={labelStyle}>Mevcut Net</label>
                  <input name="currentNet" defaultValue={student.currentNet ?? ""} style={fieldStyle} placeholder="Örn: TYT 80 net" />
                </div>
                <div>
                  <label style={labelStyle}>Güçlü Dersler</label>
                  <input name="strongLessons" defaultValue={student.strongLessons ?? ""} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Zayıf Dersler</label>
                  <input name="weakLessons" defaultValue={student.weakLessons ?? ""} style={fieldStyle} />
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Veli Bilgileri</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Veli Adı Soyadı</label>
                  <input name="parentFullName" defaultValue={student.parentFullName ?? ""} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Veli Telefonu</label>
                  <input name="parentPhone" defaultValue={student.parentPhone ?? ""} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Veli E-postası</label>
                  <input type="email" name="parentEmail" defaultValue={student.parentEmail ?? ""} style={fieldStyle} />
                </div>
              </div>
            </div>

            <button type="submit" className="pd-btn pd-btn-accent" style={{ width: "100%", justifyContent: "center", padding: "10px 0" }}>
              Bilgileri Kaydet
            </button>
          </form>
        </Section>

        <div style={{ marginTop: 16 }}>
          <Section title="Şifre Güncelle" icon={<Lock size={15} />}>
            {successKey === "password" ? (
              <div style={{ background: "#e8f5ef", border: "1px solid #b3dfc7", color: "#0d5c3d", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                Şifreniz güncellendi.
              </div>
            ) : null}
            {errorKey && passwordErrors[errorKey] ? (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                {passwordErrors[errorKey]}
              </div>
            ) : null}
            <form action={changePasswordAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { name: "currentPassword", label: "Mevcut Şifre", autocomplete: "current-password" },
                { name: "newPassword", label: "Yeni Şifre", autocomplete: "new-password" },
                { name: "confirmPassword", label: "Yeni Şifre (Tekrar)", autocomplete: "new-password" },
              ].map((field) => (
                <div key={field.name}>
                  <label style={labelStyle}>{field.label}</label>
                  <input type="password" name={field.name} autoComplete={field.autocomplete} required style={fieldStyle} placeholder="••••••••" />
                </div>
              ))}
              <button type="submit" className="pd-btn pd-btn-ghost" style={{ width: "100%", justifyContent: "center", padding: "10px 0", marginTop: 4 }}>
                Şifreyi Kaydet
              </button>
            </form>
          </Section>
        </div>
      </div>
    </>
  );
}
