import type { UserRole } from "@prisma/client";
import { PanelShellClient } from "@/components/panel/shell/panel-shell-client";
import { getProductSectionsForRole } from "@/components/panel/shell/sections";
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
  const productSections = getProductSectionsForRole(role);
  // Komut paleti tüm ürünlerin komutlarını görsün (cross-product navigation).
  const commands = getCommandsForRole(role, accessFlags);
  return (
    <PanelShellClient
      role={role}
      actualRole={actualRole}
      isViewingAs={isViewingAs}
      userId={userId}
      userName={userName}
      userEmail={userEmail}
      productSections={productSections}
      commands={commands}
      accessFlags={accessFlags}
    >
      {children}
    </PanelShellClient>
  );
}
