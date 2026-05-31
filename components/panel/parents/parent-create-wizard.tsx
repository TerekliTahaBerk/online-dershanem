"use client";

/**
 * Phase 3 / Session 3 — D2: Parent Creation Wizard (client).
 *
 * Sectioned single-page form that drives `createParentWithAccountAction`
 * and renders a live duplicate panel via `lookupParentDuplicatesAction`.
 *
 * Stays on the page after submit so the admin can copy the invite URL or
 * one-time temporary password before navigating away.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { EntitySearchCombobox, type ComboboxRow } from "@/components/panel/ui/entity-search-combobox";
import { useToast } from "@/components/ui/toast";
import {
  PARENT_RELATIONSHIP_TYPES,
  getCanonicalRelationshipLabel,
  type ParentRelationshipType,
} from "@/lib/parents";
import {
  createParentWithAccountAction,
  lookupParentDuplicatesAction,
  type ParentCreateResult,
} from "@/app/panel/admin/veliler/_actions";

type AccountMode = "none" | "invite" | "tempPassword";

type DuplicateRow = Awaited<ReturnType<typeof lookupParentDuplicatesAction>>[number];

const SECTIONS = [
  { id: "kimlik",  title: "1. Kimlik" },
  { id: "hesap",   title: "2. Hesap erişimi" },
  { id: "ogrenci", title: "3. Bağlı öğrenciler" },
  { id: "ozet",    title: "4. Önizleme" },
] as const;

const RELATIONSHIP_OPTIONS: ReadonlyArray<{ value: ParentRelationshipType; label: string }> =
  PARENT_RELATIONSHIP_TYPES.map((v) => ({ value: v, label: getCanonicalRelationshipLabel(v) }));

export function ParentCreateWizard() {
  const toast = useToast();

  // ── Basic info
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneSecondary, setPhoneSecondary] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  // ── Account access
  const [accountMode, setAccountMode] = useState<AccountMode>("none");
  const [accountDisabled, setAccountDisabled] = useState(false);

  // ── Linked students (multi)
  const [students, setStudents] = useState<ComboboxRow[]>([]);
  const [studentResetKey, setStudentResetKey] = useState(0);
  const [relType, setRelType] = useState<ParentRelationshipType>("MOTHER");
  const [relNote, setRelNote] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);

  // ── Duplicate detection (debounced)
  const [duplicates, setDuplicates] = useState<DuplicateRow[]>([]);
  const [dupLoading, setDupLoading] = useState(false);
  const dupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (dupTimerRef.current) clearTimeout(dupTimerRef.current);
    const p = phone.trim();
    const e = email.trim();
    if (!p && !e) {
      setDuplicates([]);
      return;
    }
    setDupLoading(true);
    dupTimerRef.current = setTimeout(() => {
      lookupParentDuplicatesAction({ phone: p, email: e })
        .then((rows) => setDuplicates(rows))
        .catch(() => setDuplicates([]))
        .finally(() => setDupLoading(false));
    }, 350);
    return () => {
      if (dupTimerRef.current) clearTimeout(dupTimerRef.current);
    };
  }, [phone, email]);

  // ── Submit
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ParentCreateResult | null>(null);

  // ── Derived warnings
  const customRelationshipText = useMemo(
    () => (relType === "OTHER" ? relNote.trim() || null : null),
    [relType, relNote],
  );
  const blockingDuplicates = useMemo(
    () =>
      duplicates.filter(
        (d) =>
          (d.entity === "Parent" && (d.field === "phoneKey" || d.field === "email")) ||
          (d.entity === "User" && accountMode !== "none"),
      ),
    [duplicates, accountMode],
  );
  const accountNeedsEmail = accountMode !== "none" && !email.trim();
  const otherRelMissingText = relType === "OTHER" && students.length > 0 && !relNote.trim();

  const warnings = useMemo(() => {
    const w: string[] = [];
    if (!fullName.trim()) w.push("Ad Soyad zorunlu.");
    if (!phone.trim()) w.push("Telefon eksik — veli ileride bulunamayabilir.");
    if (!email.trim()) w.push("Email eksik — hesap oluşturulamaz.");
    if (accountNeedsEmail) w.push("Seçilen hesap modu için email zorunlu.");
    if (otherRelMissingText) w.push("Yakınlık 'Diğer' seçildi; serbest yakınlık metnini doldurun.");
    if (blockingDuplicates.length > 0) w.push("Çakışan kayıt(lar) var — mevcut veliyi kullanın.");
    return w;
  }, [fullName, phone, email, accountNeedsEmail, otherRelMissingText, blockingDuplicates.length]);

  const canSubmit =
    !pending &&
    !result &&
    fullName.trim().length > 0 &&
    !accountNeedsEmail &&
    !otherRelMissingText &&
    blockingDuplicates.length === 0;

  const onAddStudent = useCallback(
    (id: string | null, row: ComboboxRow | null) => {
      if (!id || !row) return;
      setStudents((prev) => (prev.some((s) => s.id === id) ? prev : [...prev, row]));
      setStudentResetKey((k) => k + 1);
    },
    [],
  );
  const onRemoveStudent = (id: string) =>
    setStudents((prev) => prev.filter((s) => s.id !== id));

  const submit = () => {
    if (!canSubmit) return;
    const fd = new FormData();
    fd.set("fullName", fullName.trim());
    if (phone.trim()) fd.set("phone", phone.trim());
    if (phoneSecondary.trim()) fd.set("phoneSecondary", phoneSecondary.trim());
    if (email.trim()) fd.set("email", email.trim());
    if (notes.trim()) fd.set("notes", notes.trim());
    fd.set("accountMode", accountMode);
    if (accountDisabled && accountMode !== "none") fd.set("accountDisabled", "on");
    if (students.length > 0) {
      fd.set("relationshipType", relType);
      if (customRelationshipText) fd.set("relationship", customRelationshipText);
      if (isPrimary) fd.set("isPrimary", "on");
      for (const s of students) fd.append("studentIds", s.id);
    }
    // intent left out so the action returns the result instead of redirecting.

    startTransition(async () => {
      try {
        const r = await createParentWithAccountAction(fd);
        setResult(r);
        toast.success("Veli oluşturuldu");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
        toast.error(msg);
      }
    });
  };

  if (result) {
    return <ResultPanel result={result} onReset={() => {
      setResult(null);
      setFullName("");
      setPhone("");
      setPhoneSecondary("");
      setEmail("");
      setNotes("");
      setAccountMode("none");
      setAccountDisabled(false);
      setStudents([]);
      setRelType("MOTHER");
      setRelNote("");
      setIsPrimary(true);
    }} />;
  }

  return (
    <div
      className="od-grid"
      style={{ gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "flex-start" }}
    >
      <aside style={{ position: "sticky", top: 24 }}>
        <Card>
          <CardBody>
            <div
              style={{
                fontSize: 12,
                color: "var(--od-muted)",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Bölümler
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gap: 6,
                fontSize: 13,
              }}
            >
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={"#" + s.id} style={{ color: "var(--od-text)", textDecoration: "none" }}>
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
            {warnings.length > 0 ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "var(--od-muted)", marginBottom: 6 }}>
                  Uyarılar
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "var(--pd-warn, #b45309)" }}>
                  {warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </aside>

      <div className="od-grid" style={{ gap: 16 }}>
        {/* 1. Kimlik */}
        <Card>
          <CardBody>
            <h3 id="kimlik" style={{ marginTop: 0 }}>1. Kimlik</h3>
            <p style={{ marginTop: 0, color: "var(--od-muted)", fontSize: 13 }}>
              Telefon ve email üzerinden çakışan kayıt anlık olarak kontrol edilir.
            </p>
            <div className="od-grid g-2" style={{ gap: 12 }}>
              <Field label="Ad Soyad *">
                <Input
                  name="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="off"
                />
              </Field>
              <Field label="Telefon" hint="Olmadan veli arama zorlaşır.">
                <Input
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+90 5xx xxx xx xx"
                />
              </Field>
              <Field label="İkinci telefon (ops.)">
                <Input
                  value={phoneSecondary}
                  onChange={(e) => setPhoneSecondary(e.target.value)}
                  placeholder="Eş / iş telefonu"
                />
              </Field>
              <Field label="Email" hint="Hesap erişimi için zorunlu.">
                <Input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                />
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="İç not (admin gözüne)">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </Field>
              </div>
            </div>

            <DuplicatesPanel
              loading={dupLoading}
              duplicates={duplicates}
              accountMode={accountMode}
            />
          </CardBody>
        </Card>

        {/* 2. Hesap erişimi */}
        <Card>
          <CardBody>
            <h3 id="hesap" style={{ marginTop: 0 }}>2. Hesap erişimi</h3>
            <p style={{ marginTop: 0, color: "var(--od-muted)", fontSize: 13 }}>
              Veli panelde çocuk(lar)ının takibini görebilmek için hesap gerektirir.
              Davet linki en güvenli yoldur; geçici şifre acil durumlar içindir.
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              <AccountModeRadio
                value="none"
                current={accountMode}
                onSelect={setAccountMode}
                title="Hesap oluşturma"
                desc="Sadece CRM kaydı. Daha sonra detay sayfasından hesap açılabilir."
              />
              <AccountModeRadio
                value="invite"
                current={accountMode}
                onSelect={setAccountMode}
                title="Davet linki üret (önerilen)"
                desc="14 gün geçerli tek kullanımlık link üretilir. Veli kendi şifresini belirler."
                disabled={!email.trim()}
                disabledHint={!email.trim() ? "Email gerekli." : undefined}
              />
              <AccountModeRadio
                value="tempPassword"
                current={accountMode}
                onSelect={setAccountMode}
                title="Geçici şifre oluştur"
                desc="Tek seferlik gösterilen şifre. İlk girişte değiştirme zorunlu olur."
                disabled={!email.trim()}
                disabledHint={!email.trim() ? "Email gerekli." : undefined}
              />
              {accountMode !== "none" ? (
                <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={accountDisabled}
                    onChange={(e) => setAccountDisabled(e.target.checked)}
                  />
                  Hesabı devre dışı oluştur (sonra etkinleştirilebilir)
                </label>
              ) : null}
            </div>
          </CardBody>
        </Card>

        {/* 3. Öğrenciler */}
        <Card>
          <CardBody>
            <h3 id="ogrenci" style={{ marginTop: 0 }}>3. Bağlı öğrenciler</h3>
            <p style={{ marginTop: 0, color: "var(--od-muted)", fontSize: 13 }}>
              Bir veya birden fazla öğrenci seçebilirsiniz. Hepsine aynı yakınlık atanır;
              farklı yakınlıklar için kaydetdikten sonra detay sayfasından düzenleyin.
            </p>
            <div className="od-grid g-2" style={{ gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Öğrenci ara ve ekle">
                  <EntitySearchCombobox
                    entity="students"
                    placeholder="İsim / telefon ile ara..."
                    onChange={onAddStudent}
                    resetKey={studentResetKey}
                  />
                </Field>
              </div>
              {students.length === 0 ? (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    padding: 12,
                    border: "1px dashed var(--pd-line)",
                    borderRadius: 8,
                    fontSize: 13,
                    color: "var(--od-muted)",
                  }}
                >
                  Henüz öğrenci seçilmedi. Veli'yi öğrenciye bağlamadan da
                  kaydedebilirsiniz; daha sonra detay sayfasından eklenebilir.
                </div>
              ) : (
                <ul
                  style={{
                    gridColumn: "1 / -1",
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "grid",
                    gap: 6,
                  }}
                >
                  {students.map((s) => (
                    <li
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        border: "1px solid var(--pd-line)",
                        borderRadius: 8,
                        background: "var(--pd-bg-subtle, var(--pd-bg))",
                        fontSize: 13,
                      }}
                    >
                      <span>
                        <strong>{s.label}</strong>
                        {s.sub ? <span style={{ color: "var(--od-muted)" }}> · {s.sub}</span> : null}
                      </span>
                      <button
                        type="button"
                        className="od-btn od-btn-ghost"
                        onClick={() => onRemoveStudent(s.id)}
                        style={{ fontSize: 12 }}
                      >
                        Çıkar
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {students.length > 0 ? (
                <>
                  <Field label="Yakınlık türü *">
                    <Select
                      value={relType}
                      onChange={(e) => setRelType(e.target.value as ParentRelationshipType)}
                    >
                      {RELATIONSHIP_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </Select>
                  </Field>
                  {relType === "OTHER" ? (
                    <Field label="Serbest yakınlık metni *" hint="Örn: Dede, Hala">
                      <Input
                        value={relNote}
                        onChange={(e) => setRelNote(e.target.value)}
                        placeholder="Dede"
                      />
                    </Field>
                  ) : (
                    <div />
                  )}
                  <Field label="Birincil iletişim">
                    <label style={{ fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={isPrimary}
                        onChange={(e) => setIsPrimary(e.target.checked)}
                      />{" "}
                      Listedeki ilk öğrenci için birincil veli olarak işaretle
                    </label>
                  </Field>
                </>
              ) : null}
            </div>
          </CardBody>
        </Card>

        {/* 4. Önizleme */}
        <Card>
          <CardBody>
            <h3 id="ozet" style={{ marginTop: 0 }}>4. Önizleme</h3>
            <ReviewPanel
              fullName={fullName}
              phone={phone}
              email={email}
              notes={notes}
              accountMode={accountMode}
              accountDisabled={accountDisabled}
              students={students}
              relType={relType}
              relNote={customRelationshipText}
              isPrimary={isPrimary}
              warnings={warnings}
            />
            <FormActions>
              <Link href="/panel/admin/veliler" className="od-btn od-btn-ghost">İptal</Link>
              <button
                type="button"
                className="od-btn od-btn-primary"
                onClick={submit}
                disabled={!canSubmit}
              >
                {pending ? "Kaydediliyor..." : "Veliyi kaydet"}
              </button>
            </FormActions>
            <p style={{ marginTop: 12, fontSize: 12, color: "var(--od-muted)" }}>
              Bütün adımlar tek bir işlem olarak kaydedilir; bir adım hata verirse hiçbir şey yazılmaz.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────

function AccountModeRadio({
  value,
  current,
  onSelect,
  title,
  desc,
  disabled,
  disabledHint,
}: {
  value: AccountMode;
  current: AccountMode;
  onSelect: (v: AccountMode) => void;
  title: string;
  desc: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const active = value === current;
  return (
    <label
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: 10,
        border: `1px solid ${active ? "var(--pd-accent, #3b82f6)" : "var(--pd-line)"}`,
        borderRadius: 8,
        background: active ? "var(--pd-bg-subtle, var(--pd-bg))" : "transparent",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <input
        type="radio"
        name="accountMode"
        value={value}
        checked={active}
        disabled={disabled}
        onChange={() => onSelect(value)}
        style={{ marginTop: 3 }}
      />
      <span style={{ display: "grid", gap: 2 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
        <span style={{ fontSize: 12, color: "var(--od-muted)" }}>{desc}</span>
        {disabled && disabledHint ? (
          <span style={{ fontSize: 11, color: "var(--pd-warn, #b45309)" }}>{disabledHint}</span>
        ) : null}
      </span>
    </label>
  );
}

function DuplicatesPanel({
  loading,
  duplicates,
  accountMode,
}: {
  loading: boolean;
  duplicates: DuplicateRow[];
  accountMode: AccountMode;
}) {
  if (loading) {
    return (
      <div style={{ marginTop: 10, fontSize: 12, color: "var(--od-muted)" }}>
        Çakışan kayıt aranıyor...
      </div>
    );
  }
  if (duplicates.length === 0) return null;
  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        border: "1px solid var(--pd-line)",
        borderRadius: 8,
        background: "var(--pd-bg-subtle, var(--pd-bg))",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "var(--od-muted)",
          textTransform: "uppercase",
          letterSpacing: ".04em",
          marginBottom: 8,
        }}
      >
        Olası çakışmalar ({duplicates.length})
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
        {duplicates.map((d) => {
          const blocking =
            (d.entity === "Parent" && (d.field === "phoneKey" || d.field === "email")) ||
            (d.entity === "User" && accountMode !== "none");
          const tone: "bad" | "warn" = blocking ? "bad" : "warn";
          const href =
            d.entity === "Parent"
              ? `/panel/admin/veliler/${d.existingId}/duzenle`
              : d.entity === "Student"
                ? `/panel/admin/ogrenciler/${d.existingId}/duzenle`
                : null;
          return (
            <li
              key={`${d.entity}-${d.field}-${d.existingId}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                fontSize: 13,
              }}
            >
              <span style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 0 }}>
                <Badge tone={tone}>
                  {d.entity === "Parent" ? "Veli" : d.entity === "Student" ? "Öğrenci" : "Kullanıcı"}
                  {" · "}
                  {d.field === "phoneKey" ? "telefon" : d.field === "email" ? "email" : "user email"}
                </Badge>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={d.existingLabel}
                >
                  {d.existingLabel}
                </span>
              </span>
              {href ? (
                <Link href={href} className="od-btn od-btn-ghost" style={{ fontSize: 12 }}>
                  Aç
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: "var(--od-muted)" }}>
        Kırmızı işaretliler kaydı engeller — mevcut kaydı kullanın. Sarı olanlar bilgilendirme amaçlıdır.
      </p>
    </div>
  );
}

function ReviewPanel({
  fullName,
  phone,
  email,
  notes,
  accountMode,
  accountDisabled,
  students,
  relType,
  relNote,
  isPrimary,
  warnings,
}: {
  fullName: string;
  phone: string;
  email: string;
  notes: string;
  accountMode: AccountMode;
  accountDisabled: boolean;
  students: ComboboxRow[];
  relType: ParentRelationshipType;
  relNote: string | null;
  isPrimary: boolean;
  warnings: string[];
}) {
  const accountLabel =
    accountMode === "none"
      ? "Hesap oluşturulmayacak"
      : accountMode === "invite"
        ? `Davet linki üretilecek${accountDisabled ? " (devre dışı)" : ""}`
        : `Geçici şifre üretilecek${accountDisabled ? " (devre dışı)" : ""}`;
  const relationshipLabel =
    relType === "OTHER"
      ? `Diğer${relNote ? ` (${relNote})` : ""}`
      : getCanonicalRelationshipLabel(relType);
  return (
    <div
      className="od-grid g-2"
      style={{ gap: 12, marginBottom: 12, fontSize: 13 }}
    >
      <ReviewRow label="Ad Soyad" value={fullName || "—"} />
      <ReviewRow label="Telefon" value={phone || "—"} />
      <ReviewRow label="Email" value={email || "—"} />
      <ReviewRow label="Hesap" value={accountLabel} />
      <div style={{ gridColumn: "1 / -1" }}>
        <ReviewRow
          label={`Öğrenciler (${students.length})`}
          value={
            students.length === 0
              ? "—"
              : students.map((s) => s.label).join(", ")
          }
        />
      </div>
      {students.length > 0 ? (
        <ReviewRow
          label="Yakınlık"
          value={`${relationshipLabel}${isPrimary ? " · birincil" : ""}`}
        />
      ) : null}
      {notes.trim() ? (
        <div style={{ gridColumn: "1 / -1" }}>
          <ReviewRow label="Not" value={notes.trim()} />
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <div style={{ gridColumn: "1 / -1" }}>
          <div
            style={{
              padding: 10,
              border: "1px solid var(--pd-warn, #b45309)",
              borderRadius: 8,
              background: "var(--pd-bg-subtle, var(--pd-bg))",
              fontSize: 12,
              color: "var(--pd-warn, #b45309)",
            }}
          >
            <strong>Dikkat:</strong>
            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <span style={{ fontSize: 11, color: "var(--od-muted)", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function ResultPanel({
  result,
  onReset,
}: {
  result: ParentCreateResult;
  onReset: () => void;
}) {
  const firstStudentId = result.linkedStudentIds[0];
  return (
    <div className="od-grid" style={{ gap: 16, maxWidth: 720 }}>
      <Card>
        <CardBody>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge tone="ok">Veli oluşturuldu</Badge>
            <span style={{ fontSize: 12, color: "var(--od-muted)" }}>
              ID: <code>{result.parentId}</code>
            </span>
          </div>

          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 8, fontSize: 13 }}>
            <li>
              Hesap modu: <strong>
                {result.accountMode === "none"
                  ? "Hesap oluşturulmadı"
                  : result.accountMode === "invite"
                    ? "Davet linki üretildi"
                    : "Geçici şifre üretildi"}
              </strong>
            </li>
            <li>Bağlı öğrenci sayısı: <strong>{result.linkedStudentIds.length}</strong></li>
            {result.duplicates.length > 0 ? (
              <li style={{ color: "var(--od-muted)" }}>
                Yumuşak çakışma uyarısı: {result.duplicates.length} kayıt
              </li>
            ) : null}
          </ul>

          {result.inviteUrl ? (
            <CopyOnceField label="Davet linki" value={result.inviteUrl} hint="14 gün geçerli. Veliye WhatsApp/SMS ile gönderin." />
          ) : null}
          {result.tempPassword ? (
            <CopyOnceField
              label="Geçici şifre"
              value={result.tempPassword}
              hint="Bu şifre yalnızca bir kez gösterilir. Veliye güvenli kanaldan iletin. İlk girişte değiştirilecek."
              danger
            />
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h4 style={{ marginTop: 0 }}>Sıradaki adım</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href={`/panel/admin/veliler/${result.parentId}/duzenle`}
              className="od-btn od-btn-primary"
            >
              Veli detayına git
            </Link>
            {firstStudentId ? (
              <Link
                href={`/panel/admin/ogrenciler/${firstStudentId}/duzenle`}
                className="od-btn od-btn-ghost"
              >
                Bağlı öğrenciye git
              </Link>
            ) : null}
            <button type="button" className="od-btn od-btn-ghost" onClick={onReset}>
              Yeni veli oluştur
            </button>
            <Link href="/panel/admin/veliler" className="od-btn od-btn-ghost">
              Liste
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function CopyOnceField({
  label,
  value,
  hint,
  danger,
}: {
  label: string;
  value: string;
  hint?: string;
  danger?: boolean;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Kopyalandı");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopyalanamadı");
    }
  };
  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        border: `1px solid ${danger ? "var(--pd-danger, #b91c1c)" : "var(--pd-line)"}`,
        borderRadius: 8,
        background: "var(--pd-bg-subtle, var(--pd-bg))",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--od-muted)", marginBottom: 6 }}>{label}</div>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 13,
          wordBreak: "break-all",
        }}
      >
        <code style={{ flex: 1 }}>{value}</code>
        <button type="button" className="od-btn od-btn-ghost" onClick={copy} style={{ fontSize: 12 }}>
          {copied ? "✓ Kopyalandı" : "Kopyala"}
        </button>
      </div>
      {hint ? (
        <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: "var(--od-muted)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
