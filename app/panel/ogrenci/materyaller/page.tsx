import { ExternalLink, FileText, Library, Link2, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PAGE_EYEBROW_CLASS,
  PAGE_TITLE_CLASS,
  PAGE_DESCRIPTION_CLASS,
  EmptyState,
  StatusBadge,
  buttonClass,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";
export default async function StudentMaterialsPage() {
  const session = await requireRole("STUDENT");
  const flags = getPanelFeatureFlags();
  const accessibilityEnabled = flags.accessibilityProfile;
  const [profile, preference, networkPreference] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    }),
    accessibilityEnabled
      ? prisma.accessibilityPreference.findUnique({
          where: { userId: session.userId },
          select: { captionsPreferred: true, transcriptPreferred: true },
        })
      : null,
    flags.offlineMode
      ? prisma.networkPreference.findUnique({
          where: { userId: session.userId },
          select: { lowDataMode: true },
        })
      : null,
  ]);
  const materials = profile
    ? await prisma.learningMaterial.findMany({
        where: {
          isActive: true,
          group: {
            enrollments: { some: { studentId: profile.id, endedAt: null } },
          },
        },
        orderBy: { createdAt: "desc" },
        include: { group: { select: { name: true, subject: true } } },
      })
    : [];
  const lowDataMode = Boolean(networkPreference?.lowDataMode);
  const score = (material: (typeof materials)[number]) =>
    Number(
      Boolean(preference?.captionsPreferred && material.captionsAvailable),
    ) +
    Number(Boolean(preference?.transcriptPreferred && material.transcript)) +
    Number(Boolean(lowDataMode && material.transcript)) * 3 +
    Number(Boolean(lowDataMode && material.kind === "LINK"));
  const ordered = [...materials].sort(
    (a, b) =>
      score(b) - score(a) || b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const icons = { LINK: Link2, PDF: FileText, VIDEO: Video };
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <header>
        <p className={PAGE_EYEBROW_CLASS}>
          <Library size={15} /> Kaynaklarım
        </p>
        <h1 className={PAGE_TITLE_CLASS}>
          İhtiyacın olan her şey burada.
        </h1>
        {lowDataMode ? (
          <p className={PAGE_DESCRIPTION_CLASS}>
            Düşük veri açık: metin dökümleri ve bağlantılar önce; büyük dosyalar
            yalnız siz açarsanız yüklenir.
          </p>
        ) : preference?.captionsPreferred || preference?.transcriptPreferred ? (
          <p className={PAGE_DESCRIPTION_CLASS}>
            Altyazı ve metin tercihinle eşleşen kaynaklar önce gösterilir.
          </p>
        ) : null}
      </header>
      <div className="mt-6 max-w-[880px] border-t border-pn-border">
        {ordered.map((material) => {
          const Icon = icons[material.kind];
          const href = material.blobPathname
            ? `/api/panel/materials/${material.id}/file`
            : material.url;
          const preferred = score(material) > 0;
          const dataHeavy =
            material.kind === "VIDEO" || material.kind === "PDF";
          return (
            <article
              key={material.id}
              className="flex flex-wrap items-start gap-x-4 gap-y-3 border-b border-pn-border py-4"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-pn-surface-subtle text-pn-text-muted">
                <Icon size={17} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-semibold text-pn-text">{material.title}</h2>
                  {preferred ? <StatusBadge label="Tercihinle uyumlu" tone="success" /> : null}
                  {material.captionsAvailable ? <StatusBadge label="Altyazı var" tone="info" /> : null}
                  {material.transcript ? <StatusBadge label="Metin dökümü var" tone="neutral" /> : null}
                </div>
                <p className="mt-0.5 text-[12.5px] text-pn-text-muted">
                  {material.group.name} · {material.group.subject}
                </p>
                <p className="mt-1.5 text-[14px] leading-[1.6] text-pn-text-secondary">
                  {material.description || "Öğretmeninin paylaştığı çalışma kaynağı."}
                </p>
                {material.transcript ? (
                  <details open={lowDataMode || undefined} className="mt-2">
                    <summary className="cursor-pointer text-[13px] font-medium text-pn-text">
                      Metin dökümünü oku
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap rounded-md border border-pn-border bg-pn-surface-subtle p-3 text-[13px] leading-6 text-pn-text-secondary">
                      {material.transcript}
                    </p>
                  </details>
                ) : null}
              </div>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className={buttonClass("secondary", "sm", "shrink-0")}
              >
                {lowDataMode && dataHeavy
                  ? `${material.kind === "VIDEO" ? "Videoyu" : "PDF’i"} aç (veri kullanır)`
                  : "Kaynağı aç"}{" "}
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </article>
          );
        })}
        {!ordered.length ? (
          <EmptyState
            className="mt-4"
            title="Henüz paylaşılmış kaynak yok."
            body="Öğretmenin ders kaynağı paylaştığında burada görünecek."
          />
        ) : null}
      </div>
    </PanelShell>
  );
}
