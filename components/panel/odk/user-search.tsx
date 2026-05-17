"use client";
import { useEffect, useRef, useState } from "react";

type UserHit = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  hasActiveOdkEntitlement: boolean;
};

type Props = {
  name: string; // hidden input adı (form submit'te)
  placeholder?: string;
  defaultUser?: UserHit | null;
};

/**
 * Admin kullanıcı arama autocomplete bileşeni.
 * 250 ms debounce; en az 2 karakter; sonuçları liste olarak gösterir.
 * Seçilen kullanıcının id'si gizli `<input name=...>` içine yazılır.
 */
export function UserSearch({ name, placeholder = "Ad, email, telefon…", defaultUser }: Props) {
  const [q, setQ] = useState(defaultUser ? defaultUser.name ?? defaultUser.email : "");
  const [hits, setHits] = useState<UserHit[]>([]);
  const [selected, setSelected] = useState<UserHit | null>(defaultUser ?? null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    if (selected && (selected.name === q || selected.email === q)) return;
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          "/api/v1/odk/admin/users/search?q=" + encodeURIComponent(q),
        );
        const j = await res.json();
        if (j.ok) {
          setHits(j.users);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, selected]);

  return (
    <div style={{ position: "relative" }}>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setSelected(null);
        }}
        onFocus={() => hits.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          width: "100%",
          padding: "8px 10px",
          border: "1px solid var(--pd-line)",
          borderRadius: 8,
          background: "var(--pd-card)",
          color: "var(--pd-ink-1)",
          fontSize: 13,
        }}
      />
      {selected ? (
        <div style={{ marginTop: 6, fontSize: 12 }}>
          Seçili: <strong>{selected.name ?? selected.email}</strong>{" "}
          <span className="od-muted">({selected.email})</span>
          {selected.hasActiveOdkEntitlement ? (
            <span style={{ marginLeft: 8, color: "var(--pd-warn)" }}>⚠ aktif ODK var</span>
          ) : null}
        </div>
      ) : null}
      {open && hits.length > 0 ? (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            marginTop: 4,
            background: "var(--pd-card)",
            border: "1px solid var(--pd-line)",
            borderRadius: 8,
            maxHeight: 280,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,.12)",
          }}
        >
          {hits.map((u) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setSelected(u);
                setQ(u.name ?? u.email);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 10px",
                border: "none",
                background: "transparent",
                textAlign: "left",
                cursor: "pointer",
                fontSize: 13,
                borderBottom: "1px solid var(--pd-line)",
              }}
            >
              <strong>{u.name ?? "—"}</strong>{" "}
              <span className="od-muted" style={{ fontSize: 11 }}>
                {u.email}
                {u.phone ? " · " + u.phone : ""} · {u.role}
              </span>
              {u.hasActiveOdkEntitlement ? (
                <span style={{ float: "right", color: "var(--pd-warn)", fontSize: 11 }}>
                  ⚠ ODK var
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
      {loading ? (
        <div className="od-muted" style={{ fontSize: 11, marginTop: 4 }}>
          Aranıyor…
        </div>
      ) : null}
    </div>
  );
}
