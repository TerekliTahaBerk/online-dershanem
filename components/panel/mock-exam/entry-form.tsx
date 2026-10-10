"use client";

import { useRef, useState } from "react";
import type {
  CurriculumExam,
  MockExamErrorCategory,
  UserRole,
} from "@prisma/client";
import { ClipboardPaste, RotateCcw, Save, TimerReset } from "lucide-react";
import {
  buttonClass,
  inputClass,
  LABEL_CLASS,
  Section,
} from "@/components/panel/ui";
import { mockExamErrorLabels, mockExamTemplates } from "@/lib/mock-exams";
import { sendPanelEvent } from "@/lib/panel-event-client";
import { initialSections } from "./helpers";
import type { MockExamView, SectionState } from "./types";

const SECTION_FIELDS = [
  "correctCount",
  "incorrectCount",
  "blankCount",
  "durationMinutes",
] as const;

/**
 * Hızlı dış deneme girişi. Öğrenci seçimi ve durum mesajı üst bileşende
 * tutulur (liste süzme ve onay mesajı da onları kullanır).
 */
export function MockExamEntryForm({
  role,
  students,
  studentId,
  onStudentChange,
  status,
  onStatusChange,
  onCreated,
}: {
  role: UserRole;
  students: { id: string; name: string }[];
  studentId: string;
  onStudentChange: (studentId: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  onCreated: (exam: MockExamView) => void;
}) {
  const [examType, setExamType] = useState<CurriculumExam>("LGS");
  const [sections, setSections] = useState<SectionState[]>(
    initialSections("LGS"),
  );
  const [previous, setPrevious] = useState<SectionState[] | null>(null);
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [takenAt, setTakenAt] = useState(new Date().toISOString().slice(0, 10));
  const [durationMinutes, setDurationMinutes] = useState(
    mockExamTemplates.LGS.defaultDuration,
  );
  const [paste, setPaste] = useState("");
  const [saving, setSaving] = useState(false);
  const [pasteApplied, setPasteApplied] = useState(false);
  const startedAt = useRef<number | null>(null);
  const started = useRef(false);
  const setStatus = onStatusChange;
  // Öğrenci kendi denemesini girer ("sen"); personel ve veli "siz" hitabında kalır.
  const isStudent = role === "STUDENT";

  function markStarted() {
    if (started.current) return;
    started.current = true;
    startedAt.current = Date.now();
    if (role !== "PARENT")
      sendPanelEvent({
        name: "mock_exam_entry_started",
        properties: {
          examType,
          actorRole: role as "ADMIN" | "TEACHER" | "STUDENT",
        },
      });
  }
  function changeExam(next: CurriculumExam) {
    markStarted();
    setExamType(next);
    setSections(initialSections(next));
    setPrevious(null);
    setDurationMinutes(mockExamTemplates[next].defaultDuration);
  }
  function updateSection(index: number, patch: Partial<SectionState>) {
    markStarted();
    setPrevious(sections);
    setSections((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }
  function applyPaste() {
    markStarted();
    const lines = paste.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length !== sections.length) {
      sendPanelEvent({
        name: "mock_exam_import_failed",
        properties: { examType, reason: "ROW_COUNT" },
      });
      return setStatus(`${sections.length} satır bekleniyor.`);
    }
    const parsedLines = lines.map((line) =>
      line
        .trim()
        .split(/[\t;, ]+/)
        .map(Number),
    );
    if (
      parsedLines.some(
        (values) =>
          values.length < 3 ||
          values.length > 4 ||
          values.some((value) => !Number.isInteger(value) || value < 0),
      )
    ) {
      sendPanelEvent({
        name: "mock_exam_import_failed",
        properties: { examType, reason: "FORMAT" },
      });
      return setStatus("Her satırda 3 veya 4 negatif olmayan tam sayı olmalı.");
    }
    if (
      parsedLines.some(
        (values, index) =>
          values[0] + values[1] + values[2] !==
          mockExamTemplates[examType].sections[index].questions,
      )
    ) {
      sendPanelEvent({
        name: "mock_exam_import_failed",
        properties: { examType, reason: "TOTAL_MISMATCH" },
      });
      return setStatus(
        "Yapıştırılan satırlardan birinin soru toplamı şablonla eşleşmiyor.",
      );
    }
    const next = parsedLines.map((values, index) => ({
      ...sections[index],
      correctCount: values[0],
      incorrectCount: values[1],
      blankCount: values[2],
      durationMinutes: values[3] || 0,
    }));
    setPrevious(sections);
    setSections(next);
    setPasteApplied(true);
    setStatus(
      isStudent
        ? "Değerleri yerleştirdik; toplamlara bir göz atar mısın?"
        : "Toplu değerler uygulandı; toplamları kontrol edin.",
    );
  }
  function toggleReason(index: number, category: MockExamErrorCategory) {
    markStarted();
    const selectedCount = sections.reduce(
      (sum, item) => sum + item.errorCategories.length,
      0,
    );
    const has = sections[index].errorCategories.includes(category);
    if (!has && selectedCount >= 3)
      return setStatus(
        isStudent
          ? "Bir deneme için en fazla üç neden seçebilirsin."
          : "Bir deneme için en fazla üç hata nedeni seçebilirsiniz.",
      );
    updateSection(index, {
      errorCategories: has
        ? sections[index].errorCategories.filter((item) => item !== category)
        : [...sections[index].errorCategories, category],
    });
  }
  async function submit() {
    markStarted();
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/panel/mock-exams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentId: role === "STUDENT" ? undefined : studentId,
          exam: examType,
          title,
          publisher,
          takenAt: new Date(`${takenAt}T12:00:00`).toISOString(),
          durationMinutes,
          entryDurationMs: startedAt.current
            ? Date.now() - startedAt.current
            : 0,
          source: pasteApplied ? "PASTE" : "MANUAL",
          sections: sections.map((section) => ({
            ...section,
            durationMinutes: section.durationMinutes || null,
          })),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || (isStudent ? "Denemeni kaydedemedik. Bir daha dener misin?" : "Deneme kaydedilemedi."));
      onCreated(body.exam as MockExamView);
      setStatus(
        isStudent
          ? "Denemeni kaydettik; analizin de güncellendi."
          : "Deneme kaydedildi. Analiz yeni kayıtla güncellendi.",
      );
      setTitle("");
      setPublisher("");
      started.current = false;
      startedAt.current = null;
      setPasteApplied(false);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Deneme kaydedilemedi.",
      );
    } finally {
      setSaving(false);
    }
  }

  const fieldLabel = LABEL_CLASS;
  const fieldInput = inputClass("mt-1");

  return (
    <Section
      title="Hızlı deneme girişi"
      description={
        isStudent
          ? "Doğru, yanlış, boş sayılarını ve süreni gir; gerisini biz hesaplayalım. Soru metni ya da görsel yüklemen gerekmez."
          : "Doğru–yanlış–boş ve süreyi girin. Soru metni veya görseli yüklenmez."
      }
      actions={<TimerReset size={19} aria-hidden className="text-pn-accent" />}
      divider={false}
      className="mt-0"
    >
      <div onFocus={markStarted}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {role !== "STUDENT" ? (
            <label className={fieldLabel}>
              <span>Öğrenci</span>
              <select
                className={fieldInput}
                value={studentId}
                onChange={(event) => onStudentChange(event.target.value)}
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className={fieldLabel}>
            <span>Sınav</span>
            <select
              className={fieldInput}
              value={examType}
              onChange={(event) =>
                changeExam(event.target.value as CurriculumExam)
              }
            >
              {Object.keys(mockExamTemplates).map((exam) => (
                <option key={exam} value={exam}>
                  {exam}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldLabel}>
            <span>Tarih</span>
            <input
              className={fieldInput}
              type="date"
              value={takenAt}
              onChange={(event) => setTakenAt(event.target.value)}
            />
          </label>
          <label className={fieldLabel}>
            <span>Toplam süre (dk)</span>
            <input
              className={fieldInput}
              inputMode="numeric"
              type="number"
              min={1}
              max={600}
              value={durationMinutes}
              onChange={(event) =>
                setDurationMinutes(Number(event.target.value))
              }
            />
          </label>
          <label className={fieldLabel}>
            <span>Deneme adı (isteğe bağlı)</span>
            <input
              className={fieldInput}
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className={fieldLabel}>
            <span>Yayın (isteğe bağlı)</span>
            <input
              className={fieldInput}
              value={publisher}
              maxLength={120}
              onChange={(event) => setPublisher(event.target.value)}
            />
          </label>
        </div>
        <details className="mt-4 rounded-md border border-pn-border p-4">
          <summary className="cursor-pointer text-[13px] font-semibold text-pn-text">
            <ClipboardPaste size={14} aria-hidden className="mr-2 inline" /> CSV
            / tablo değerlerini toplu yapıştır
          </summary>
          <p className="mt-2 text-[12.5px] text-pn-text-muted">
            Her bölüm için ayrı satır: doğru yanlış boş süre. Sekme, boşluk,
            virgül veya noktalı virgül kullanılabilir.
          </p>
          <textarea
            className={inputClass("mt-3 min-h-24 font-mono text-[13px]")}
            value={paste}
            onChange={(event) => setPaste(event.target.value)}
          />
          <button
            type="button"
            onClick={applyPaste}
            className={buttonClass("secondary", "sm", "mt-2")}
          >
            Değerleri uygula
          </button>
        </details>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="text-[12px] font-medium text-pn-text-muted">
                <th className="pb-2 font-medium">Bölüm</th>
                <th className="font-medium">Doğru</th>
                <th className="font-medium">Yanlış</th>
                <th className="font-medium">Boş</th>
                <th className="font-medium">Süre</th>
                <th className="font-medium">Kontrol</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section, index) => {
                const template = mockExamTemplates[examType].sections[index];
                const total =
                  section.correctCount +
                  section.incorrectCount +
                  section.blankCount;
                return (
                  <tr
                    key={section.subjectCode}
                    className="border-t border-pn-border"
                  >
                    <th className="py-3 pr-3 font-medium text-pn-text">
                      {template.name}
                      <span className="ml-2 text-[12px] text-pn-text-muted">
                        /{template.questions}
                      </span>
                    </th>
                    {SECTION_FIELDS.map((field) => (
                      <td key={field} className="pr-2">
                        <input
                          aria-label={`${template.name} ${field}`}
                          className={inputClass("w-20 px-2")}
                          inputMode="numeric"
                          type="number"
                          min={0}
                          value={section[field]}
                          onChange={(event) =>
                            updateSection(index, {
                              [field]: Number(event.target.value),
                            })
                          }
                        />
                      </td>
                    ))}
                    <td
                      className={
                        total === template.questions
                          ? "font-semibold text-(--pn-tone-success)"
                          : "font-semibold text-(--pn-tone-critical)"
                      }
                    >
                      {total}/{template.questions}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-5">
          <h3 className="text-[14px] font-semibold text-pn-text">
            {isStudent ? "Yanlışların nereden geliyor olabilir? (en fazla üç)" : "En fazla üç hata nedeni"}
          </h3>
          <p className="mt-1 text-[12.5px] text-pn-text-muted">
            {isStudent
              ? "Aklına gelen nedenleri seç; öğretmenin sonra düzenleyebilir. Bu bir “başarısızlık etiketi” değil, sadece sana yol gösterir."
              : "Öğrenci seçebilir; öğretmen daha sonra düzeltebilir. Bir “başarısızlık etiketi” değildir."}
          </p>
          <div className="mt-3 space-y-3">
            {sections.map((section, index) => (
              <div
                key={section.subjectCode}
                className="rounded-md bg-pn-surface-subtle p-3"
              >
                <p className="mb-2 text-[12.5px] font-semibold text-pn-text">
                  {mockExamTemplates[examType].sections[index].name}
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(mockExamErrorLabels).map(([value, label]) => (
                    <label
                      key={value}
                      className="inline-flex items-center gap-2 rounded-md border border-pn-border bg-white px-3 py-2 text-[12.5px] font-medium text-pn-text"
                    >
                      <input
                        type="checkbox"
                        checked={section.errorCategories.includes(
                          value as MockExamErrorCategory,
                        )}
                        onChange={() =>
                          toggleReason(index, value as MockExamErrorCategory)
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving || (role !== "STUDENT" && !studentId)}
            onClick={() => void submit()}
            className={buttonClass("primary")}
          >
            <Save size={15} aria-hidden />{" "}
            {saving ? "Kaydediliyor…" : "Denemeyi kaydet"}
          </button>
          {previous ? (
            <button
              type="button"
              onClick={() => {
                setSections(previous);
                setPrevious(null);
              }}
              className={buttonClass("secondary")}
            >
              <RotateCcw size={14} aria-hidden /> Son değişikliği geri al
            </button>
          ) : null}
          {status ? (
            <p role="status" className="text-[13px] font-medium text-pn-text">
              {status}
            </p>
          ) : null}
        </div>
      </div>
    </Section>
  );
}
