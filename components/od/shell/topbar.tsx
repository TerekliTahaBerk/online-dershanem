"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Moon, Search, Sun, UserCircle, Settings, ChevronsUpDown, Menu } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/od/ui/tooltip";
import { useCommandMenu } from "./command-menu";
import { cn } from "@/lib/utils/cn";
import { Breadcrumb } from "./breadcrumb";
import { NotificationCenter } from "./notification-center";
import { GlobalPresenceBadge } from "@/components/od/presence/global-presence-badge";
import { useMobileNav } from "./app-shell";

export function Topbar() {
  const { data: session } = useSession();
  const { setTheme, theme, resolvedTheme } = useTheme();
  const { open } = useCommandMenu();
  const mobileNav = useMobileNav();

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
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={mobileNav.toggle}
        aria-label="Menüyü aç"
      >
        <Menu className="h-5 w-5" />
      </Button>

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

        {/* Online presence */}
        <GlobalPresenceBadge />

        {/* Notifications */}
        <NotificationCenter />

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
