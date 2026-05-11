type UserRole = "ADMIN" | "STUDENT" | "TEACHER" | "PARENT";

export type PanelKey = "student" | "teacher" | "parent" | "admin";

type SessionPanelUser = {
  role?: UserRole | null;
  isAdmin?: boolean | null;
  hasStudentAccess?: boolean | null;
  hasTeacherAccess?: boolean | null;
  hasParentAccess?: boolean | null;
  hasOdAccess?: boolean | null;
  hasOdkAccess?: boolean | null;
};

const PANEL_CONFIG: Record<PanelKey, { href: string; label: string }> = {
  student: { href: "/panel", label: "Öğrenci Paneli" },
  teacher: { href: "/ogretmen", label: "Öğretmen Paneli" },
  parent:  { href: "/veli", label: "Veli Paneli" },
  admin:   { href: "/admin", label: "Admin Paneli" }
};

function getPanelFromPath(pathname: string): PanelKey | null {
  if (pathname === "/panel" || pathname.startsWith("/panel/")) return "student";
  if (pathname === "/ogretmen" || pathname.startsWith("/ogretmen/")) return "teacher";
  if (pathname === "/veli" || pathname.startsWith("/veli/")) return "parent";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  return null;
}

function normalizeCallbackPath(callbackUrl?: string | null) {
  if (!callbackUrl) return null;

  try {
    const url = new URL(callbackUrl, "http://localhost");
    if (!url.pathname.startsWith("/")) return null;

    const path = `${url.pathname}${url.search}${url.hash}`;
    return getPanelFromPath(url.pathname) ? path : null;
  } catch {
    return null;
  }
}

export function getPanelHref(panel: PanelKey) {
  return PANEL_CONFIG[panel].href;
}

export function getPanelLabel(panel: PanelKey) {
  return PANEL_CONFIG[panel].label;
}

export function getPanelAccess(user?: SessionPanelUser | null) {
  const isAdmin = Boolean(user?.isAdmin) || user?.role === "ADMIN";
  // Admins implicitly hold every access; legacy student/teacher relations also grant OD.
  const hasStudentPanel = isAdmin || Boolean(user?.hasStudentAccess);
  const hasTeacherPanel = isAdmin || Boolean(user?.hasTeacherAccess);
  const hasParentPanel  = isAdmin || Boolean(user?.hasParentAccess);
  const hasAdminPanel = isAdmin;
  const hasOdAccess = isAdmin || Boolean(user?.hasOdAccess) || Boolean(user?.hasStudentAccess) || Boolean(user?.hasTeacherAccess);
  const hasOdkPanel = isAdmin || Boolean(user?.hasOdkAccess);

  const panels: PanelKey[] = [];

  if (hasStudentPanel) panels.push("student");
  if (hasTeacherPanel) panels.push("teacher");
  if (hasParentPanel)  panels.push("parent");
  if (hasAdminPanel)   panels.push("admin");

  // Multiple non-admin/non-student panels available → show chooser.
  const requiresPanelChoice = !hasStudentPanel && (
    (hasTeacherPanel && hasAdminPanel) ||
    (hasParentPanel && (hasTeacherPanel || hasAdminPanel))
  );

  let defaultPanel: PanelKey | null = null;

  if (hasStudentPanel) {
    defaultPanel = "student";
  } else if (hasParentPanel && !hasTeacherPanel && !hasAdminPanel) {
    defaultPanel = "parent";
  } else if (hasTeacherPanel && !hasAdminPanel) {
    defaultPanel = "teacher";
  } else if (hasAdminPanel && !hasTeacherPanel && !hasParentPanel) {
    defaultPanel = "admin";
  }

  return {
    hasStudentPanel,
    hasTeacherPanel,
    hasParentPanel,
    hasAdminPanel,
    hasOdAccess,
    hasOdkPanel,
    panels,
    requiresPanelChoice,
    defaultPanel
  };
}

export function buildPanelChoiceHref(callbackUrl?: string | null) {
  const callbackPath = normalizeCallbackPath(callbackUrl);

  if (!callbackPath) {
    return "/panel-secimi";
  }

  const params = new URLSearchParams({ callbackUrl: callbackPath });
  return `/panel-secimi?${params.toString()}`;
}

// Returns the destination within Online Dershanem (skips service selection layer).
export function getPanelDestination(user?: SessionPanelUser | null, callbackUrl?: string | null) {
  const access = getPanelAccess(user);
  const callbackPath = normalizeCallbackPath(callbackUrl);

  // Respect a valid callback URL for an accessible panel
  if (callbackPath) {
    const callbackPanel = getPanelFromPath(new URL(callbackPath, "http://localhost").pathname);
    if (callbackPanel && access.panels.includes(callbackPanel)) {
      return callbackPath;
    }
  }

  // Admin takes priority over all else
  if (access.hasAdminPanel) {
    return getPanelHref("admin");
  }

  // OD erişimi olan öğrenciler → öğrenci paneli
  if (access.hasStudentPanel && access.hasOdAccess) {
    return getPanelHref("student");
  }

  // Veli erişimi olan kullanıcı → veli paneli
  if (access.hasParentPanel) {
    return getPanelHref("parent");
  }

  // ODK erişimi varsa (öğrenci OD tag'i yoksa bile) → ODK paneli
  if (access.hasOdkPanel) {
    return "/odk/panel";
  }

  // OD erişimi olan öğretmen → öğretmen paneli
  if (access.hasTeacherPanel && access.hasOdAccess) {
    return getPanelHref("teacher");
  }

  // Teacher relation var ama hiçbir tag yok → yine teacher paneli (geriye dönük uyum)
  if (access.hasTeacherPanel) {
    return getPanelHref("teacher");
  }

  // Hiçbir erişim yok — paketler sayfasına yönlendir
  return "/paketler";
}

export function getPanelLink(panel: PanelKey, callbackUrl?: string | null) {
  const callbackPath = normalizeCallbackPath(callbackUrl);
  if (!callbackPath) return getPanelHref(panel);

  const callbackPanel = getPanelFromPath(new URL(callbackPath, "http://localhost").pathname);
  return callbackPanel === panel ? callbackPath : getPanelHref(panel);
}
