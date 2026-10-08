"use client";

import { useState } from "react";
import type { MockExamErrorCategory } from "@prisma/client";
import { buttonClass } from "@/components/panel/ui";
import { mockExamErrorLabels } from "@/lib/mock-exams";
import type { MockExamView } from "./types";

export function ReasonEditor({
  exam,
  onSaved,
}: {
  exam: MockExamView;
  onSaved: (sections: MockExamView["sections"]) => void;
}) {
  const [values, setValues] = useState(
    () =>
      Object.fromEntries(
        exam.sections.map((section) => [section.id, section.errors]),
      ) as Record<string, MockExamErrorCategory[]>,
  );
  const [message, setMessage] = useState("");
  function toggle(sectionId: string, category: MockExamErrorCategory) {
    const has = values[sectionId].includes(category);
    const count = Object.values(values).reduce(
      (sum, categories) => sum + categories.length,
      0,
    );
    if (!has && count >= 3) return setMessage("En fazla üç neden seçilebilir.");
    setValues((current) => ({
      ...current,
      [sectionId]: has
        ? current[sectionId].filter((item) => item !== category)
        : [...current[sectionId], category],
    }));
    setMessage("");
  }
  async function save() {
    const response = await fetch(`/api/panel/mock-exams/${exam.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reasons: exam.sections.map((section) => ({
          sectionId: section.id,
          categories: values[section.id],
        })),
      }),
    });
    if (!response.ok)
      return setMessage(
        (await response.json().catch(() => ({}))).error ||
          "Nedenler kaydedilemedi.",
      );
    onSaved(
      exam.sections.map((section) => ({
        ...section,
        errors: values[section.id],
      })),
    );
    setMessage("Hata nedenleri kaydedildi; değişiklik audit izine alındı.");
  }
  return (
    <details className="mt-3 border-t border-pn-border pt-3">
      <summary className="cursor-pointer text-[12.5px] font-semibold text-pn-text">
        Hata nedenlerini gözden geçir
      </summary>
      <div className="mt-3 space-y-3">
        {exam.sections.map((section) => (
          <div key={section.id}>
            <p className="text-[12px] font-medium text-pn-text-muted">
              {section.subjectName}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {Object.entries(mockExamErrorLabels).map(([category, label]) => {
                const selected = values[section.id].includes(
                  category as MockExamErrorCategory,
                );
                return (
                  <button
                    type="button"
                    key={category}
                    onClick={() =>
                      toggle(section.id, category as MockExamErrorCategory)
                    }
                    className={`rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${selected ? "border-pn-accent bg-pn-accent-soft text-pn-accent" : "border-pn-border bg-white text-pn-text-secondary hover:bg-pn-hover"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => void save()}
        className={buttonClass("secondary", "sm", "mt-3")}
      >
        Nedenleri kaydet
      </button>
      {message ? (
        <p
          role="status"
          className="mt-2 text-[12.5px] font-medium text-pn-text"
        >
          {message}
        </p>
      ) : null}
    </details>
  );
}
