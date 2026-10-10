import { loadTeacherHelpInbox } from "@/lib/panel/teacher-help-server";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelCard, PanelPageHeader } from "@/components/panel/ui";
import { TeacherHelpRequests } from "@/components/panel/teacher-help-requests";

function countBand(value: number): "0" | "1-5" | "6-20" | "21+" {
  return value === 0 ? "0" : value <= 5 ? "1-5" : value <= 20 ? "6-20" : "21+";
}

export const dynamic = "force-dynamic";

export default async function TeacherHelpPage() {
  const session = await requireRole("TEACHER");
  if (!getPanelFeatureFlags().studentCheckIn) notFound();

  const now = new Date();
  // Ortak yükleyici (mobil `GET /api/panel/staff/teacher/help` ile aynı sorgu ve kapsam).
  const visibleItems = await loadTeacherHelpInbox(session.userId);

  const rows = visibleItems
    .map((item) => ({
      id: item.id,
      studentName: item.student.user.fullName || item.student.user.email,
      groupName: item.group?.name ?? "Yön Koçluk",
      energy: item.checkIn.energy,
      confidence: item.checkIn.confidence,
      barrier: item.checkIn.barrier,
      status: item.status as "OPEN" | "RESPONDED",
      dueAt: item.dueAt.toISOString(),
      version: item.version,
      helpful: item.helpful,
      responseAction: item.responses[0]?.action || null,
    }));

  const open = rows.filter((item) => item.status === "OPEN");
  await recordPanelProductEvent(
    {
      name: "student_help_inbox_viewed",
      properties: {
        openCountBand: countBand(open.length),
        overdueCountBand: countBand(
          open.filter((item) => new Date(item.dueAt) < now).length,
        ),
      },
    },
    session.role,
  );

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Yardım İsteyenler"
    >
      <div className="max-w-[1040px]">
        <PanelPageHeader
          title="Yardım İsteyenler"
          description="Öğrencinin açıkça paylaştığı yardım taleplerini gör, küçük destek adımını seç."
        />

        <PanelCard className="mt-6">
          <TeacherHelpRequests rows={rows} />
        </PanelCard>
      </div>
    </PanelShell>
  );
}
