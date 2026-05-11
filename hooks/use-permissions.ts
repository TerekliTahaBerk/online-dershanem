"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { defaultPermissionsFor } from "@/lib/rbac/matrix";
import type { PermissionKey } from "@/lib/rbac/matrix";

/**
 * Client-side permission hook.
 *
 * NOT: UI-only enforcement. Backend (`defineAction`/`requirePagePermission`)
 * her zaman re-validate eder. Bu sadece görünürlük için.
 *
 * Şu anki implementasyon: session.user.role'dan default permission set'i türetir.
 * Faz 4'te /api/v1/me/permissions endpoint'ine bakar (UserPermissionOverride dahil).
 */
export function usePermissions() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  const [remote, setRemote] = React.useState<Set<PermissionKey> | null>(null);

  React.useEffect(() => {
    if (!session?.user?.id) {
      setRemote(null);
      return;
    }
    let cancelled = false;
    fetch("/api/v1/me/permissions", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.permissions) {
          setRemote(new Set(data.permissions as PermissionKey[]));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const set = React.useMemo(() => {
    if (remote) return remote;
    if (!role) return new Set<PermissionKey>();
    return defaultPermissionsFor(role);
  }, [role, remote]);

  const can = React.useCallback(
    (key: PermissionKey | PermissionKey[] | undefined): boolean => {
      if (!key) return true;
      if (role === "ADMIN") return true;
      const keys = Array.isArray(key) ? key : [key];
      return keys.every(k => set.has(k));
    },
    [role, set]
  );

  return { can, role, isAdmin: role === "ADMIN" };
}
