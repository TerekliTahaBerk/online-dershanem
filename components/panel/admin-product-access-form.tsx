"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductCode, UserRole } from "@prisma/client";
import { productLabel } from "@/lib/auth/roles";
import { Boxes, Save } from "lucide-react";

export function AdminProductAccessForm({ userId, role, initialProducts }: { userId: string; role: UserRole; initialProducts: ProductCode[] }) {
  const router = useRouter();
  const staff = role === "ADMIN" || role === "TEACHER";
  const [products, setProducts] = useState<ProductCode[]>(staff ? ["OD", "OK", "ODK"] : initialProducts);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    if (!products.length) return setMessage("En az bir ürün seçin.");
    setBusy(true); setMessage("");
    const response = await fetch(`/api/panel/users/${userId}/products`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ products }) });
    const body = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) return setMessage(body.error || "Ürün erişimi güncellenemedi.");
    setMessage("Ürün erişimi güncellendi."); router.refresh();
  }

  return <section className="panel-surface mt-5 p-5"><h2 className="flex items-center gap-2 text-sm font-extrabold text-[var(--site-ink)]"><Boxes size={16} /> Ürün erişimi</h2><p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">Hesabın hangi panel ürünlerini açabileceğini belirler.</p><div className="mt-4 flex flex-wrap gap-3">{(["OD", "OK", "ODK"] as ProductCode[]).map((product) => <label key={product} className="inline-flex items-center gap-2 rounded-xl border border-[var(--site-line)] bg-white px-3 py-2 text-xs font-bold"><input type="checkbox" checked={products.includes(product)} disabled={staff || busy} onChange={(event) => setProducts((current) => event.target.checked ? [...new Set([...current, product])] : current.filter((item) => item !== product))} />{productLabel(product)}</label>)}</div><div className="mt-4 flex items-center justify-between gap-3"><p role="status" className="text-xs font-bold text-[var(--brand-olive)]">{staff ? "Personel iki ürüne otomatik erişir." : message}</p>{staff ? null : <button type="button" disabled={busy} onClick={() => void save()} className="panel-quick-action panel-quick-action-primary"><Save size={14} /> {busy ? "Kaydediliyor" : "Erişimi kaydet"}</button>}</div></section>;
}
