"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { navManifests, panelMeta, type PanelKey } from "./nav-manifest";
import { usePermissions } from "@/hooks/use-permissions";
import { ScrollArea } from "@/components/od/ui/scroll-area";
import { Badge } from "@/components/od/ui/badge";

export function Sidebar({ panel, collapsed = false }: { panel: PanelKey; collapsed?: boolean }) {
  const pathname = usePathname();
  const { can } = usePermissions();
  const groups = navManifests[panel];
  const meta = panelMeta[panel];

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-od-sidebar-line bg-od-sidebar-bg",
        collapsed ? "w-16" : "w-64",
        "shrink-0 transition-[width] duration-200"
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-od-sidebar-line px-4">
        <Link href={meta.href} className="flex items-center gap-2 min-w-0">
          <Image src="/logo.png" alt="OD" width={28} height={28} className="rounded-od-sm shrink-0" />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-od-small font-semibold text-od-ink truncate">Online Dershanem</span>
              <span className="text-od-tiny text-od-mute truncate">{meta.label} Paneli</span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-5 px-2">
          {groups.map((group) => {
            const visibleItems = group.items.filter((it) => can(it.permission));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className="flex flex-col gap-0.5">
                {!collapsed && (
                  <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-od-mute-2">
                    {group.label}
                  </div>
                )}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    (item.href !== meta.href && pathname?.startsWith(item.href + "/"));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-od px-2.5 py-1.5 text-od-small font-medium transition-colors",
                        active
                          ? "bg-od-sidebar-item-active text-od-sidebar-item-active-ink"
                          : "text-od-sidebar-item hover:bg-od-sidebar-item-hover hover:text-od-ink"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-od-sidebar-item-active-icon" : "text-od-mute group-hover:text-od-ink-2"
                        )}
                      />
                      {!collapsed && (
                        <>
                          <span className="truncate flex-1">{item.label}</span>
                          {item.badge && (
                            <Badge tone="accent" size="sm">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer slot */}
      {!collapsed && (
        <div className="border-t border-od-sidebar-line p-3">
          <div className="flex items-center gap-2 rounded-od bg-pastel-mint-soft p-2.5 text-od-tiny text-pastel-mint-ink">
            <span className="font-semibold">v2 Beta</span>
            <span className="text-od-mute-2">·</span>
            <span className="truncate">Yeni panel sistemi</span>
            <ChevronDown className="ml-auto h-3 w-3" />
          </div>
        </div>
      )}
    </aside>
  );
}
