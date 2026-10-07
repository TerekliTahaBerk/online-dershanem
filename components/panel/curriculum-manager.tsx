"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus } from "lucide-react";
import { EmptyState, Section, StatusBadge, buttonClass } from "@/components/panel/primitives";

type Version = {
  id: string;
  code: string;
  title: string;
  exam: string;
  academicYear: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  subjectCount: number;
  outcomeCount: number;
};

type CurriculumExam = "LGS" | "TYT" | "AYT" | "YDT";

async function mutate(url: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "İşlem tamamlanamadı.");
}

export function CurriculumManager({
  versions,
  examFamilies,
}: {
  versions: Version[];
  examFamilies: CurriculumExam[];
}) {
  const router = useRouter();
  const [versionId, setVersionId] = useState(
    versions.find((item) => item.status !== "ARCHIVED")?.id || "",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "İşlem tamamlanamadı.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Section
        id="surumler"
        title="Müfredat sürümleri"
        description="Yalnız Aktif sürümlerin kazanımları öğretmen seçiminde görünür. Eski sürümü silmek yerine arşivleyin."
      >
        <div className="border-t border-pn-border">
          {versions.map((version) => (
            <article
              key={version.id}
              className="flex flex-col gap-2 border-b border-pn-border py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-[14px] font-semibold text-pn-text">{version.code}</strong>
                  <StatusBadge label={VERSION_STATUS[version.status].label} tone={VERSION_STATUS[version.status].tone} />
                </div>
                <p className="mt-0.5 text-[13px] text-pn-text-secondary">
                  {version.title} · {version.exam} · {version.academicYear}
                </p>
                <p className="text-[12px] text-pn-text-muted">
                  {version.subjectCount} ders · {version.outcomeCount} kazanım
                </p>
              </div>
              <select
                aria-label={`${version.code} durumu`}
                value={version.status}
                disabled={busy}
                onChange={(event) =>
                  void run(
                    () =>
                      mutate(
                        `/api/panel/curriculum/versions/${version.id}`,
                        "PATCH",
                        { status: event.target.value },
                      ),
                    "Sürüm durumu güncellendi.",
                  )
                }
                className="panel-input w-auto text-[13px]"
              >
                <option value="DRAFT">Taslak</option>
                <option value="ACTIVE">Aktif</option>
                <option value="ARCHIVED">Arşiv</option>
              </select>
            </article>
          ))}
          {!versions.length ? (
            <EmptyState className="mt-3" title="İlk müfredat sürümünü oluşturun." />
          ) : null}
        </div>
      </Section>

      <Section
        id="yeni-surum"
        title="Yeni sürüm"
        description="Resmî kaynağı ve yılı ayrı sürümleyin."
      >
        <form
          className="grid max-w-[760px] gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void run(
              () =>
                mutate("/api/panel/curriculum/versions", "POST", {
                  code: data.get("code"),
                  title: data.get("title"),
                  exam: data.get("exam"),
                  academicYear: Number(data.get("academicYear")),
                  sourceUrl: data.get("sourceUrl"),
                }),
              "Müfredat sürümü oluşturuldu.",
            );
          }}
        >
          <Field label="Sürüm kodu">
            <input name="code" required maxLength={40} className="panel-input" placeholder="Örn. LGS-2026-V1" />
          </Field>
          <Field label="Sürüm adı">
            <input name="title" required maxLength={120} className="panel-input" />
          </Field>
          <Field label="Sınav">
            <select name="exam" className="panel-input">
              {examFamilies.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Akademik yıl">
            <input
              name="academicYear"
              type="number"
              min="2024"
              max="2100"
              defaultValue={new Date().getFullYear()}
              className="panel-input"
            />
          </Field>
          <Field label="Resmî kaynak URL'si" className="sm:col-span-2">
            <input name="sourceUrl" type="url" maxLength={500} className="panel-input" />
          </Field>
          <div className="sm:col-span-2">
            <button disabled={busy} className={buttonClass("secondary", "md")}>
              <Plus size={14} aria-hidden="true" /> Sürümü oluştur
            </button>
          </div>
        </form>
      </Section>

      <Section
        id="kazanim-ekle"
        title="Kazanım ekle"
        description="Ders → ünite → kazanım → beceri yapısı korunur."
      >
        <form
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void run(
              () =>
                mutate("/api/panel/curriculum/outcomes", "POST", {
                  versionId: data.get("versionId"),
                  subjectCode: data.get("subjectCode"),
                  subjectName: data.get("subjectName"),
                  unitCode: data.get("unitCode"),
                  unitName: data.get("unitName"),
                  outcomeCode: data.get("outcomeCode"),
                  title: data.get("title"),
                  description: data.get("description"),
                  skills: String(data.get("skills") || "")
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                }),
              "Kazanım kataloğa eklendi.",
            );
          }}
        >
          <Field label="Müfredat sürümü">
            <select
              name="versionId"
              required
              value={versionId}
              onChange={(event) => setVersionId(event.target.value)}
              className="panel-input"
            >
              <option value="">Sürüm seçin</option>
              {versions
                .filter((item) => item.status !== "ARCHIVED")
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Ders kodu">
            <input name="subjectCode" required className="panel-input" placeholder="MAT" />
          </Field>
          <Field label="Ders adı">
            <input name="subjectName" required className="panel-input" placeholder="Matematik" />
          </Field>
          <Field label="Ünite kodu">
            <input name="unitCode" required className="panel-input" />
          </Field>
          <Field label="Ünite adı">
            <input name="unitName" required className="panel-input" />
          </Field>
          <Field label="Kazanım kodu">
            <input name="outcomeCode" required className="panel-input" />
          </Field>
          <Field label="Kazanım ifadesi" className="md:col-span-2">
            <textarea
              name="title"
              required
              maxLength={300}
              className="panel-input min-h-24"
              placeholder="Öğretmenin ve öğrencinin anlayacağı kazanım ifadesi"
            />
          </Field>
          <Field label="Açıklama (isteğe bağlı)">
            <textarea name="description" maxLength={1000} className="panel-input min-h-24" />
          </Field>
          <Field label="Beceriler (virgülle)" className="md:col-span-2 xl:col-span-3">
            <input name="skills" maxLength={300} className="panel-input" placeholder="problem çözme, analiz" />
          </Field>
          <div className="md:col-span-2 xl:col-span-3">
            <button disabled={busy || !versionId} className={buttonClass("primary", "md")}>
              <CheckCircle2 size={15} aria-hidden="true" /> Kazanımı ekle
            </button>
          </div>
        </form>
      </Section>

      <p aria-live="polite" className="mt-4 min-h-5 text-[13px] font-medium text-pn-text-secondary">
        {message}
      </p>
    </div>
  );
}

const VERSION_STATUS: Record<Version["status"], { label: string; tone: "success" | "neutral" | "warning" }> = {
  ACTIVE: { label: "Aktif", tone: "success" },
  DRAFT: { label: "Taslak", tone: "warning" },
  ARCHIVED: { label: "Arşiv", tone: "neutral" },
};

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`grid gap-1 text-[12.5px] font-medium text-pn-text-secondary ${className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}
