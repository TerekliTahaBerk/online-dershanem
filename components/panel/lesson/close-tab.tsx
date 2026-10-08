"use client";

import { Eye, Save, Trash2 } from "lucide-react";
import { LABEL_CLASS, Section, buttonClass, inputClass } from "@/components/panel/ui";
import { BUILT_IN_TEMPLATES } from "./types";
import type { LessonCloseState } from "./use-lesson-close";

/** KAPANIŞ — ortak not, hedef, çalışma; şablonlar ve ödev önizlemesi. */
export function LessonCloseTab({ state }: { state: LessonCloseState }) {
  const { form, flags } = state;
  return (
    <>
      <Section title="Şablonlar" divider={false} description="Ortak not, hedef ve çalışma alanlarını tek tıkla doldurur.">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Not şablonları">
          {BUILT_IN_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => state.applyTemplate(template)}
              className={buttonClass("secondary", "sm")}
            >
              {template.title}
            </button>
          ))}
          {state.templates.map((template) => (
            <span key={template.id} className="inline-flex overflow-hidden rounded-md border border-pn-border-strong">
              <button
                type="button"
                onClick={() => state.applyTemplate(template)}
                className="min-h-8 bg-white px-2.5 text-[13px] font-semibold text-pn-text hover:bg-pn-hover"
              >
                {template.title}
              </button>
              <button
                type="button"
                onClick={() => void state.deleteTemplate(template.id)}
                aria-label={`${template.title} şablonunu sil`}
                className="border-l border-pn-border-strong bg-white px-2 text-(--pn-tone-critical) hover:bg-(--pn-tone-critical-soft)"
              >
                <Trash2 size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={state.templateTitle}
            onChange={(event) => state.setTemplateTitle(event.target.value)}
            className={inputClass("flex-1")}
            maxLength={60}
            placeholder="Mevcut notları şablon olarak adlandır"
            aria-label="Yeni şablon adı"
          />
          <button type="button" onClick={() => void state.saveTemplate()} className={buttonClass("secondary", "md")}>
            <Save size={14} aria-hidden="true" /> Şablonu kaydet
          </button>
        </div>
      </Section>

      <Section title="Ders özeti">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL_CLASS}>Gruba ortak kısa not</span>
            <textarea
              value={form.note}
              onChange={(event) => state.patchSharedForm({ note: event.target.value })}
              className={inputClass("mt-1.5 min-h-28 resize-y")}
              placeholder="Neyi iyi yaptılar, nerede takıldılar?"
            />
          </label>
          <label className="block">
            <span className={LABEL_CLASS}>Bir sonraki hedef</span>
            <textarea
              value={form.nextGoal}
              onChange={(event) => state.patchSharedForm({ nextGoal: event.target.value })}
              className={inputClass("mt-1.5 min-h-28 resize-y")}
              placeholder="Sonraki öğretmene ve öğrenciye net yön..."
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={LABEL_CLASS}>Çalışma / ödev</span>
            <input
              value={form.homework}
              onChange={(event) => state.patchSharedForm({ homework: event.target.value })}
              className={inputClass("mt-1.5")}
              placeholder="Örn. 36–48. sorular, yanlışları işaretle"
            />
          </label>
        </div>
      </Section>

      {flags.quickLessonCloseEnabled && state.assignmentPreview ? (
        <Section title="Ödev önizlemesi" description={`${form.homework} · 7 gün · yalnız seçilen öğrencilere`}>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Ödev alıcıları">
            {form.students.map((student) => (
              <label
                key={student.id}
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-pn-border px-3 text-[13px] font-medium text-pn-text"
              >
                <input
                  type="checkbox"
                  checked={state.assignmentRecipients.includes(student.id)}
                  onChange={() => state.toggleRecipient(student.id)}
                />
                {student.name}
              </label>
            ))}
          </div>
          {!state.assignmentRecipients.length ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-(--pn-tone-critical)">
              <Eye size={14} aria-hidden="true" /> Göndermek için en az bir öğrenci seçin.
            </p>
          ) : null}
        </Section>
      ) : null}
    </>
  );
}
