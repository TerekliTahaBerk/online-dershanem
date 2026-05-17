"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { PanelIcon } from "@/components/panel/ui/icon";
import type { AccessFlags } from "@/lib/access/odk";

type Props = {
  role: UserRole;
  accessFlags: AccessFlags;
  currentProduct: "od" | "odk";
  roleLabel: string;
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
  upsellHref: string;
  enabled: boolean;
};

/**
 * Sidebar üst alanında konumlanan ürün switcher.
 *
 * Trigger = sidebar brand satırının tamamı (logo + ad + alt yazı + chevron).
 * Tek bir switcher var — topbar'da ikinci selector yok.
 *
 * Davranış:
 *  - Aktif ürün brand satırında gösterilir.
 *  - Click → dropdown açar, ürünleri (OD/ODK) listeler.
 *  - Aktif ürün vurgulanır + check ikonu.
 *  - Erişim yoksa "Erişim yok" rozeti + tıklayınca satın alma sayfası.
 *  - Outside-click / Escape / route change → kapatır.
 *  - Keyboard accessible (aria-haspopup, aria-expanded, focusable items).
 */
export function SidebarBrandSwitcher({ role, accessFlags, currentProduct, roleLabel }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement | null>(null);

  const segment = ROLE_TO_SEGMENT[role];
  const isAdmin = role === "ADMIN";

  const products: Product[] = [
    {
      id: "od",
      label: "OnlineDershanem",
      sub: "Canlı ders, sınıf ve öğrenci yönetimi",
      href: `/panel/${segment}`,
      upsellHref: "/paketler?from=panel",
      enabled: isAdmin || accessFlags.hasOD,
    },
    {
      id: "odk",
      label: "OnlineDenemeKulübü",
      sub: "TYT • AYT • LGS dijital denemeleri",
      href: `/panel/${segment}/odk`,
      upsellHref: "/odk-paketleri?from=panel",
      enabled: isAdmin || accessFlags.hasODK,
    },
  ];

  const current = products.find((p) => p.id === currentProduct) ?? products[0];

  // Outside click & Escape
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

  // Route değişince kapan
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="od-brand-switch" ref={ref}>
      <button
        type="button"
        className={`od-brand-trigger${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${current.label} — ürün değiştir`}
      >
        <span className={`od-brand-mark od-brand-mark--${current.id}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" />
        </span>
        <span className="od-brand-text">
          <span className="od-brand-name">
            <span className={`od-brand-accent od-brand-accent--${current.id}`} aria-hidden />
            {current.label}
          </span>
          <span className="od-brand-sub">{roleLabel} paneli</span>
        </span>
        <span className={`od-brand-chev${open ? " is-open" : ""}`} aria-hidden>
          <PanelIcon name="chevd" size={14} />
        </span>
      </button>

      {open ? (
        <div className="od-brand-menu" role="menu" aria-label="Ürün seçici">
          <div className="od-brand-menu-head">Ürün</div>
          <ul className="od-brand-menu-list">
            {products.map((p) => {
              const active = p.id === current.id;
              const linkHref = p.enabled ? p.href : p.upsellHref;
              return (
                <li key={p.id}>
                  <Link
                    href={linkHref}
                    role="menuitem"
                    className={`od-brand-menu-item${active ? " is-active" : ""}${p.enabled ? "" : " is-locked"}`}
                    title={p.enabled ? p.label : `${p.label} — erişim için satın al`}
                  >
                    <span className={`od-brand-menu-mark od-brand-mark--${p.id}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/icon-192.png" alt="" />
                    </span>
                    <span className="od-brand-menu-meta">
                      <span className="od-brand-menu-title">
                        <span className={`od-brand-accent od-brand-accent--${p.id}`} aria-hidden />
                        {p.label}
                      </span>
                      <span className="od-brand-menu-sub">{p.sub}</span>
                    </span>
                    <span className="od-brand-menu-state">
                      {active ? (
                        <PanelIcon name="check" size={14} />
                      ) : !p.enabled ? (
                        <span className="od-brand-locked">Erişim yok</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="od-brand-menu-foot">
            Aynı hesapla iki ürünü de yönetebilirsiniz.
          </div>
        </div>
      ) : null}
    </div>
  );
}
