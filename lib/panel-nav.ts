import { getSectionsForRole } from "@/components/panel/shell/sections";
import type { UserRole } from "@prisma/client";

export type NavCommand = {
  id: string;
  label: string;
  href: string;
  group: string;
  icon: string;
};

export function getCommandsForRole(role: UserRole): NavCommand[] {
  const sections = getSectionsForRole(role);
  const cmds: NavCommand[] = [];
  for (const sec of sections) {
    const group = sec.title ?? "Genel";
    for (const it of sec.items) {
      cmds.push({ id: it.id, label: it.label, href: it.href, group, icon: it.icon });
    }
  }
  return cmds;
}
