"use client";

/**
 * Phase 3 / Session 4 — D2: Teacher Creation Wizard (client).
 *
 * Sectioned single-page form that drives `createTeacherWithAccountAction`
 * and renders a live duplicate panel via `lookupTeacherDuplicatesAction`.
 * Stays on the page after submit so the admin can copy the invite URL or
 * the one-time temporary password before navigating away.
 *
 * Mirrors `parent-create-wizard.tsx` and reuses the same UI primitives.
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { useToast } from "@/components/ui/toast";
import {
  createTeacherWithAccountAction,
  lookupTeacherDuplicatesAction,
  type TeacherCreateResult,
} from "@/app/panel/admin/ogretmenler/_actions";

type AccountMode = "none" | "invite" | "tempPassword";
type DuplicateRow = Awaited<ReturnType<typeof lookupTeacherDuplicatesAction>>[number];

type ClassroomOption = { id: string; name: string; branch: string | null };
type CourseOption = { id: string; title: string };

type Props = {
  classrooms: ClassroomOption[];
  courses: CourseOption[];
};

const SECTIONS = [
  { id: "kimlik",      title: "1. Kimlik" },
  { id: "hesap",       title: "2. Hesap erişimi" },
  { id: "atama",       title: "3. Sınıf / ders ataması" },
  { id: "musaitlik",   title: "4. Müsaitlik" },
  { id: "hakedis",     title: "5. Hakediş" },
  { id: "ozet",        title: "6. Önizleme" },
] as const;

export function TeacherCreateWizard({ classrooms, courses }: Props) {
  const toast = useToast();

  // ── 1. Identity
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subjects, setSubjects] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // ── 2. Account
  const [accountMode, setAccountMode] = useState<AccountMode>("none");
  const [accountDisabled, setAccountDisabled] = useState(false);

  // ── 3. Classroom assignments
  const [classroomIds, setClassroomIds] = useState<string[]>([]);
  const [classroomSubject, setClassroomSubject] = useState("");
  const [isLead, setIsLead] = useState(false);

  // ── 5. Compensation (optional)
  const [compHourlyRate, setCompHourlyRate] = useState("");
  const [compCourseId, setCompCourseId] = useState("");
  const [compClassroomId, setCompClassroomId] = useState("");
  const [compStartsAt, setCompStartsAt] = useState("");
  const [compNote, setCompNote] = useState("");

  // ── Duplicate detection (debounced)
  const [duplicates, setDuplicates] = useState<DuplicateRow[]>([]);
  const [dupLoading, setDupLoading] = useState(false);
  const dupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (dupTimerRef.current) clearTimeout(dupTimerRef.current);
    const p = phone.trim();
    const e = email.trim();
    const n = fullName.trim();
    if (!p && !e && n.length < 3) {
      setDuplicates([]);
      return;
    }
    setDupLoading(true);
    dupTimerRef.current = setTimeout(() => {
      lookupTeacherDuplicatesAction({ phone: p, email: e, fullName: n })
        .then((rows) => setDuplicates(rows))
        .catch(() => setDuplicates([]))
        .finally(() => setDupLoading(false));
    }, 350);
    return () => {
      if (dupTimerRef.current) clearTimeout(dupTimerRef.current);
    };
  }, [phone, email, fullName]);

  // ── Submit
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<TeacherCreateResult | null>(null);

  const blockingDuplicates = useMemo(
    () =>
      duplicates.filter(
        (d) =>
          (d.entity === "Teacher" && d.field === "email") ||
          (d.entity === "User" && accountMode !== "none"),
      ),
    [duplicates, accountMode],
  );
  const accountNeedsEmail = accountMode !== "none" && !email.trim();

  const warnings = useMemo(() => {
    const w: string[] = [];
    if (!fullName.trim()) w.push("Ad Soyad zorunlu.");
    if (!subjects.trim()) w.push("Branş zorunlu.");
    if (!email.trim()) w.push("Email eksik — hesap oluşturulamaz.");
    if (!phone.trim()) w.push("Telefon eksik — operasyonel iletişim zayıflar.");
    if (accountNeedsEmail) w.push("Seçilen hesap modu için email zorunlu.");
    if (classroomIds.length === 0) w.push("Sınıf ataması yok — öğretmen henüz hiçbir sınıfta görünmeyecek.");
    if (!compHourlyRate.trim()) w.push("Hakediş kuralı atanmadı — bordro öncesi tanımlamanız gerekecek.");
    if (blockingDuplicates.length > 0) w.push("Çakışan kayıt(lar) var — mevcut öğretmeni kullanın.");
    return w;
  }, [fullName, subjects, email, phone, accountNeedsEmail, classroomIds.length, compHourlyRate, blockingDuplicates.length]);

  const canSubmit =
    !!fullName.trim() && !!subjects.trim() && !accountNeedsEmail && blockingDuplicates.length === 0 && !pending;

  const submit = (intent: "save" | "save-and-go") => {
    if (!canSubmit) return;
    const fd = new FormData();
    fd.append("fullName", fullName);
    fd.append("subjects", subjects);
    if (email) fd.append("email", email);
    if (phone) fd.append("phone", phone);
    if (bio) fd.append("bio", bio);
    fd.append("status", status);
    fd.append("accountMode", accountMode);
    if (accountDisabled) fd.append("accountDisabled", "on");
    for (const cid of classroomIds) fd.append("classroomIds", cid);
    if (classroomSubject) fd.append("classroomSubject", classroomSubject);
    if (isLead) fd.append("isLead", "on");
    if (compHourlyRate) {
      fd.append("compHourlyRate", compHourlyRate);
      if (compCourseId) fd.append("compCourseId", compCourseId);
      if (compClassroomId) fd.append("compClassroomId", compClassroomId);
      if (compStartsAt) fd.append("compStartsAt", compStartsAt);
      if (compNote) fd.append("compNote", compNote);
    }
    fd.append("intent", intent);

    startTransition(async () => {
      try {
        const res = await createTeacherWithAccountAction(fd);
        setResult(res);
        toast.success("Öğretmen oluşturuldu");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Hata");
      }
    });
  };

  if (result) {
    return (
      <ResultPanel
        result={result}
        onCreateAnother={() => {
          setResult(null);
          setFullName("");
          setEmail("");
          setPhone("");
          setSubjects("");
          setBio("");
          setStatus("ACTIVE");
          setAccountMode("none");
          setAccountDisabled(false);
          setClassroomIds([]);
          setClassroomSubject("");
          setIsLead(false);
          setCompHourlyRate("");
          setCompCourseId("");
          setCompClassroomId("");
          setCompStartsAt("");
          setCompNote("");
          setDuplicates([]);
        }}
      />
    );
  }

  return (
    <div className="od-grid g-3" style={{ gap: 16, gridTemplateColumns: "minmax(0, 1fr) 240px" }}>
      <div style={{ display: "grid", gap: 16 }}>
        {/* 1. Identity */}
        <Section id="kimlik" title="1. Kimlik">
          <div className="od-form-grid">
            <Field label="Ad Soyad *">
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
            </Field>
            <Field label="Branş *">
              <Input value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="Matematik, Fizik" required />
            </Field>
            <Field label="Email">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </Field>
            <Field label="Telefon">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx xxx xx xx" />
            </Field>
            <Field label="Durum">
              <Select value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Pasif</option>
              </Select>
            </Field>
            <div className="full">
              <Field label="Dahili not / bio">
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Kısa biyografi veya operasyonel notlar" />
              </Field>
            </div>
          </div>
          <DuplicatesPanel rows={duplicates} loading={dupLoading} accountMode={accountMode} />
        </Section>

        {/* 2. Account */}
        <Section id="hesap" title="2. Hesap erişimi">
          <AccountModeRadio value={accountMode} onChange={setAccountMode} disabled={!email.trim()} />
          {!email.trim() ? (
            <div className="od-soft-alert is-info" style={{ marginTop: 8 }}>
              Hesap oluşturmak için önce <b>Kimlik</b> bölümünde email girin.
            </div>
          ) : null}
          {accountMode !== "none" ? (
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={accountDisabled}
                onChange={(e) => setAccountDisabled(e.target.checked)}
              />
              Hesap oluşturulduktan sonra <b>devre dışı</b> başlasın (henüz girişe açılmasın)
            </label>
          ) : null}
        </Section>

        {/* 3. Classroom assignment */}
        <Section id="atama" title="3. Sınıf / ders ataması">
          {classrooms.length === 0 ? (
            <div className="od-empty-soft" style={{ padding: 12 }}>
              Henüz sınıf yok. Önce <Link href="/panel/admin/siniflar/yeni" className="od-btn ghost sm">sınıf oluşturun</Link>.
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 6, maxHeight: 220, overflowY: "auto", padding: 8, border: "1px solid var(--pd-line)", borderRadius: 8 }}>
                {classrooms.map((c) => (
                  <label key={c.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={classroomIds.includes(c.id)}
                      onChange={(e) => {
                        setClassroomIds((prev) =>
                          e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                        );
                      }}
                    />
                    <span>
                      {c.name}
                      {c.branch ? <span className="od-muted"> · {c.branch}</span> : null}
                    </span>
                  </label>
                ))}
              </div>
              <div className="od-form-grid" style={{ marginTop: 12 }}>
                <Field label="Ortak ders / branş (opsiyonel)">
                  <Input value={classroomSubject} onChange={(e) => setClassroomSubject(e.target.value)} placeholder="Matematik" />
                </Field>
                <Field label="Rol">
                  <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="checkbox" checked={isLead} onChange={(e) => setIsLead(e.target.checked)} />
                    Sınıf öğretmeni / lider (yalnızca ilk seçilen sınıfta)
                  </label>
                </Field>
              </div>
              <div className="od-muted" style={{ fontSize: 12, marginTop: 6 }}>
                Daha ince rol ayrımı (rehber / şube / yardımcı) için ek alanlar mevcut model üzerinde tanımlı değil; gerekirse sınıf detayında düzenleyebilirsiniz.
              </div>
            </>
          )}
        </Section>

        {/* 4. Availability — deferred */}
        <Section id="musaitlik" title="4. Müsaitlik">
          <div className="od-soft-alert">
            <b>Müsaitlik modeli henüz yok.</b><br />
            Haftalık müsaitlik / blok saatler için ayrı bir veri modeli (TeacherAvailability) bu oturumda kapsam dışı.
            Şimdilik müsaitlik bilgisi <i>Dahili not</i> alanına yazılabilir; gelecekteki bir oturumda yapılandırılmış model getirilecek.
          </div>
        </Section>

        {/* 5. Compensation */}
        <Section id="hakedis" title="5. Hakediş kuralı (opsiyonel)">
          <div className="od-form-grid">
            <Field label="Saatlik ücret (₺)">
              <Input value={compHourlyRate} onChange={(e) => setCompHourlyRate(e.target.value)} placeholder="Ör. 750" inputMode="decimal" />
            </Field>
            <Field label="Başlangıç tarihi">
              <Input type="date" value={compStartsAt} onChange={(e) => setCompStartsAt(e.target.value)} />
            </Field>
            <Field label="Yalnızca bu ders için">
              <Select value={compCourseId} onChange={(e) => setCompCourseId(e.target.value)}>
                <option value="">Tümü</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </Select>
            </Field>
            <Field label="Yalnızca bu sınıf için">
              <Select value={compClassroomId} onChange={(e) => setCompClassroomId(e.target.value)}>
                <option value="">Tümü</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.branch ? ` · ${c.branch}` : ""}</option>
                ))}
              </Select>
            </Field>
            <div className="full">
              <Field label="Not">
                <Input value={compNote} onChange={(e) => setCompNote(e.target.value)} placeholder="örn. yeni dönem zammı" />
              </Field>
            </div>
          </div>
          <div className="od-muted" style={{ fontSize: 12, marginTop: 6 }}>
            Boş bırakılırsa hakediş kuralı oluşturulmaz; öğretmen detayında veya{" "}
            <Link href="/panel/admin/ogretmen-hakedisleri/kurallar" className="od-link">hakediş kuralları</Link>{" "}
            sayfasında daha sonra ekleyebilirsiniz.
          </div>
        </Section>

        {/* 6. Review */}
        <Section id="ozet" title="6. Önizleme">
          <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
            <ReviewRow label="Ad Soyad" value={fullName || "—"} />
            <ReviewRow label="Branş" value={subjects || "—"} />
            <ReviewRow label="Email" value={email || "—"} />
            <ReviewRow label="Telefon" value={phone || "—"} />
            <ReviewRow label="Durum" value={status === "ACTIVE" ? "Aktif" : "Pasif"} />
            <ReviewRow
              label="Hesap"
              value={
                accountMode === "none" ? "Hesap oluşturulmayacak" :
                accountMode === "invite" ? "Hesap + davet linki" :
                "Hesap + geçici şifre"
              }
            />
            <ReviewRow label="Sınıf sayısı" value={String(classroomIds.length)} />
            <ReviewRow label="Hakediş" value={compHourlyRate ? `${compHourlyRate} ₺/saat` : "Yok"} />
          </div>
          {warnings.length > 0 ? (
            <div className="od-soft-alert" style={{ marginTop: 12 }}>
              <b>Uyarılar</b>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          ) : null}
          <div style={{ marginTop: 16 }}>
          <FormActions>
            <button type="button" className="od-btn dark" disabled={!canSubmit} onClick={() => submit("save")}>
              {pending ? "Kaydediliyor…" : "Öğretmeni oluştur"}
            </button>
            <button type="button" className="od-btn ghost" disabled={!canSubmit} onClick={() => submit("save-and-go")}>
              Oluştur ve detaya git
            </button>
            <Link href="/panel/admin/ogretmenler" className="od-btn ghost">İptal</Link>
          </FormActions>
          </div>
        </Section>
      </div>

      {/* Sticky TOC */}
      <aside style={{ position: "sticky", top: 16, alignSelf: "start", display: "grid", gap: 6 }}>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="od-link" style={{ fontSize: 13 }}>
            {s.title}
          </a>
        ))}
        {duplicates.length > 0 ? (
          <div style={{ marginTop: 10, padding: 8, border: "1px solid var(--pd-line)", borderRadius: 8, fontSize: 12 }}>
            <b>Olası eşleşmeler:</b>
            <div className="od-muted">{duplicates.length} kayıt</div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <Card id={id}>
      <CardBody>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{title}</h2>
        {children}
      </CardBody>
    </Card>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", borderBottom: "1px solid var(--pd-line)" }}>
      <span className="od-muted">{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function AccountModeRadio({
  value,
  onChange,
  disabled,
}: {
  value: AccountMode;
  onChange: (v: AccountMode) => void;
  disabled: boolean;
}) {
  const opts: { v: AccountMode; title: string; desc: string }[] = [
    { v: "none",         title: "Henüz hesap açma",     desc: "Sadece öğretmen kaydı oluşturulsun; girişe daha sonra açarsınız." },
    { v: "invite",       title: "Hesap + davet linki",  desc: "Öğretmen kendi şifresini /davet/[token] üzerinden belirler." },
    { v: "tempPassword", title: "Hesap + geçici şifre", desc: "Bir kez gösterilen geçici şifre üretilir, ilk girişte değiştirmesi gerekir." },
  ];
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {opts.map((o) => (
        <label
          key={o.v}
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 10,
            padding: 10,
            border: `1px solid ${value === o.v ? "var(--pd-ink-1, #111)" : "var(--pd-line)"}`,
            borderRadius: 10,
            cursor: disabled && o.v !== "none" ? "not-allowed" : "pointer",
            opacity: disabled && o.v !== "none" ? 0.5 : 1,
          }}
        >
          <input
            type="radio"
            checked={value === o.v}
            onChange={() => onChange(o.v)}
            disabled={disabled && o.v !== "none"}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{o.title}</div>
            <div className="od-muted" style={{ fontSize: 12 }}>{o.desc}</div>
          </div>
        </label>
      ))}
    </div>
  );
}

function DuplicatesPanel({
  rows,
  loading,
  accountMode,
}: {
  rows: DuplicateRow[];
  loading: boolean;
  accountMode: AccountMode;
}) {
  if (rows.length === 0) {
    return loading ? (
      <div className="od-muted" style={{ fontSize: 12, marginTop: 8 }}>Olası eşleşmeler kontrol ediliyor…</div>
    ) : null;
  }
  return (
    <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
      {rows.map((r, i) => {
        const isBlocking =
          (r.entity === "Teacher" && r.field === "email") ||
          (r.entity === "User" && accountMode !== "none");
        return (
          <div
            key={`${r.entity}-${r.existingId}-${i}`}
            style={{
              padding: 10,
              borderRadius: 8,
              border: `1px solid ${isBlocking ? "var(--pd-warn, #b45309)" : "var(--pd-line)"}`,
              background: isBlocking ? "rgba(245, 158, 11, 0.08)" : "transparent",
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Badge tone={isBlocking ? "warn" : "neutral"}>{r.entity}</Badge>
            <span style={{ fontSize: 13 }}>
              <b>{r.existingLabel}</b> <span className="od-muted">· {r.field}</span>
            </span>
            {r.entity === "Teacher" ? (
              <Link href={`/panel/admin/ogretmenler/${r.existingId}/duzenle`} className="od-btn ghost sm" style={{ marginLeft: "auto" }}>
                Mevcut öğretmene git →
              </Link>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ResultPanel({
  result,
  onCreateAnother,
}: {
  result: TeacherCreateResult;
  onCreateAnother: () => void;
}) {
  return (
    <Card>
      <CardBody>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <Badge tone="ok">Oluşturuldu</Badge>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Öğretmen kaydı hazır</span>
        </div>
        <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
          <div>
            <span className="od-muted">Öğretmen ID:</span> <code>{result.teacherId}</code>
          </div>
          <div>
            <span className="od-muted">Hesap modu:</span>{" "}
            {result.accountMode === "none" ? "Hesap açılmadı" :
             result.accountMode === "invite" ? "Davet linki üretildi" :
             "Geçici şifre üretildi"}
          </div>
          <div>
            <span className="od-muted">Atanan sınıf sayısı:</span> {result.classroomIds.length}
          </div>
          {result.compensationRuleId ? (
            <div>
              <span className="od-muted">Hakediş kuralı:</span> oluşturuldu
            </div>
          ) : null}
        </div>
        {result.inviteUrl ? <CopyOnceField label="Davet linki" value={result.inviteUrl} kind="url" /> : null}
        {result.tempPassword ? <CopyOnceField label="Geçici şifre (yalnızca bir kez gösterilir)" value={result.tempPassword} kind="tempPassword" /> : null}
        <div style={{ marginTop: 16 }}>
        <FormActions>
          <Link href={`/panel/admin/ogretmenler/${result.teacherId}/duzenle`} className="od-btn dark">
            Detaya git
          </Link>
          <button type="button" className="od-btn ghost" onClick={onCreateAnother}>
            Yeni öğretmen ekle
          </button>
          <Link href="/panel/admin/ogretmenler" className="od-btn ghost">Listeye dön</Link>
        </FormActions>
        </div>
      </CardBody>
    </Card>
  );
}

function CopyOnceField({ label, value, kind }: { label: string; value: string; kind: "url" | "tempPassword" }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Panoya kopyalandı");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopyalanamadı — manuel seçip kopyalayın");
    }
  };
  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        border: `1px solid ${kind === "tempPassword" ? "var(--pd-bad, #b91c1c)" : "var(--pd-line)"}`,
        borderRadius: 8,
        background: "var(--pd-bg-subtle, var(--pd-bg))",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--od-muted)" }}>{label}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: "ui-monospace, monospace", fontSize: 13, wordBreak: "break-all" }}>
        <code style={{ flex: 1 }}>{value}</code>
        <button type="button" className="od-btn ghost sm" onClick={copy}>
          {copied ? "✓ Kopyalandı" : "Kopyala"}
        </button>
      </div>
    </div>
  );
}
