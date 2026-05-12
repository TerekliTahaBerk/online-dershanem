"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { PanelIcon } from "@/components/panel/ui/icon";
import type { AccessFlags } from "@/lib/access/odk";

type Props = {
  role: UserRole;
  actualRole: UserRole;
  accessFlags: AccessFlags;
};

const ROLE_TO_SEGMENT: Record<UserRole, "admin" | "ogretmen" | "ogrenci" | "veli"> = {
  ADMIN: "admin",
  TEACHER: "ogretmen",
  STUDENT: "ogrenci",
  PARENT: "veli",
};

type Product = {
  id: "od" | "odk";
  label: string;
  sub: string;
  href: string;
  enabled: boolean;
  badge?: string;
};

/**
 * Üst panel ürün switcher: OnlineDershanem ↔ OnlineDenemeKulübü.
 * Kullanıcının erişimi olmayan ürün disabled görünür ama listede kalır
 * (görünürlük + bilgilendirme).
 */
export function ProductSwitcher({ role, accessFlags }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement | null>(null);

  const segment = ROLE_TO_SEGMENT[role];
  const onOdk = pathname.startsWith(`/panel/${segment}/odk`);
  const isAdmin = role === "ADMIN";

  const products: Product[] = [
    {
      id: "od",
      label: "OnlineDershanem",
      sub: "Canlı ders, paket ve takip paneli",
      href: `/panel/${segment}`,
      enabled: isAdmin || accessFlags.hasOD,
    },
    {
      id: "odk",
      label: "OnlineDenemeKulübü",
      sub: "TYT · AYT · LGS dijital denemeleri",
      href: `/panel/${segment}/odk`,
      enabled: isAdmin || accessFlags.hasODK,
      badge: "ODK",
    },
  ];

  const current = onOdk ? products[1] : products[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Pathname değişince kapan
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div className="od-product-switcher" ref={ref}>
      <button
        type="button"
        className={`od-product-trigger${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={`od-product-dot ${current.id === "odk" ? "is-odk" : "is-od"}`} aria-hidden />
        <span className="od-product-name">{current.label}</span>
        {current.badge ? <span className="od-product-badge">{current.badge}</span> : null}
        <PanelIcon name="chevd" size={14} />
      </button>

      {open ? (
        <div className="od-product-menu" role="menu">
          <div className="od-product-menu-head">Ürün</div>
          {products.map((p) => {
            const active = p.id === current.id;
            const inner = (
              <>
                <span className={`od-product-dot ${p.id === "odk" ? "is-odk" : "is-od"}`} aria-hidden />
                <span className="od-product-menu-meta">
                  <span className="t">
                    {p.label}
                    {p.badge ? <span className="od-product-badge">{p.badge}</span> : null}
                  </span>
                  <span className="s">{p.sub}</span>
                </span>
                {active ? <PanelIcon name="check" size={14} /> : null}
                {!p.enabled ? <span className="od-product-locked">Erişim yok</span> : null}
              </>
            );
            if (!p.enabled) {
              return (
                <div key={p.id} className="od-product-menu-item is-disabled" aria-disabled>
                  {inner}
                </div>
              );
            }
            return (
              <Link key={p.id} href={p.href} className={`od-product-menu-item${active ? " is-active" : ""}`} role="menuitem">
                {inner}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
