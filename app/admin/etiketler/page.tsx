import { Plus, Trash2, Tag as TagIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { TagBadge } from "@/components/ui/tag-badge";
import { TagFormCreate } from "./_components/tag-form-create";
import { deleteTag } from "./actions";

export const dynamic = "force-dynamic";

const SCOPE_LABEL: Record<string, string> = {
  STUDENT: "Öğrenci",
  TEACHER: "Öğretmen",
  PARENT: "Veli",
  GENERAL: "Genel",
};

export default async function EtiketlerPage() {
  await requireAdmin();
  const tags = await prisma.tag.findMany({
    orderBy: [{ scope: "asc" }, { label: "asc" }],
    include: { _count: { select: { students: true } } },
  });

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <h1 className="pd-page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TagIcon size={20} /> Etiketler
          </h1>
          <p className="pd-page-subtitle">CRM segmentleri, hızlı filtre ve risk skoru için etiketler.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, alignItems: "flex-start" }}>
        <div className="pd-card" style={{ padding: 0 }}>
          {tags.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--pd-muted-2)" }}>
              Henüz etiket yok.
            </div>
          ) : (
            tags.map((t: any) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--pd-border)",
                }}
              >
                <TagBadge color={t.color} label={t.label} />
                <code style={{ fontSize: 11, color: "var(--pd-muted-2)" }}>{t.key}</code>
                <span className="pd-chip" style={{ fontSize: 11 }}>{SCOPE_LABEL[t.scope] ?? t.scope}</span>
                {t.isSystem && (
                  <span className="pd-chip" style={{ fontSize: 10, background: "#fef3c7" }}>Sistem</span>
                )}
                {t.description && (
                  <span style={{ fontSize: 12, color: "var(--pd-muted-2)", flex: 1 }}>{t.description}</span>
                )}
                <span style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>{t._count.students} öğrenci</span>
                {!t.isSystem && (
                  <form action={deleteTag}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="pd-btn-ghost" style={{ color: "#ef4444" }} title="Sil">
                      <Trash2 size={14} />
                    </button>
                  </form>
                )}
              </div>
            ))
          )}
        </div>

        <div>
          <h3 style={{ fontSize: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> Yeni etiket
          </h3>
          <TagFormCreate />
        </div>
      </div>
    </div>
  );
}
