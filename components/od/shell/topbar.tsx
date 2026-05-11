"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, Moon, Search, Sun, UserCircle, Settings, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/od/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/od/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/od/ui/avatar";
import { Badge } from "@/components/od/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/od/ui/tooltip";
import { useCommandMenu } from "./command-menu";
import { cn } from "@/lib/utils/cn";
import { Breadcrumb } from "./breadcrumb";

export function Topbar() {
  const { data: session } = useSession();
  const { setTheme, theme, resolvedTheme } = useTheme();
  const { open } = useCommandMenu();
  const [unread, setUnread] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/v1/me/inbox/unread", { credentials: "same-origin" });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) setUnread(j.count ?? 0);
      } catch {}
    }
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const isDark = (resolvedTheme ?? theme) === "dark";
  const initials = (session?.user?.name ?? session?.user?.email ?? "??")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-od-border bg-od-bg/80 px-4 backdrop-blur-md">
      <Breadcrumb className="hidden md:flex" />

      <div className="ml-auto flex items-center gap-2">
        {/* Global search trigger */}
        <button
          onClick={open}
          className={cn(
            "hidden md:inline-flex items-center gap-2 rounded-od border border-od-border-2 bg-od-surface",
            "px-3 py-1.5 text-od-small text-od-mute hover:bg-od-subtle hover:text-od-ink-2 transition-colors min-w-[260px]"
          )}
          aria-label="Ara"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Ara…</span>
          <kbd className="rounded-od-sm border border-od-border bg-od-bg px-1.5 py-0.5 text-[10px] text-od-mute-2 font-mono">⌘K</kbd>
        </button>

        {/* Mobile search button */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={open} aria-label="Ara">
          <Search className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Bildirimler" className="relative">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <Badge
                  tone="blush"
                  size="sm"
                  className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full text-[10px]"
                >
                  {unread > 9 ? "9+" : unread}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bildirimler</TooltipContent>
        </Tooltip>

        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label="Tema değiştir"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isDark ? "Açık tema" : "Koyu tema"}</TooltipContent>
        </Tooltip>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-od p-1 hover:bg-od-subtle transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-od-tiny">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-od-small font-medium text-od-ink truncate max-w-[140px]">
                  {session?.user?.name ?? session?.user?.email}
                </span>
                <span className="text-[11px] text-od-mute-2">{session?.user?.role}</span>
              </div>
              <ChevronsUpDown className="h-3.5 w-3.5 text-od-mute-2" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Hesap</DropdownMenuLabel>
            <DropdownMenuItem>
              <UserCircle className="h-4 w-4" /> Profilim
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4" /> Ayarlar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/giris" })}>
              <LogOut className="h-4 w-4" /> Çıkış yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
