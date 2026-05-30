"use client";

/**
 * ParentQuickDrawer — right-side quick view for a parent row.
 * URL: ?drawer=parent&id=...
 *
 * Admin-only. Shows identity, onboarding hints, linked children, and the last
 * 5 audit events. Footer offers "Davet gönder" placeholder + open full edit page.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DetailDrawer,
  DrawerSection,
  DrawerKv,
  DrawerLoading,
  DrawerError,
  useDrawer,
} from "@/components/panel/ui/detail-drawer";
import { Badge } from "@/components/panel/ui/badge";

type Quick = {
  parent: {
    id: string;
    fullName: string;
    phone: string | null;
    phoneKey: string | null;
    email: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    userId: string | null;
    hasAccount: boolean;
    onboardingHints: string[];
  };
  children: Array<{
    id: string; fullName: string; classLevel: string | null; status: string;
    phone: string; email: string | null;
    relationship: string | null; isPrimary: boolean;
  }>;
  audit: Array<{
    id: string; action: string; summary: string | null; createdAt: string;
    actor: { name: string | null; email: string } | null;
  }>;
};

const fmtDate = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" });

export function ParentQuickDrawer() {
  const { open, id, close } = useDrawer("parent");
  const [data, setData] = useState<Quick | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !id) { setData(null); setError(null); return; }
    const ac = new AbortController();
    setLoading(true); setError(null); setData(null);
    fetch(`/api/panel/parents/${id}/quick`, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 403 ? "Yetkisiz." : "Yüklenemedi.");
        return res.json() as Promise<Quick>;
      })
      .then(setData)
      .catch((e: Error) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [open, id]);

  return (
    <DetailDrawer
      open={open}
      onClose={close}
      kind="Veli"
      title={data?.parent.fullName ?? (loading ? "Yükleniyor…" : "—")}
      subtitle={data ? (
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {data.parent.hasAccount ? (
            <Badge tone="ok">Hesap aktif</Badge>
          ) : (
            <Badge tone="neutral">Davet bekliyor</Badge>
          )}
          {data.children.length > 0 ? <span>{data.children.length} çocuk</span> : null}
        </span>
      ) : null}
      footer={
        data ? (
          <>
            <Link href={`/panel/admin/veliler/${data.parent.id}/duzenle`} className="od-btn od-btn-primary od-btn-sm">
              Düzenle →
            </Link>
            {!data.parent.hasAccount && data.parent.email ? (
              <button
                type="button"
                className="od-btn od-btn-ghost od-btn-sm"
                title="Davet akışı Phase 1.5'te eklenecek"
                disabled
              >
                Davet gönder (yakında)
              </button>
            ) : null}
          </>
        ) : null
      }
    >
      {loading ? <DrawerLoading /> : null}
      {error ? <DrawerError message={error} /> : null}

      {data ? (
        <>
          <DrawerSection title="Kimlik" icon="user">
            <DrawerKv k="Telefon" v={data.parent.phone ? <span className="od-mono">{data.parent.phone}</span> : null} />
            <DrawerKv k="Email" v={data.parent.email} />
            <DrawerKv k="Eklendi" v={fmtDate.format(new Date(data.parent.createdAt))} />
          </DrawerSection>

          {data.parent.onboardingHints.length > 0 ? (
            <DrawerSection title="Aksiyon" icon="alert">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {data.parent.onboardingHints.map((h) => (
                  <Badge key={h} tone="neutral">{h}</Badge>
                ))}
              </div>
            </DrawerSection>
          ) : null}

          <DrawerSection title="Çocuklar" icon="users">
            {data.children.length === 0 ? (
              <div className="od-muted">Bağlı çocuk yok.</div>
            ) : (
              data.children.map((c) => (
                <div key={c.id} style={{ padding: "6px 0", borderTop: "1px solid var(--pd-line)", display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {c.fullName}
                      {c.isPrimary ? <span style={{ marginLeft: 6 }}><Badge tone="teal">Birincil</Badge></span> : null}
                    </div>
                    <div className="od-muted" style={{ fontSize: 11 }}>
                      {[c.classLevel, c.relationship, c.phone].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <Link href={`?drawer=student&id=${c.id}`} className="od-btn od-btn-ghost od-btn-sm">Aç</Link>
                </div>
              ))
            )}
          </DrawerSection>

          {data.audit.length > 0 ? (
            <DrawerSection title="Son aktivite" icon="log">
              {data.audit.map((a) => (
                <div key={a.id} style={{ padding: "6px 0", borderTop: "1px solid var(--pd-line)" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.action}</div>
                  <div className="od-muted" style={{ fontSize: 11 }}>
                    {fmtDate.format(new Date(a.createdAt))}
                    {a.actor ? ` · ${a.actor.name ?? a.actor.email}` : ""}
                    {a.summary ? ` · ${a.summary}` : ""}
                  </div>
                </div>
              ))}
            </DrawerSection>
          ) : null}
        </>
      ) : null}
    </DetailDrawer>
  );
}
