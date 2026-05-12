import type { UserRole } from "@prisma/client";
import { Sidebar } from "@/components/panel/shell/sidebar";
import { Topbar } from "@/components/panel/shell/topbar";
import { CommandPalette } from "@/components/panel/shell/command-palette";
import { getSectionsForRole } from "@/components/panel/shell/sections";
import { getCommandsForRole } from "@/lib/panel-nav";

type Props = {
  role: UserRole;
  actualRole: UserRole;
  isViewingAs: boolean;
  userId: string;
  userName: string | null;
  userEmail: string;
  children: React.ReactNode;
};

export function PanelShell({
  role,
  actualRole,
  isViewingAs,
  userId,
  userName,
  userEmail,
  children,
}: Props) {
  const sections = getSectionsForRole(role);
  const commands = getCommandsForRole(role);
  return (
    <div className="od-panel-app">
      <Sidebar
        role={role}
        sections={sections}
        userName={userName}
        userEmail={userEmail}
      />
      <main className="od-panel-main">
        <Topbar
          role={role}
          actualRole={actualRole}
          isViewingAs={isViewingAs}
          userId={userId}
        />
        <div className="od-panel-body">{children}</div>
      </main>
      <CommandPalette role={role} commands={commands} />
    </div>
  );
}
