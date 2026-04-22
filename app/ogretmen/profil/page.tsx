import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { updateTeacherProfileAction, changeTeacherPasswordAction } from "../actions";
import { Lock, User } from "lucide-react";

export const dynamic = "force-dynamic";

type TeacherWithUser = Prisma.UserGetPayload<{
  include: { teacher: true };
}>;

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

const successMessages: Record<string, string> = {
  profile: "Profil bilgileriniz kaydedildi.",
  password: "Şifreniz güncellendi.",
};
const errorMessages: Record<string, string> = {
  "wrong-password": "Mevcut şifreniz hatalı.",
  "password-mismatch": "Yeni şifreler uyuşmuyor.",
  "password-short": "Yeni şifre en az 6 karakter olmalı.",
  "profile-error": "Profil güncellenirken bir hata oluştu.",
  "password-error": "Şifre değiştirilirken bir hata oluştu.",
};

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

export default async function OgretmenProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const params = await searchParams;

  const user = (await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { teacher: true },
  })) as unknown as TeacherWithUser | null;

  const teacher = user?.teacher;
  if (!teacher) redirect("/ogretmen");

  const initials = teacher.fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div className="pd-page-header">
        <h1 className="pd-page-title">Profilim</h1>
        <p className="pd-page-sub">Hesap bilgilerinizi ve güvenlik ayarlarınızı buradan yönetin.</p>
      </div>

      <div className="pd-page-body" style={{ maxWidth: 680 }}>
        {params.success && successMessages[params.success] && (
          <div style={{ background: "#e8f5ef", border: "1px solid #b3dfc7", color: "#0d5c3d", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {successMessages[params.success]}
          </div>
        )}
        {params.error && errorMessages[params.error] && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {errorMessages[params.error]}
          </div>
        )}

        {/* Avatar card */}
        <div className="pd-card" style={{ marginBottom: 16 }}>
          <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
            <div className="pd-avatar" style={{ width: 60, height: 60, fontSize: 20, borderRadius: 16 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, color: "var(--pd-ink)" }}>{teacher.fullName}</div>
              {user?.email && <div style={{ fontSize: 13, color: "var(--pd-muted)", marginTop: 3 }}>{user.email}</div>}
              {teacher.subjects && (
                <div style={{ fontSize: 12, color: "var(--pd-muted-2)", marginTop: 4 }}>{teacher.subjects}</div>
              )}
            </div>
          </div>
        </div>

        <Section title="Profil Bilgileri" icon={<User size={15} />}>
          <form action={updateTeacherProfileAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Ad Soyad</label>
                <input name="fullName" required defaultValue={teacher.fullName} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>E-posta (hesap)</label>
                <input
                  type="email"
                  value={user?.email ?? ""}
                  disabled
                  style={{ ...fieldStyle, background: "var(--pd-bg-subtle)", color: "var(--pd-muted)", cursor: "not-allowed" }}
                />
              </div>
              <div>
                <label style={labelStyle}>Telefon</label>
                <input name="phone" defaultValue={teacher.phone ?? ""} style={fieldStyle} placeholder="+90 555 000 0000" />
              </div>
              <div>
                <label style={labelStyle}>Branşlar</label>
                <input name="subjects" required defaultValue={teacher.subjects} style={fieldStyle} placeholder="Matematik, Fizik" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Hakkımda / Bio</label>
                <textarea
                  name="bio"
                  rows={3}
                  defaultValue={teacher.bio ?? ""}
                  placeholder="Branşınızı ve çalışma yaklaşımınızı kısaca yazın"
                  style={{ ...fieldStyle, resize: "none" }}
                />
              </div>
            </div>
            <button type="submit" className="pd-btn pd-btn-accent" style={{ width: "100%", justifyContent: "center", padding: "10px 0" }}>
              Bilgileri Kaydet
            </button>
          </form>
        </Section>

        <div style={{ marginTop: 16 }}>
          <Section title="Şifre Değiştir" icon={<Lock size={15} />}>
            <form action={changeTeacherPasswordAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { name: "currentPassword", label: "Mevcut Şifre", autocomplete: "current-password" },
                { name: "newPassword", label: "Yeni Şifre", autocomplete: "new-password" },
                { name: "confirmPassword", label: "Yeni Şifre (Tekrar)", autocomplete: "new-password" },
              ].map((f) => (
                <div key={f.name}>
                  <label style={labelStyle}>{f.label}</label>
                  <input
                    type="password"
                    name={f.name}
                    autoComplete={f.autocomplete}
                    required
                    minLength={6}
                    style={fieldStyle}
                    placeholder="••••••••"
                  />
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
