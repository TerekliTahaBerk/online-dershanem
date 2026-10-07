import { Library } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { TeacherMaterialManager } from "@/components/panel/teacher-material-manager";
import { PAGE_EYEBROW_CLASS, PAGE_TITLE_CLASS } from "@/components/panel/ui";

export const dynamic = "force-dynamic";
export default async function TeacherMaterialsPage() {
  const session = await requireRole("TEACHER");
  const [groups, materials] = await Promise.all([
    prisma.group.findMany({
      where: { teacherId: session.userId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, subject: true },
    }),
    prisma.learningMaterial.findMany({
      where: { group: { teacherId: session.userId } },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { group: { select: { name: true } } },
    }),
  ]);
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <header className="mb-7">
        <p className={PAGE_EYEBROW_CLASS}>
          <Library size={15} /> Kaynak kütüphanesi
        </p>
        <h1 className={PAGE_TITLE_CLASS}>
          Doğru kaynak, doğru grubun önünde.
        </h1>
      </header>
      <TeacherMaterialManager
        groups={groups}
        materials={materials.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description || "",
          url: item.blobPathname
            ? `/api/panel/materials/${item.id}/file`
            : item.url,
          kind: item.kind,
          groupName: item.group.name,
          isActive: item.isActive,
          captionsAvailable: item.captionsAvailable,
          transcript: item.transcript || "",
        }))}
      />
    </PanelShell>
  );
}
