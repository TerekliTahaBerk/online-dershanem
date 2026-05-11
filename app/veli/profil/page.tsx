import { redirect } from "next/navigation";
import { requireParent } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function VeliProfilPage() {
  const { session, parentId, isAdmin } = await requireParent();
  if (!parentId && !isAdmin) redirect("/giris");

  const parent = parentId
    ? await prisma.parent.findUnique({
        where: { id: parentId },
        include: { user: { select: { email: true, name: true, createdAt: true } } },
      })
    : null;

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <h1 className="pd-page-title">Profilim</h1>
          <p className="pd-page-subtitle">Hesap bilgilerim.</p>
        </div>
      </div>

      <div className="pd-card" style={{ padding: 20, maxWidth: 560 }}>
        <Field label="Ad Soyad" value={parent?.fullName ?? session.user?.name ?? "—"} />
        <Field label="E-posta" value={parent?.user?.email ?? session.user?.email ?? "—"} />
        <Field label="Telefon" value={parent?.phone ?? "—"} />
        <Field
          label="Üyelik Tarihi"
          value={
            parent?.user?.createdAt
              ? new Date(parent.user.createdAt).toLocaleDateString("tr-TR")
              : "—"
          }
        />
        <p style={{ marginTop: 16, fontSize: 12, color: "var(--pd-muted-2)" }}>
          Bilgilerinizi güncellemek için kurum yöneticisine başvurun.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--pd-line)" }}>
      <span style={{ color: "var(--pd-muted-2)" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
