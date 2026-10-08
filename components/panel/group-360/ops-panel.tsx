"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EmptyState,
  Section,
  buttonClass,
  inputClass,
} from "@/components/panel/ui";
import { SCHEDULE_CONFLICT_KIND_LABELS } from "@/lib/panel/group-360";
import type { Group360Bundle } from "@/lib/panel/group-360-server";
import { patchGroup } from "./api";
import { GROUP_360_BOX_CLASS, GROUP_360_MESSAGE_CLASS } from "./shared";

/** Operasyon sekmesi — istemci adası (grup bilgileri, öğretmen, arşiv). */
export function OpsPanel({
  groupId,
  data,
}: {
  groupId: string;
  data: NonNullable<Group360Bundle["opsTab"]>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function run(
    key: string,
    action: () => Promise<void>,
    success: string,
  ) {
    setBusy(key);
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
      setBusy(null);
    }
  }

  return (
    <>
      <Section title="Operasyon sorunları" divider={false} className="mt-6">
        {data.issues.length ? (
          <div className="space-y-2">
            {data.issues.map((issue) => (
              <div key={issue.code} className={GROUP_360_BOX_CLASS}>
                <p className="text-[13.5px] font-semibold text-pn-text">
                  {issue.title}
                </p>
                <p className="mt-1 text-[13px] text-pn-text-muted">
                  {issue.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Açık sorun yok." />
        )}
      </Section>

      {data.unresolvedConflicts.length ? (
        <Section title="Çözülmemiş çakışmalar">
          <ul className="space-y-2">
            {data.unresolvedConflicts.map((conflict, index) => (
              <li
                key={`${conflict.otherLessonId}-${index}`}
                className="text-[13px] text-pn-text-secondary"
              >
                {SCHEDULE_CONFLICT_KIND_LABELS[conflict.kind]} ·{" "}
                {conflict.otherLessonTitle}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Grup ayarları">
        <form
          className="grid gap-2 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void run(
              "meta",
              () =>
                patchGroup(groupId, {
                  action: "UPDATE_META",
                  name: form.get("name"),
                  subject: form.get("subject"),
                  level: form.get("level"),
                }),
              "Grup bilgileri güncellendi.",
            );
          }}
        >
          <input
            name="name"
            required
            defaultValue={data.meta.name}
            className={inputClass()}
            aria-label="Grup adı"
          />
          <input
            name="subject"
            required
            defaultValue={data.meta.subject}
            className={inputClass()}
            aria-label="Eğitim / sınav türü"
          />
          <input
            name="level"
            defaultValue={data.meta.level}
            className={inputClass()}
            aria-label="Seviye"
            placeholder="Seviye"
          />
          <button
            disabled={busy === "meta"}
            className={buttonClass("primary", "md")}
          >
            {busy === "meta" ? "Kaydediliyor" : "Grubu güncelle"}
          </button>
        </form>

        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void run(
              "teacher",
              () =>
                patchGroup(groupId, {
                  action: "CHANGE_TEACHER",
                  teacherId: form.get("teacherId"),
                }),
              "Öğretmen değiştirildi.",
            );
          }}
        >
          <select
            name="teacherId"
            defaultValue={data.meta.teacherId}
            className={inputClass("w-auto min-w-[220px]")}
            aria-label="Öğretmen"
          >
            {data.teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
          <button
            disabled={busy === "teacher"}
            className={buttonClass("primary", "md")}
          >
            {busy === "teacher" ? "Kaydediliyor" : "Öğretmeni değiştir"}
          </button>
        </form>

        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault();
            const nextState = !data.meta.isActive;
            if (!nextState && !window.confirm("Bu grup arşivlensin mi?"))
              return;
            void run(
              "active",
              () =>
                patchGroup(groupId, {
                  action: "SET_ACTIVE",
                  isActive: nextState,
                }),
              nextState ? "Grup tekrar açıldı." : "Grup arşivlendi.",
            );
          }}
        >
          <button
            disabled={busy === "active"}
            className={buttonClass(
              data.meta.isActive ? "danger" : "secondary",
              "md",
            )}
          >
            {busy === "active"
              ? "İşleniyor"
              : data.meta.isActive
                ? "Grubu arşivle"
                : "Grubu tekrar aç"}
          </button>
        </form>
      </Section>

      {message ? (
        <p role="status" className={`mt-6 ${GROUP_360_MESSAGE_CLASS}`}>
          {message}
        </p>
      ) : null}
    </>
  );
}
