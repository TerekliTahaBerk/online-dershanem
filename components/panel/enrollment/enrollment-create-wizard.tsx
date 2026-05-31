"use client";

/**
 * Phase 3 / Session 5 — Enrollment creation wizard.
 *
 * Sections:
 *   1. Öğrenci         — pre-selected (from /yeni?student=…) or admin search
 *   2. Paket           — active Package list with "already-active" warning
 *   3. Sınıf / erişim  — optional classroom + ODK access tag toggles
 *   4. Ödeyici veli    — student-linked parents only; CTA when none
 *   5. Ödeme planı     — NONE / ONE_TIME / INSTALLMENTS with live preview
 *   6. Önizleme        — final review + warnings
 *
 * No payment provider integration. PaymentScheduleItem rows are created with
 * status=PENDING. Parent cannot self-mark paid (admin-only mutation surface
 * lives in `app/panel/admin/odemeler/_actions.ts`).
 */

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { Badge } from "@/components/panel/ui/badge";
import { EntitySearchCombobox } from "@/components/panel/ui/entity-search-combobox";
import {
  createEnrollmentAction,
  type EnrollmentSubmitState,
} from "@/app/panel/admin/kayitlar/_actions";
import {
  calculatePaymentPlanPreview,
  getEnrollmentStatusLabel,
  type EnrollmentOption,
  type ParentPayerOption,
  type PaymentPlanInput,
  type StudentEnrollmentSnapshot,
} from "@/lib/panel/enrollment-shared";

const TRY = (kurus: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(kurus / 100);

const DATE_TR = (d: Date) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(d);

function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 10);
}

type StudentSummary = {
  id: string;
  fullName: string;
  classLevel: string | null;
  examType: string | null;
  hasUserAccount: boolean;
  classroomCount: number;
  parentCount: number;
};

type Props = {
  initialStudent: StudentSummary | null;
  initialSnapshot: StudentEnrollmentSnapshot | null;
  initialPayers: ParentPayerOption[];
  initialAlreadyActivePackageIds: string[];
  packages: EnrollmentOption[];
  classrooms: Array<{ id: string; name: string; branch: string | null }>;
  odkAccessTags: Array<{ id: string; key: string; title: string }>;
};

export function EnrollmentCreateWizard({
  initialStudent,
  initialSnapshot,
  initialPayers,
  initialAlreadyActivePackageIds,
  packages,
  classrooms,
  odkAccessTags,
}: Props) {
  // ── form state ──────────────────────────────────────────────────────────
  const [studentId, setStudentId] = useState<string | null>(initialStudent?.id ?? null);
  const [studentLabel, setStudentLabel] = useState<string>(initialStudent?.fullName ?? "");
  const [packageId, setPackageId] = useState<string>("");
  const [classroomId, setClassroomId] = useState<string>("");
  const [payerParentId, setPayerParentId] = useState<string>("");
  const [status, setStatus] = useState<string>("ACTIVE");
  const [source, setSource] = useState<string>("MANUAL");
  const [startsAt, setStartsAt] = useState<string>(todayISO());
  const [endsAt, setEndsAt] = useState<string>("");
  const [billingPeriodLabel, setBillingPeriodLabel] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Payment plan
  const [planKind, setPlanKind] = useState<"NONE" | "ONE_TIME" | "INSTALLMENTS">(
    "ONE_TIME",
  );
  const [planAmount, setPlanAmount] = useState<string>("");
  const [planFirstDueAt, setPlanFirstDueAt] = useState<string>(todayISO());
  const [planInstallments, setPlanInstallments] = useState<string>("4");
  const [planTitle, setPlanTitle] = useState<string>("");
  const [planNote, setPlanNote] = useState<string>("");

  // ODK tags
  const [selectedOdkTagIds, setSelectedOdkTagIds] = useState<Set<string>>(new Set());

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === packageId) ?? null,
    [packages, packageId],
  );

  // Auto-fill plan amount when a package with a price is selected and amount is empty.
  const seedPlanAmount = (pkgPrice: number) => {
    if (!planAmount && pkgPrice > 0) {
      setPlanAmount((pkgPrice / 100).toFixed(2).replace(".", ","));
    }
  };

  const previewItems = useMemo(() => {
    if (!selectedPackage) return [];
    const amountKurus = (() => {
      const cleaned = planAmount.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
      const n = Number.parseFloat(cleaned);
      return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
    })();
    const dueDate = planFirstDueAt ? new Date(planFirstDueAt) : null;
    if (!dueDate || Number.isNaN(dueDate.getTime())) return [];
    if (amountKurus === 0) return [];
    let plan: PaymentPlanInput;
    if (planKind === "NONE") plan = { kind: "NONE" };
    else if (planKind === "ONE_TIME")
      plan = {
        kind: "ONE_TIME",
        totalKurus: amountKurus,
        firstDueAt: dueDate,
        title: planTitle || undefined,
      };
    else
      plan = {
        kind: "INSTALLMENTS",
        totalKurus: amountKurus,
        installments: Math.max(2, Math.min(36, Number.parseInt(planInstallments, 10) || 2)),
        firstDueAt: dueDate,
        intervalMonths: 1,
        titlePrefix: planTitle || undefined,
      };
    return calculatePaymentPlanPreview(plan, selectedPackage.name);
  }, [planKind, planAmount, planFirstDueAt, planInstallments, planTitle, selectedPackage]);

  const previewTotal = previewItems.reduce((s, i) => s + i.amountKurus, 0);

  // ── warnings ────────────────────────────────────────────────────────────
  const warnings: string[] = [];
  if (studentId && initialSnapshot) {
    if (initialSnapshot.parentCount === 0)
      warnings.push("Öğrenciye bağlı bir veli yok. Önce veli bağlamak önerilir.");
    if (!initialSnapshot.hasUserAccount && selectedOdkTagIds.size > 0)
      warnings.push("Öğrencinin kullanıcı hesabı yok; ODK erişim etiketleri atanamayacak.");
    if (initialSnapshot.classroomCount === 0 && !classroomId)
      warnings.push("Öğrencinin atanmış sınıfı yok; bu kayıtla atayabilirsiniz.");
    if (packageId && initialAlreadyActivePackageIds.includes(packageId))
      warnings.push("Bu paket için aktif/açık başka bir kayıt zaten var (mükerrer kayıt).");
  }
  if (planKind !== "NONE" && !payerParentId)
    warnings.push("Ödeme planı oluşturuluyor ama ödeyici veli seçilmedi.");

  // ── submit state ────────────────────────────────────────────────────────
  const [state, formAction, pending] = useActionState<EnrollmentSubmitState, FormData>(
    createEnrollmentAction,
    { status: "idle" },
  );

  if (state.status === "ok") {
    return <ResultPanel state={state} />;
  }

  const canSubmit =
    !!studentId &&
    !!packageId &&
    (planKind === "NONE" || (previewItems.length > 0 && previewTotal > 0));

  return (
    <form action={formAction} style={{ display: "grid", gap: 16 }}>
      <input type="hidden" name="studentId" value={studentId ?? ""} />

      {/* ───── 1. Öğrenci ───── */}
      <Card>
        <CardBody>
          <SectionHeader index={1} title="Öğrenci" />
          {initialStudent ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{initialStudent.fullName}</div>
                <div className="od-muted" style={{ fontSize: 12 }}>
                  {[initialStudent.classLevel, initialStudent.examType].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <Link href={`/panel/admin/ogrenciler/${initialStudent.id}`} className="od-btn ghost sm">
                Öğrenciyi aç →
              </Link>
            </div>
          ) : (
            <Field label="Öğrenci ara" hint="Mevcut bir öğrenci seçin veya öğrenci sayfasından kayıt başlatın.">
              <EntitySearchCombobox
                entity="students"
                placeholder="Öğrenci adı veya telefon…"
                onChange={(id, row) => {
                  setStudentId(id);
                  setStudentLabel(row?.label ?? "");
                }}
                initialValue={studentId ? { id: studentId, label: studentLabel } : null}
              />
            </Field>
          )}
          {studentId && initialSnapshot ? (
            <div style={{ marginTop: 12, display: "grid", gap: 4, fontSize: 12 }} className="od-muted">
              {initialSnapshot.activeEnrollments.length > 0 ? (
                <div>
                  Aktif kayıt: {initialSnapshot.activeEnrollments.map((e) => e.packageName).join(", ")}
                </div>
              ) : (
                <div>Bu öğrencinin aktif paket kaydı yok.</div>
              )}
              <div>
                Ödeme: {initialSnapshot.pendingPaymentItemCount} bekleyen ·{" "}
                {initialSnapshot.overdueItemCount} geciken ·{" "}
                {TRY(initialSnapshot.pendingPaymentTotalKurus)} kalan
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* ───── 2. Paket ───── */}
      <Card>
        <CardBody>
          <SectionHeader index={2} title="Paket / Ürün" />
          <div className="od-form-grid">
            <Field label="Paket" hint="Yalnızca aktif paketler listelenir.">
              <Select
                name="packageId"
                value={packageId}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  setPackageId(v);
                  const pkg = packages.find((p) => p.id === v);
                  if (pkg) seedPlanAmount(pkg.priceKurus);
                }}
              >
                <option value="">— seçiniz —</option>
                {packages.map((p) => {
                  const blocked = initialAlreadyActivePackageIds.includes(p.id);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.type === "EXAM" ? "Sınav" : "Kurs"} ·{" "}
                      {p.priceKurus > 0 ? TRY(p.priceKurus) : "ücretsiz"}
                      {blocked ? " · ⚠️ aktif kayıt var" : ""}
                    </option>
                  );
                })}
              </Select>
            </Field>
            {selectedPackage ? (
              <div style={{ fontSize: 12 }} className="od-muted">
                <div>Tip: {selectedPackage.type === "EXAM" ? "Sınav paketi" : "Kurs paketi"}</div>
                <div>Ders sayısı: {selectedPackage.lessonCount}</div>
                <div>Branş: {selectedPackage.subjects || "—"}</div>
              </div>
            ) : null}
            <Field label="Kayıt durumu">
              <Select name="status" value={status} onChange={(e) => setStatus(e.currentTarget.value)}>
                <option value="ACTIVE">{getEnrollmentStatusLabel("ACTIVE")}</option>
                <option value="TRIAL">{getEnrollmentStatusLabel("TRIAL")}</option>
                <option value="LEAD">{getEnrollmentStatusLabel("LEAD")}</option>
                <option value="PAUSED">{getEnrollmentStatusLabel("PAUSED")}</option>
                <option value="COMPLETED">{getEnrollmentStatusLabel("COMPLETED")}</option>
                <option value="CANCELLED">{getEnrollmentStatusLabel("CANCELLED")}</option>
              </Select>
            </Field>
            <Field label="Kaynak">
              <Select name="source" value={source} onChange={(e) => setSource(e.currentTarget.value)}>
                <option value="MANUAL">Manuel</option>
                <option value="PURCHASE">Satın alma</option>
                <option value="TRIAL">Deneme</option>
                <option value="CAMP">Kamp</option>
                <option value="SCHOLARSHIP">Burs</option>
              </Select>
            </Field>
            <Field label="Başlangıç">
              <Input type="date" name="startsAt" value={startsAt} onChange={(e) => setStartsAt(e.currentTarget.value)} />
            </Field>
            <Field label="Bitiş (opsiyonel)">
              <Input type="date" name="endsAt" value={endsAt} onChange={(e) => setEndsAt(e.currentTarget.value)} />
            </Field>
            <Field label="Faturalama dönemi (opsiyonel)" hint="Örn. “Aylık”, “6 ay”, “Tek ödeme”.">
              <Input
                name="billingPeriodLabel"
                value={billingPeriodLabel}
                onChange={(e) => setBillingPeriodLabel(e.currentTarget.value)}
                placeholder="Aylık"
              />
            </Field>
            <div className="full">
              <Field label="Notlar (opsiyonel)">
                <Textarea name="notes" rows={2} value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />
              </Field>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ───── 3. Sınıf / erişim ───── */}
      <Card>
        <CardBody>
          <SectionHeader index={3} title="Sınıf ve erişim" />
          <div className="od-form-grid">
            <Field label="Sınıf (opsiyonel)" hint="Seçilirse öğrenci bu sınıfa eklenir.">
              <Select name="classroomId" value={classroomId} onChange={(e) => setClassroomId(e.currentTarget.value)}>
                <option value="">— atama yapma —</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.branch ? ` / ${c.branch}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {odkAccessTags.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>ODK erişim etiketleri</div>
              <div className="od-muted" style={{ fontSize: 12, marginBottom: 8 }}>
                Sadece öğrencinin kullanıcı hesabı varsa atanır. Geniş erişim vermekten kaçının.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {odkAccessTags.map((t) => {
                  const checked = selectedOdkTagIds.has(t.id);
                  return (
                    <label
                      key={t.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 10px",
                        border: "1px solid var(--pd-line)",
                        borderRadius: 999,
                        background: checked ? "var(--pd-soft-mint)" : "var(--pd-card)",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        name="odkAccessTagIds"
                        value={t.id}
                        checked={checked}
                        onChange={(e) => {
                          setSelectedOdkTagIds((prev) => {
                            const next = new Set(prev);
                            if (e.currentTarget.checked) next.add(t.id);
                            else next.delete(t.id);
                            return next;
                          });
                        }}
                      />
                      {t.title}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* ───── 4. Ödeyici ───── */}
      <Card>
        <CardBody>
          <SectionHeader index={4} title="Ödeyici veli" />
          {initialPayers.length === 0 ? (
            <div className="od-soft-alert is-info">
              Bu öğrenciye bağlı bir veli yok.{" "}
              {studentId ? (
                <Link href={`/panel/admin/ogrenciler/${studentId}/duzenle`} className="od-btn ghost sm" style={{ marginLeft: 8 }}>
                  Veli bağla →
                </Link>
              ) : null}
            </div>
          ) : (
            <Field label="Ödeyici" hint="Ödeme planı bu veliye atanır.">
              <Select
                name="payerParentId"
                value={payerParentId}
                onChange={(e) => setPayerParentId(e.currentTarget.value)}
              >
                <option value="">— seçilmedi —</option>
                {initialPayers.map((p) => (
                  <option key={p.parentId} value={p.parentId}>
                    {p.fullName}
                    {p.relationshipLabel ? ` · ${p.relationshipLabel}` : ""}
                    {p.isPrimary ? " · birincil" : ""}
                    {!p.hasUserAccount ? " · hesap yok" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </CardBody>
      </Card>

      {/* ───── 5. Ödeme planı ───── */}
      <Card>
        <CardBody>
          <SectionHeader index={5} title="Ödeme planı" />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
            <PlanKindRadio current={planKind} value="NONE" label="Plan oluşturma" onChange={setPlanKind} />
            <PlanKindRadio current={planKind} value="ONE_TIME" label="Tek seferlik" onChange={setPlanKind} />
            <PlanKindRadio current={planKind} value="INSTALLMENTS" label="Taksitli" onChange={setPlanKind} />
          </div>
          <input type="hidden" name="planKind" value={planKind} />

          {planKind !== "NONE" ? (
            <>
              <div className="od-form-grid">
                <Field label="Toplam tutar (TRY)" hint="Paket fiyatı varsa otomatik gelir; üstüne yazabilirsiniz.">
                  <Input
                    name="planAmount"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={planAmount}
                    onChange={(e) => setPlanAmount(e.currentTarget.value)}
                  />
                </Field>
                <Field label={planKind === "INSTALLMENTS" ? "İlk vade" : "Vade tarihi"}>
                  <Input
                    type="date"
                    name="planFirstDueAt"
                    value={planFirstDueAt}
                    onChange={(e) => setPlanFirstDueAt(e.currentTarget.value)}
                  />
                </Field>
                {planKind === "INSTALLMENTS" ? (
                  <Field label="Taksit sayısı" hint="2 ile 36 arası, aylık aralık.">
                    <Input
                      type="number"
                      min={2}
                      max={36}
                      name="planInstallments"
                      value={planInstallments}
                      onChange={(e) => setPlanInstallments(e.currentTarget.value)}
                    />
                  </Field>
                ) : null}
                <Field label={planKind === "INSTALLMENTS" ? "Başlık öneki (opsiyonel)" : "Başlık (opsiyonel)"}>
                  <Input
                    name="planTitle"
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.currentTarget.value)}
                    placeholder={planKind === "INSTALLMENTS" ? "ör. Eylül 2026 taksit" : "ör. Yıllık paket ödemesi"}
                  />
                </Field>
                <div className="full">
                  <Field label="Vade notu (opsiyonel)">
                    <Textarea
                      name="planNote"
                      rows={2}
                      value={planNote}
                      onChange={(e) => setPlanNote(e.currentTarget.value)}
                    />
                  </Field>
                </div>
              </div>

              {/* Live preview */}
              {previewItems.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Önizleme · {previewItems.length} satır · toplam {TRY(previewTotal)}
                  </div>
                  <table className="od-table premium-table" style={{ width: "100%", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>#</th>
                        <th style={{ textAlign: "left" }}>Başlık</th>
                        <th style={{ textAlign: "left" }}>Vade</th>
                        <th style={{ textAlign: "right" }}>Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewItems.map((p) => (
                        <tr key={p.index}>
                          <td>{p.index}</td>
                          <td>{p.title}</td>
                          <td>{DATE_TR(p.dueDate)}</td>
                          <td style={{ textAlign: "right" }}>{TRY(p.amountKurus)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="od-muted" style={{ fontSize: 12, marginTop: 8 }}>
                  Tutar ve vade tarihini girin, önizleme burada görünecek.
                </div>
              )}
            </>
          ) : (
            <div className="od-muted" style={{ fontSize: 12 }}>
              Şimdilik ödeme planı oluşturulmayacak. Daha sonra{" "}
              <Link href="/panel/admin/odemeler/vadeler" className="od-link">
                Vadeler
              </Link>{" "}
              sayfasından ekleyebilirsiniz.
            </div>
          )}
        </CardBody>
      </Card>

      {/* ───── 6. Önizleme ───── */}
      <Card>
        <CardBody>
          <SectionHeader index={6} title="Önizleme" />
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, lineHeight: 1.7 }}>
            <li>Öğrenci: <strong>{studentLabel || "—"}</strong></li>
            <li>Paket: <strong>{selectedPackage?.name || "—"}</strong></li>
            <li>Durum: <Badge tone="ok">{getEnrollmentStatusLabel(status as never)}</Badge></li>
            <li>Sınıf: {classroomId ? classrooms.find((c) => c.id === classroomId)?.name ?? "—" : "—"}</li>
            <li>Ödeyici: {payerParentId ? initialPayers.find((p) => p.parentId === payerParentId)?.fullName ?? "—" : "—"}</li>
            <li>
              Ödeme planı:{" "}
              {planKind === "NONE"
                ? "yok"
                : `${previewItems.length} satır · ${TRY(previewTotal)}`}
            </li>
            <li>
              ODK etiketleri: {selectedOdkTagIds.size > 0 ? Array.from(selectedOdkTagIds).length + " adet" : "—"}
            </li>
          </ul>

          {warnings.length > 0 ? (
            <div className="od-soft-alert is-info" style={{ marginTop: 12 }}>
              <strong>Dikkat</strong>
              <ul style={{ margin: "6px 0 0 0", paddingLeft: 16 }}>
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          ) : null}

          {state.status === "error" ? (
            <div className="od-soft-alert is-danger" style={{ marginTop: 12 }}>
              {state.error}
            </div>
          ) : null}

          <div style={{ marginTop: 16 }}>
            <FormActions>
              <button type="submit" className="od-btn dark" disabled={!canSubmit || pending}>
                {pending ? "Oluşturuluyor…" : "Kaydı oluştur"}
              </button>
              <Link href="/panel/admin/kayitlar" className="od-btn ghost">
                Vazgeç
              </Link>
            </FormActions>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function SectionHeader({ index, title }: { index: number; title: string }) {
  return (
    <h3 style={{ margin: "0 0 12px 0", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: 999,
          background: "var(--pd-ink-1)",
          color: "var(--pd-card)",
          fontSize: 11,
        }}
      >
        {index}
      </span>
      {title}
    </h3>
  );
}

function PlanKindRadio({
  current,
  value,
  label,
  onChange,
}: {
  current: "NONE" | "ONE_TIME" | "INSTALLMENTS";
  value: "NONE" | "ONE_TIME" | "INSTALLMENTS";
  label: string;
  onChange: (v: "NONE" | "ONE_TIME" | "INSTALLMENTS") => void;
}) {
  const checked = current === value;
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        border: `1px solid ${checked ? "var(--pd-ink-1)" : "var(--pd-line)"}`,
        borderRadius: 999,
        background: checked ? "var(--pd-soft-mint)" : "var(--pd-card)",
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      <input
        type="radio"
        name="planKindRadio"
        checked={checked}
        onChange={() => onChange(value)}
      />
      {label}
    </label>
  );
}

function ResultPanel({
  state,
}: {
  state: Extract<EnrollmentSubmitState, { status: "ok" }>;
}) {
  return (
    <Card>
      <CardBody>
        <h3 style={{ margin: 0, fontSize: 16 }}>✓ Kayıt oluşturuldu</h3>
        <p className="od-muted" style={{ fontSize: 13, marginTop: 4 }}>
          {state.result.paymentScheduleItemIds.length > 0
            ? `${state.result.paymentScheduleItemIds.length} adet vade satırı eklendi.`
            : "Ödeme planı oluşturulmadı (daha sonra eklenebilir)."}
        </p>
        {state.result.warnings.length > 0 ? (
          <div className="od-soft-alert is-info" style={{ marginTop: 12 }}>
            <strong>Bilgi</strong>
            <ul style={{ margin: "6px 0 0 0", paddingLeft: 16 }}>
              {state.result.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          <Link href={`/panel/admin/ogrenciler/${state.studentId}`} className="od-btn dark sm">
            Öğrenci 360 →
          </Link>
          <Link href={`/panel/admin/ogrenciler/${state.studentId}?tab=finance`} className="od-btn ghost sm">
            Öğrenci finans sekmesi →
          </Link>
          <Link href="/panel/admin/odemeler/vadeler" className="od-btn ghost sm">
            Vadeler →
          </Link>
          <Link href="/panel/admin/kayitlar/yeni" className="od-btn ghost sm">
            Yeni kayıt
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
