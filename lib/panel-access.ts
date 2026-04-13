type UserRole = "ADMIN" | "STUDENT" | "TEACHER";

export type PanelKey = "student" | "teacher" | "admin";

type SessionPanelUser = {
  role?: UserRole | null;
  isAdmin?: boolean | null;
  hasStudentAccess?: boolean | null;
  hasTeacherAccess?: boolean | null;
};

const PANEL_CONFIG: Record<PanelKey, { href: string; label: string }> = {
  student: { href: "/panel", label: "Öğrenci Paneli" },
  teacher: { href: "/ogretmen", label: "Öğretmen Paneli" },
  admin: { href: "/admin", label: "Admin Paneli" }
};

function getPanelFromPath(pathname: string): PanelKey | null {
  if (pathname === "/panel" || pathname.startsWith("/panel/")) return "student";
  if (pathname === "/ogretmen" || pathname.startsWith("/ogretmen/")) return "teacher";
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
  const hasStudentPanel = Boolean(user?.hasStudentAccess) || user?.role === "STUDENT";
  const hasTeacherPanel = Boolean(user?.hasTeacherAccess) || user?.role === "TEACHER";
  const hasAdminPanel = Boolean(user?.isAdmin) || user?.role === "ADMIN";

  const panels: PanelKey[] = [];

  if (hasStudentPanel) panels.push("student");
  if (hasTeacherPanel) panels.push("teacher");
  if (hasAdminPanel) panels.push("admin");

  const requiresPanelChoice = !hasStudentPanel && hasTeacherPanel && hasAdminPanel;

  let defaultPanel: PanelKey | null = null;

  if (hasStudentPanel) {
    defaultPanel = "student";
  } else if (hasTeacherPanel && !hasAdminPanel) {
    defaultPanel = "teacher";
  } else if (hasAdminPanel && !hasTeacherPanel) {
    defaultPanel = "admin";
  }

  return {
    hasStudentPanel,
    hasTeacherPanel,
    hasAdminPanel,
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

export function getPanelDestination(user?: SessionPanelUser | null, callbackUrl?: string | null) {
  const access = getPanelAccess(user);
  const callbackPath = normalizeCallbackPath(callbackUrl);

  if (callbackPath) {
    const callbackPanel = getPanelFromPath(new URL(callbackPath, "http://localhost").pathname);
    if (callbackPanel && access.panels.includes(callbackPanel)) {
      return callbackPath;
    }
  }

  if (access.requiresPanelChoice) {
    return buildPanelChoiceHref(callbackPath);
  }

  if (access.defaultPanel) {
    return getPanelHref(access.defaultPanel);
  }

  return "/giris";
}

export function getPanelLink(panel: PanelKey, callbackUrl?: string | null) {
  const callbackPath = normalizeCallbackPath(callbackUrl);
  if (!callbackPath) return getPanelHref(panel);

  const callbackPanel = getPanelFromPath(new URL(callbackPath, "http://localhost").pathname);
  return callbackPanel === panel ? callbackPath : getPanelHref(panel);
}
