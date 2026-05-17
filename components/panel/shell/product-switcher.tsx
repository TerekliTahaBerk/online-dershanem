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
  currentProduct?: "od" | "odk";
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
  short: string;
  sub: string;
  href: string;
  /** Erişim yoksa kullanıcı bu sayfaya yönlendirilir (öğrenci/öğretmen/veli). */
  upsellHref: string;
  enabled: boolean;
  badge?: string;
};

/**
 * Üst panel ürün switcher: OnlineDershanem ↔ OnlineDenemeKulübü.
 *
 * Davranış:
 *  - Aktif ürün trigger üzerinde rozet + isimle gösterilir.
 *  - Dropdown'da her iki ürün listelenir; aktif ürün check ikonu alır.
 *  - Erişimi olmayan ürün için:
 *      • Admin/view-as: rozet "Erişim yok" gösterilir ama yine de tıklanabilir
 *        (admin her zaman geçer; backend guard zaten doğrular).
 *      • Diğer roller: tıklayınca ilgili satın alma sayfasına yönlendirilir.
 */
export function ProductSwitcher({ role, accessFlags, currentProduct }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement | null>(null);

  const segment = ROLE_TO_SEGMENT[role];
  // currentProduct prop'u verilmişse onu kullan; yoksa path'ten çıkar.
  const onOdk =
    currentProduct != null
      ? currentProduct === "odk"
      : pathname.startsWith(`/panel/${segment}/odk`);
  const isAdmin = role === "ADMIN";

  const products: Product[] = [
    {
      id: "od",
      label: "OnlineDershanem",
      short: "OD",
      sub: "Canlı ders, paket ve takip paneli",
      href: `/panel/${segment}`,
      upsellHref: "/paketler?from=panel",
      enabled: isAdmin || accessFlags.hasOD,
    },
    {
      id: "odk",
      label: "OnlineDenemeKulübü",
      short: "ODK",
      sub: "TYT · AYT · LGS dijital denemeleri",
      href: `/panel/${segment}/odk`,
      upsellHref: "/odk-paketleri?from=panel",
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
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="od-product-switcher" ref={ref}>
      <button
        type="button"
        className={`od-product-trigger${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={current.label}
      >
        <span
          className={`od-product-dot ${current.id === "odk" ? "is-odk" : "is-od"}`}
          aria-hidden
        />
        <span className="od-product-name">{current.label}</span>
        <PanelIcon name="chevd" size={14} />
      </button>

      {open ? (
        <div className="od-product-menu" role="menu">
          <div className="od-product-menu-head">Ürün seçin</div>
          {products.map((p) => {
            const active = p.id === current.id;
            const linkHref = p.enabled ? p.href : p.upsellHref;
            return (
              <Link
                key={p.id}
                href={linkHref}
                className={`od-product-menu-item${active ? " is-active" : ""}${p.enabled ? "" : " is-locked"}`}
                role="menuitem"
                title={p.enabled ? p.label : `Bu ürüne erişiminiz yok — ${p.label} satın alma sayfasına gidin`}
              >
                <span
                  className={`od-product-dot ${p.id === "odk" ? "is-odk" : "is-od"}`}
                  aria-hidden
                />
                <span className="od-product-menu-meta">
                  <span className="t">
                    <span className="t-name">{p.label}</span>
                    {p.badge ? <span className="od-product-badge">{p.badge}</span> : null}
                  </span>
                  <span className="s">{p.sub}</span>
                </span>
                <span className="od-product-menu-state">
                  {active ? (
                    <PanelIcon name="check" size={14} />
                  ) : !p.enabled ? (
                    <span className="od-product-locked">Erişim yok</span>
                  ) : null}
                </span>
              </Link>
            );
          })}
          <div className="od-product-menu-foot">
            Aynı hesap üzerinden iki ürünü de yönetebilirsiniz.
          </div>
        </div>
      ) : null}
    </div>
  );
}
