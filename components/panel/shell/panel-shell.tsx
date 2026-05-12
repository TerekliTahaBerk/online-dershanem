import type { UserRole } from "@prisma/client";
import { PanelShellClient } from "@/components/panel/shell/panel-shell-client";
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
    <PanelShellClient
      role={role}
      actualRole={actualRole}
      isViewingAs={isViewingAs}
      userId={userId}
      userName={userName}
      userEmail={userEmail}
      sections={sections}
      commands={commands}
    >
      {children}
    </PanelShellClient>
  );
}
