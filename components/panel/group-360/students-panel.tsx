"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EmptyState,
  LABEL_CLASS,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  Section,
  buttonClass,
  inputClass,
} from "@/components/panel/ui";
import {
  GROUP_360_MEMBER_RISK_LABELS,
  type TransferPreviewSummary,
} from "@/lib/panel/group-360";
import type { Group360Bundle } from "@/lib/panel/group-360-server";
import { patchGroup, postMembers } from "./api";
import {
  GROUP_360_BOX_CLASS,
  GROUP_360_DAY,
  GROUP_360_MESSAGE_CLASS,
  riskTone,
} from "./shared";

type RemovePreview = {
  canExecute: boolean;
  items: Array<{
    studentId: string;
    studentName: string;
    blockers: string[];
  }>;
};

type NotifyPreview = {
  canExecute: boolean;
  matchedStudents: number;
  recipientCount: number;
  title: string;
  body: string;
};

/** Öğrenciler sekmesi — istemci adası (arama, ekleme, toplu işlem önizleme/uygulama). */
export function StudentsPanel({
  groupId,
  isActive,
  members,
  targetGroups,
}: {
  groupId: string;
  isActive: boolean;
  members: NonNullable<Group360Bundle["students"]>["members"];
  targetGroups: Group360Bundle["targetGroups"];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      activeGroups: Array<{ id: string; name: string }>;
    }>
  >([]);
  const [bulkAction, setBulkAction] = useState<
    "TRANSFER" | "REMOVE" | "NOTIFY"
  >("TRANSFER");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyBody, setNotifyBody] = useState("");
  const [preview, setPreview] = useState<TransferPreviewSummary | null>(null);
  const [removePreview, setRemovePreview] = useState<RemovePreview | null>(
    null,
  );
  const [notifyPreview, setNotifyPreview] = useState<NotifyPreview | null>(
    null,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const allSelected = members.length > 0 && selected.length === members.length;

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

  async function searchStudents() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    const response = await fetch(
      `/api/panel/groups/${groupId}/students?${params.toString()}`,
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Öğrenciler getirilemedi.");
    setCandidates(Array.isArray(body.students) ? body.students : []);
  }

  async function previewBulk() {
    if (!selected.length) {
      setMessage("Önce öğrenci seçin.");
      return;
    }
    setBusy("preview");
    setMessage("");
    setPreview(null);
    setRemovePreview(null);
    setNotifyPreview(null);
    try {
      if (bulkAction === "TRANSFER") {
        if (!targetGroupId) {
          setMessage("Hedef grup seçin.");
          return;
        }
        const result = await postMembers(groupId, {
          action: "TRANSFER",
          mode: "PREVIEW",
          studentIds: selected,
          targetGroupId,
        });
        setPreview(result.preview as TransferPreviewSummary);
      } else if (bulkAction === "REMOVE") {
        const result = await postMembers(groupId, {
          action: "REMOVE",
          mode: "PREVIEW",
          studentIds: selected,
        });
        setRemovePreview(result as RemovePreview);
      } else {
        const result = await postMembers(groupId, {
          action: "NOTIFY",
          mode: "PREVIEW",
          studentIds: selected,
          title: notifyTitle || undefined,
          body: notifyBody || undefined,
        });
        setNotifyPreview(result as NotifyPreview);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Önizleme alınamadı.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function executeBulk() {
    if (!selected.length) return;
    const ok = window.confirm("Önizlenen işlem uygulansın mı?");
    if (!ok) return;
    await run(
      "execute",
      async () => {
        if (bulkAction === "TRANSFER") {
          await postMembers(groupId, {
            action: "TRANSFER",
            mode: "EXECUTE",
            studentIds: selected,
            targetGroupId,
          });
        } else if (bulkAction === "REMOVE") {
          await postMembers(groupId, {
            action: "REMOVE",
            mode: "EXECUTE",
            studentIds: selected,
          });
        } else {
          await postMembers(groupId, {
            action: "NOTIFY",
            mode: "EXECUTE",
            studentIds: selected,
            title: notifyTitle || undefined,
            body: notifyBody || undefined,
          });
        }
        setSelected([]);
        setPreview(null);
        setRemovePreview(null);
        setNotifyPreview(null);
      },
      "Toplu işlem tamamlandı.",
    );
  }

  const canExecute = useMemo(() => {
    if (bulkAction === "TRANSFER") return Boolean(preview?.canExecute);
    if (bulkAction === "REMOVE") return Boolean(removePreview?.canExecute);
    return Boolean(notifyPreview?.canExecute);
  }, [bulkAction, preview, removePreview, notifyPreview]);

  return (
    <>
      {isActive ? (
        <Section title="Öğrenci ekle" divider={false} className="mt-6">
          <div className="flex flex-wrap gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={inputClass("w-auto min-w-[220px] flex-1 sm:flex-none")}
              placeholder="Öğrenci ara"
              aria-label="Öğrenci ara"
            />
            <button
              type="button"
              className={buttonClass("secondary", "md")}
              disabled={busy === "search"}
              onClick={() =>
                void run("search", () => searchStudents(), "Arama güncellendi.")
              }
            >
              {busy === "search" ? "Aranıyor" : "Ara"}
            </button>
          </div>
          {candidates.length ? (
            <div className="mt-3 space-y-2">
              {candidates.map((student) => (
                <div key={student.id} className={GROUP_360_BOX_CLASS}>
                  <p className="text-[13.5px] font-semibold text-pn-text">
                    {student.name}
                  </p>
                  <p className="text-[12.5px] text-pn-text-muted">
                    {student.email}
                  </p>
                  <button
                    type="button"
                    className={buttonClass("secondary", "sm", "mt-2")}
                    disabled={busy === `add-${student.id}`}
                    onClick={() =>
                      void run(
                        `add-${student.id}`,
                        () =>
                          patchGroup(groupId, {
                            action: "ADD_STUDENT",
                            studentId: student.id,
                          }),
                        `${student.name} gruba eklendi.`,
                      )
                    }
                  >
                    Gruba ekle
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </Section>
      ) : null}

      <Section
        title="Öğrenciler"
        divider={isActive}
        className={isActive ? undefined : "mt-6"}
        actions={
          <label className="flex items-center gap-2 text-[12.5px] font-medium text-pn-text-secondary">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(event) =>
                setSelected(
                  event.target.checked
                    ? members.map((item) => item.studentId)
                    : [],
                )
              }
            />
            Tümünü seç
          </label>
        }
      >
        <PanelTable
          columns={[
            "",
            "Öğrenci",
            "Paket",
            "Katılım",
            "Risk",
            "Son aktivite",
            "Eklenme",
          ]}
          caption="Grup öğrencileri"
        >
          {members.map((member) => {
            const checked = selected.includes(member.studentId);
            return (
              <PanelTableRow key={member.studentId}>
                <PanelTableCell>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      setPreview(null);
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, member.studentId]
                          : current.filter((id) => id !== member.studentId),
                      );
                    }}
                    aria-label={`${member.name} seç`}
                  />
                </PanelTableCell>
                <PanelTableCell>
                  <Link
                    href={`/panel/yonetim/ogrenciler/${member.studentId}`}
                    className="font-semibold text-pn-text hover:underline"
                  >
                    {member.name}
                  </Link>
                  <p className="text-[11.5px] text-pn-text-muted">
                    {member.email}
                  </p>
                </PanelTableCell>
                <PanelTableCell>
                  {member.packages.length ? member.packages.join(" · ") : "—"}
                </PanelTableCell>
                <PanelTableCell>
                  {member.attendanceRate != null
                    ? `%${member.attendanceRate}`
                    : "—"}
                </PanelTableCell>
                <PanelTableCell tone={riskTone(member.risk)}>
                  {GROUP_360_MEMBER_RISK_LABELS[member.risk]}
                </PanelTableCell>
                <PanelTableCell>
                  {member.lastActivityAt
                    ? GROUP_360_DAY.format(member.lastActivityAt)
                    : "Kayıt yok"}
                </PanelTableCell>
                <PanelTableCell>
                  {GROUP_360_DAY.format(member.enrolledAt)}
                </PanelTableCell>
              </PanelTableRow>
            );
          })}
        </PanelTable>
        {!members.length ? (
          <EmptyState className="mt-3" title="Aktif öğrenci yok." />
        ) : null}
      </Section>

      <Section
        title="Toplu öğrenci işlemi"
        description="Preview → confirm → execute. Öğretmen ataması bu akışta yok."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className={LABEL_CLASS}>
            Aksiyon
            <select
              value={bulkAction}
              onChange={(event) => {
                setBulkAction(event.target.value as typeof bulkAction);
                setPreview(null);
                setRemovePreview(null);
                setNotifyPreview(null);
              }}
              className={inputClass("mt-1")}
            >
              <option value="TRANSFER">Transfer</option>
              <option value="REMOVE">Gruptan çıkar</option>
              <option value="NOTIFY">Bildirim</option>
            </select>
          </label>
          {bulkAction === "TRANSFER" ? (
            <label className={LABEL_CLASS}>
              Hedef grup
              <select
                value={targetGroupId}
                onChange={(event) => setTargetGroupId(event.target.value)}
                className={inputClass("mt-1")}
              >
                <option value="">Grup seçin</option>
                {targetGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} · {group.filled}/{group.capacity}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {bulkAction === "NOTIFY" ? (
            <>
              <input
                value={notifyTitle}
                onChange={(event) => setNotifyTitle(event.target.value)}
                className={inputClass()}
                placeholder="Bildirim başlığı"
              />
              <input
                value={notifyBody}
                onChange={(event) => setNotifyBody(event.target.value)}
                className={inputClass()}
                placeholder="Bildirim metni"
              />
            </>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass("secondary", "md")}
            disabled={busy === "preview" || !selected.length}
            onClick={() => void previewBulk()}
          >
            {busy === "preview" ? "Önizleniyor" : "1. Önizle"}
          </button>
          <button
            type="button"
            className={buttonClass("primary", "md")}
            disabled={busy === "execute" || !canExecute}
            onClick={() => void executeBulk()}
          >
            {busy === "execute" ? "Uygulanıyor" : "2. Onayla ve uygula"}
          </button>
        </div>

        {preview ? (
          <div className={`mt-4 text-[13px] ${GROUP_360_BOX_CLASS}`}>
            <p className="font-semibold text-pn-text">
              Transfer önizleme · {preview.targetGroupName} · koltuk{" "}
              {preview.capacity.available}/{preview.capacity.capacity}
            </p>
            <p className="mt-1 text-pn-text-muted">
              {preview.canExecute
                ? "Tüm kontroller geçti."
                : "Engeller var; execute kapalı."}
            </p>
            <ul className="mt-2 space-y-2 text-pn-text-secondary">
              {preview.items.map((item) => (
                <li key={item.studentId}>
                  <span className="font-semibold text-pn-text">
                    {item.studentName}
                  </span>
                  {item.blockers.length
                    ? ` — ${item.blockers.map((blocker) => blocker.message).join("; ")}`
                    : " — hazır"}
                  {item.affectedTargetLessons.length ? (
                    <span className="block text-pn-text-muted">
                      Hedef dersler:{" "}
                      {item.affectedTargetLessons
                        .slice(0, 3)
                        .map(
                          (lesson) =>
                            `${lesson.title} (${GROUP_360_DAY.format(new Date(lesson.startsAt))})`,
                        )
                        .join(", ")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {removePreview ? (
          <div className={`mt-4 text-[13px] ${GROUP_360_BOX_CLASS}`}>
            <p className="font-semibold text-pn-text">Çıkarma önizleme</p>
            <ul className="mt-2 space-y-1 text-pn-text-secondary">
              {removePreview.items.map((item) => (
                <li key={item.studentId}>
                  {item.studentName}
                  {item.blockers.length
                    ? ` — ${item.blockers.join("; ")}`
                    : " — hazır"}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {notifyPreview ? (
          <div className={`mt-4 text-[13px] ${GROUP_360_BOX_CLASS}`}>
            <p className="font-semibold text-pn-text">
              Bildirim · {notifyPreview.matchedStudents} öğrenci ·{" "}
              {notifyPreview.recipientCount} alıcı
            </p>
            <p className="mt-1 text-pn-text">{notifyPreview.title}</p>
            <p className="text-pn-text-muted">{notifyPreview.body}</p>
          </div>
        ) : null}
      </Section>

      {message ? (
        <p role="status" className={`mt-6 ${GROUP_360_MESSAGE_CLASS}`}>
          {message}
        </p>
      ) : null}
    </>
  );
}
