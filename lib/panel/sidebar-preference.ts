/** Kenar çubuğu gizle/göster tercihi — çerez adı ve değer ayrıştırma (istemci + sunucu). */
export const SIDEBAR_COOKIE = "pn_sidebar";

export type SidebarState = "expanded" | "collapsed";

export function parseSidebarState(value: string | undefined | null): SidebarState {
  return value === "collapsed" ? "collapsed" : "expanded";
}
