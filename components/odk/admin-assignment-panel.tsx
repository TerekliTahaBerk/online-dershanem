"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, Users } from "lucide-react";
import {
  ResponsiveDataTable,
  ResponsiveDataTableBody,
  ResponsiveDataTableCell,
  ResponsiveDataTableHead,
  ResponsiveDataTableRow,
} from "@/components/panel/responsive-data-table";

type Assignment = {
  id: string;
  studentUserId: string;
  studentName: string | null;
  studentEmail: string;
  source: string;
  isActive: boolean;
  assignedAt: string;
};

type Options = {
  groups: Array<{ id: string; label: string; memberCount: number }>;
  classLevels: Array<string | null>;
  packages: Array<{ id: string; title: string }>;
  cohorts: Array<{ id: string; name: string; status: string }>;
};

export function AdminAssignmentPanel({ examId, canEdit }: { examId: string; canEdit: boolean }) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [options, setOptions] = useState<Options | null>(null);
  const [mode, setMode] = useState<"BULK" | "GROUP" | "CLASS" | "COHORT" | "PACKAGE">("GROUP");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [emails, setEmails] = useState("");
  const [groupId, setGroupId] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [packageId, setPackageId] = useState("");

  async function load() {
    const response = await fetch(`/api/odk/admin/exams/${examId}/assignments`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage({ text: result.error || "Atamalar yüklenemedi.", error: true });
      return;
    }
    setAssignments(result.assignments || []);
    setOptions(result.options || null);
  }

  useEffect(() => { void load(); }, [examId]);

  async function assign(body: Record<string, unknown>) {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/odk/admin/exams/${examId}/assignments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ text: result.error || "Atama başarısız.", error: true });
        return;
      }
      setMessage({ text: `${result.total} öğrenci atandı (yeni ${result.created}, güncellenen ${result.updated}).`, error: false });
      setEmails("");
      await load();
      router.refresh();
    } catch {
      setMessage({ text: "Bağlantı kurulamadı.", error: true });
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (mode === "GROUP" && groupId) return assign({ groupId, source: "GROUP" });
    if (mode === "CLASS" && classLevel) return assign({ classLevel, source: "CLASS" });
    if (mode === "COHORT" && cohortId) return assign({ cohortId, source: "COHORT" });
    if (mode === "PACKAGE" && packageId) return assign({ packageId, source: "COHORT" });
    if (mode === "BULK") {
      const tokens = emails.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
      if (!tokens.length) return setMessage({ text: "En az bir e-posta veya kullanıcı ID girin.", error: true });
      const studentEmails = tokens.filter((token) => token.includes("@"));
      const studentUserIds = tokens.filter((token) => !token.includes("@"));
      return assign({ studentEmails, studentUserIds, source: "BULK" });
    }
    setMessage({ text: "Kaynak seçin.", error: true });
  }

  return (
    <section id="adim-7" className="panel-surface scroll-mt-36 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="panel-metric-icon panel-tone-mint"><Users size={17} /></span>
        <div>
          <h2 className="text-sm font-extrabold">7. Öğrenci atama</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">
            Atama anında snapshot alınır; öğrenci sonra grup değiştirse eski deneme kaydı kaybolmaz. Aktif atama: {assignments.filter((item) => item.isActive).length}
          </p>
        </div>
      </div>

      {canEdit ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["GROUP", "CLASS", "COHORT", "PACKAGE", "BULK"] as const).map((item) => (
              <button key={item} type="button" className={`rounded-xl px-3 py-2 text-xs font-extrabold ${mode === item ? "bg-[var(--brand-olive)] text-white" : "bg-[var(--site-bg-warm)]"}`} onClick={() => setMode(item)}>
                {item === "GROUP" ? "Grup" : item === "CLASS" ? "Sınıf" : item === "COHORT" ? "Pilot cohort" : item === "PACKAGE" ? "Ürün paketi" : "Toplu ID"}
              </button>
            ))}
          </div>
          {mode === "GROUP" ? (
            <label className="panel-field">Grup
              <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                <option value="">Seçin</option>
                {(options?.groups || []).map((group) => <option key={group.id} value={group.id}>{group.label} · {group.memberCount} öğrenci</option>)}
              </select>
            </label>
          ) : null}
          {mode === "CLASS" ? (
            <label className="panel-field">Sınıf düzeyi
              <select value={classLevel} onChange={(event) => setClassLevel(event.target.value)}>
                <option value="">Seçin</option>
                {(options?.classLevels || []).filter(Boolean).map((level) => <option key={String(level)} value={String(level)}>{level}</option>)}
              </select>
            </label>
          ) : null}
          {mode === "COHORT" ? (
            <label className="panel-field">ODK pilot koşusu
              <select value={cohortId} onChange={(event) => setCohortId(event.target.value)}>
                <option value="">Seçin</option>
                {(options?.cohorts || []).map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name} · {cohort.status}</option>)}
              </select>
            </label>
          ) : null}
          {mode === "PACKAGE" ? (
            <label className="panel-field">Paket (aktif entitlement)
              <select value={packageId} onChange={(event) => setPackageId(event.target.value)}>
                <option value="">Seçin</option>
                {(options?.packages || []).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
          ) : null}
          {mode === "BULK" ? (
            <label className="panel-field">Öğrenci e-posta veya ID
              <textarea className="panel-input min-h-24" value={emails} onChange={(event) => setEmails(event.target.value)} placeholder="Her satıra bir e-posta veya kullanıcı ID" />
            </label>
          ) : null}
          <button type="button" disabled={busy} className="panel-primary-button" onClick={() => void submit()}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Öğrencileri ata
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--site-muted)]">Deneme arşivlendikten sonra yeni atama yapılamaz; mevcut snapshot’lar korunur.</p>
      )}

      {message ? <p role={message.error ? "alert" : "status"} className={`mt-3 rounded-xl p-3 text-xs font-bold ${message.error ? "bg-[var(--pd-pastel-blush-soft)] text-[var(--pd-pastel-blush-ink)]" : "bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"}`}>{message.text}</p> : null}

      <ResponsiveDataTable className="mt-4" minWidthClassName="lg:min-w-[640px]">
        <ResponsiveDataTableHead>
          <tr>
            <ResponsiveDataTableCell header label="Öğrenci">
              Öğrenci
            </ResponsiveDataTableCell>
            <ResponsiveDataTableCell header label="Kaynak">
              Kaynak
            </ResponsiveDataTableCell>
            <ResponsiveDataTableCell header label="Durum">
              Durum
            </ResponsiveDataTableCell>
            <ResponsiveDataTableCell header label="Atama">
              Atama
            </ResponsiveDataTableCell>
          </tr>
        </ResponsiveDataTableHead>
        <ResponsiveDataTableBody>
          {assignments.slice(0, 50).map((item) => (
            <ResponsiveDataTableRow key={item.id}>
              <ResponsiveDataTableCell label="Öğrenci">
                <strong>{item.studentName || "Öğrenci"}</strong>
                <p className="text-[10px] text-[var(--site-muted)]">{item.studentEmail}</p>
              </ResponsiveDataTableCell>
              <ResponsiveDataTableCell label="Kaynak">{item.source}</ResponsiveDataTableCell>
              <ResponsiveDataTableCell label="Durum">{item.isActive ? "Aktif" : "Pasif"}</ResponsiveDataTableCell>
              <ResponsiveDataTableCell label="Atama">
                {new Date(item.assignedAt).toLocaleString("tr-TR")}
              </ResponsiveDataTableCell>
            </ResponsiveDataTableRow>
          ))}
        </ResponsiveDataTableBody>
      </ResponsiveDataTable>
      {!assignments.length ? <p className="mt-3 text-xs text-[var(--site-muted)]">Henüz atama yok.</p> : null}
      {assignments.length > 50 ? (
        <p className="mt-2 text-[10px] text-[var(--site-muted)]">
          İlk 50 kayıt gösteriliyor · toplam {assignments.length}
        </p>
      ) : null}
    </section>
  );
}
