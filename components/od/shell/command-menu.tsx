"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  GraduationCap,
  School,
  CalendarDays,
  Receipt,
  PackageOpen,
  LayoutDashboard,
  Inbox,
  Settings
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from "@/components/od/ui/command";

type CommandMenuContextValue = {
  open: () => void;
  close: () => void;
  isOpen: boolean;
};

const CommandMenuContext = React.createContext<CommandMenuContextValue | null>(null);

export function useCommandMenu() {
  const ctx = React.useContext(CommandMenuContext);
  if (!ctx) throw new Error("useCommandMenu must be used inside CommandMenuProvider");
  return ctx;
}

/**
 * CommandMenuProvider — global ⌘K menü.
 * Faz 1+: search results dynamically loaded via /api/v1/search.
 * Şimdilik static navigation shortcuts.
 */
export function CommandMenuProvider({
  children,
  basePrefix
}: {
  children: React.ReactNode;
  basePrefix: string; // "/v2/admin", "/v2/ogretmen", etc.
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  return (
    <CommandMenuContext.Provider value={{ open, close, isOpen }}>
      {children}
      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <CommandInput placeholder="Sayfa ara, komut çalıştır…" />
        <CommandList>
          <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>

          <CommandGroup heading="Hızlı Gezinme">
            <CommandItem onSelect={() => go(basePrefix)}>
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
              <CommandShortcut>D</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => go(`${basePrefix}/inbox`)}>
              <Inbox className="h-4 w-4" />
              Inbox
              <CommandShortcut>I</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Eğitim">
            <CommandItem onSelect={() => go(`${basePrefix}/ogrenciler`)}>
              <Users className="h-4 w-4" /> Öğrenciler
            </CommandItem>
            <CommandItem onSelect={() => go(`${basePrefix}/ogretmenler`)}>
              <GraduationCap className="h-4 w-4" /> Öğretmenler
            </CommandItem>
            <CommandItem onSelect={() => go(`${basePrefix}/siniflar`)}>
              <School className="h-4 w-4" /> Sınıflar
            </CommandItem>
            <CommandItem onSelect={() => go(`${basePrefix}/dersler`)}>
              <CalendarDays className="h-4 w-4" /> Dersler
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Finans">
            <CommandItem onSelect={() => go(`${basePrefix}/paketler`)}>
              <PackageOpen className="h-4 w-4" /> Paketler
            </CommandItem>
            <CommandItem onSelect={() => go(`${basePrefix}/odemeler`)}>
              <Receipt className="h-4 w-4" /> Ödemeler
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Sistem">
            <CommandItem onSelect={() => go(`${basePrefix}/ayarlar`)}>
              <Settings className="h-4 w-4" /> Ayarlar
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </CommandMenuContext.Provider>
  );
}
