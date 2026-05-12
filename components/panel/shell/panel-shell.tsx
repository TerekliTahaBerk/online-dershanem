import type { UserRole } from "@prisma/client";
import { PanelShellClient } from "@/components/panel/shell/panel-shell-client";
import { getSectionsForRole } from "@/components/panel/shell/sections";
import { getCommandsForRole } from "@/lib/panel-nav";
import type { AccessFlags } from "@/lib/access/odk";

type Props = {
  role: UserRole;
  actualRole: UserRole;
  isViewingAs: boolean;
  userId: string;
  userName: string | null;
  userEmail: string;
  accessFlags: AccessFlags;
  children: React.ReactNode;
};

export function PanelShell({
  role,
  actualRole,
  isViewingAs,
  userId,
  userName,
  userEmail,
  accessFlags,
  children,
}: Props) {
  const sections = getSectionsForRole(role, accessFlags);
  const commands = getCommandsForRole(role, accessFlags);
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
      accessFlags={accessFlags}
    >
      {children}
    </PanelShellClient>
  );
}
