"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const SEGMENT_LABELS: Record<string, string> = {
  v2: "v2",
  admin: "Admin",
  ogretmen: "Öğretmen",
  panel: "Öğrenci",
  veli: "Veli",
  ogrenciler: "Öğrenciler",
  ogretmenler: "Öğretmenler",
  veliler: "Veliler",
  siniflar: "Sınıflar",
  siniflarim: "Sınıflarım",
  ogrencilerim: "Öğrencilerim",
  dersler: "Dersler",
  odevler: "Ödevler",
  yoklama: "Yoklama",
  takvim: "Takvim",
  paketler: "Paketler",
  paketim: "Paketim",
  odemeler: "Ödemeler",
  muhasebe: "Muhasebe",
  inbox: "Inbox",
  istatistikler: "İstatistikler",
  raporlar: "Raporlar",
  izinler: "İzinler",
  audit: "Audit Log",
  ayarlar: "Ayarlar",
  profil: "Profil",
  cocuklarim: "Çocuklarım",
  devamsizlik: "Devamsızlık",
  denemelerim: "Denemelerim",
  sinifim: "Sınıfım"
};

function humanize(seg: string) {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg];
  // Treat ids (cuid/uuid-ish) generically
  if (/^[a-z0-9]{20,}$/i.test(seg) || /^[0-9a-f-]{32,}$/i.test(seg)) return "Detay";
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

export function Breadcrumb({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  // Skip the leading "v2" in display, but keep in href.
  const display = segments[0] === "v2" ? segments.slice(1) : segments;
  const basePrefix = segments[0] === "v2" ? "/v2" : "";

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-od-small text-od-mute", className)}>
      <Link href={basePrefix + "/" + display[0]} className="flex items-center gap-1 hover:text-od-ink-2 transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {display.slice(1).map((seg, idx) => {
        const isLast = idx === display.length - 2;
        const href = basePrefix + "/" + display.slice(0, idx + 2).join("/");
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-od-mute-2" />
            {isLast ? (
              <span className="text-od-ink-2 font-medium">{humanize(seg)}</span>
            ) : (
              <Link href={href} className="hover:text-od-ink-2 transition-colors">
                {humanize(seg)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
