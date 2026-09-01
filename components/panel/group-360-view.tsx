"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PanelAttentionCard,
  PanelCard,
  PanelCardTitle,
  PanelFilterLink,
  PanelHeading,
  PanelStatusBadge,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  PanelTaskRow,
} from "@/components/panel/ui";
import {
  GROUP_360_MEMBER_RISK_LABELS,
  GROUP_360_OPS_STATUS_LABELS,
  GROUP_360_TAB_LABELS,
  SCHEDULE_CONFLICT_KIND_LABELS,
  group360TabHref,
  type Group360MemberRisk,
  type Group360OpsStatus,
  type TransferPreviewSummary,
} from "@/lib/panel/group-360";
import type { Group360Bundle } from "@/lib/panel/group-360-server";

const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

const DAY = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Istanbul",
});

function opsTone(status: Group360OpsStatus): "neutral" | "success" | "warning" | "critical" {
  if (status === "critical") return "critical";
  if (status === "attention") return "warning";
  if (status === "archived") return "neutral";
  return "success";
}

function riskTone(level: Group360MemberRisk): "default" | "ok" | "warn" {
  if (level === "high" || level === "medium") return "warn";
  if (level === "none") return "ok";
  return "default";
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-dc-ink-faint">{label}</p>
      <p className="mt-1 truncate text-[13.5px] font-semibold text-dc-ink">{value}</p>
    </div>
  );
}

async function patchGroup(groupId: string, body: unknown) {
  const response = await fetch(`/api/panel/groups/${groupId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "İşlem tamamlanamadı.");
  return result;
}

async function postMembers(groupId: string, body: unknown) {
  const response = await fetch(`/api/panel/groups/${groupId}/members`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "İşlem tamamlanamadı.");
  return result;
}

export function Group360View({ bundle }: { bundle: Group360Bundle }) {
  const { summary, tab, tabs, actions, basePath } = bundle;

  return (
    <div className="max-w-[1100px]">
      <p className="text-[13px] text-dc-ink-faint">
        <Link href="/panel/yonetim/egitim" className="hover:text-dc-brand-hover hover:underline">
          Gruplar ve dersler
        </Link>
      </p>

      <div className="mt-2">
        <PanelHeading
          eyebrow="Grup 360"
          title={summary.name}
          description={`${summary.subject}${summary.level ? ` · ${summary.level}` : ""} · ${summary.teacher.name}`}
          actions={
            <PanelStatusBadge
              label={GROUP_360_OPS_STATUS_LABELS[summary.ops.status]}
              tone={opsTone(summary.ops.status)}
              pulse={summary.ops.status === "critical"}
            />
          }
        />
      </div>

      <div className="mt-5 grid gap-4 rounded-[14px] border border-dc-line bg-white p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4 lg:p-[22px]">
        <MetaItem label="Durum" value={summary.isActive ? "Aktif" : "Arşiv"} />
        <MetaItem
          label="Kapasite"
          value={`${summary.activeStudentCount}/${summary.capacity}`}
        />
        <MetaItem label="Ana öğretmen" value={summary.teacher.name} />
        <MetaItem label="Haftalık ders" value={String(summary.weeklyLessonCount)} />
        <MetaItem
          label="Bir sonraki ders"
          value={
            summary.nextLesson
              ? `${summary.nextLesson.title} · ${DATE.format(summary.nextLesson.startsAt)}`
              : "Planlı ders yok"
          }
        />
        <MetaItem label="Operasyon" value={summary.ops.label} />
      </div>

      {summary.ops.whyAttention.length ? (
        <PanelAttentionCard
          className="mt-4"
          tone={summary.ops.status === "critical" ? "critical" : "warning"}
          title="Bu grupla ilgili şu an çözülmesi gereken bir sorun var mı?"
          body={summary.ops.whyAttention.join(" ")}
        />
      ) : (
        <PanelAttentionCard
          className="mt-4"
          tone="info"
          title="Bu grupla ilgili şu an çözülmesi gereken bir sorun var mı?"
          body="Hayır — açık operasyon sorunu görünmüyor."
        />
      )}

      {actions.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="rounded-[10px] border border-[#DDE4E0] bg-white px-3.5 py-2 text-[12.5px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Grup 360 sekmeleri">
        {tabs.map((item) => (
          <PanelFilterLink key={item} href={group360TabHref(basePath, item)} active={tab === item}>
            {GROUP_360_TAB_LABELS[item]}
          </PanelFilterLink>
        ))}
      </nav>

      <div className="mt-5 space-y-5">
        {tab === "genel" && bundle.overview ? <OverviewPanel data={bundle.overview} /> : null}
        {tab === "ogrenciler" && bundle.students ? (
          <StudentsPanel
            groupId={summary.id}
            isActive={summary.isActive}
            members={bundle.students.members}
            targetGroups={bundle.targetGroups}
          />
        ) : null}
        {tab === "program" && bundle.program ? <ProgramPanel data={bundle.program} /> : null}
        {tab === "gecmis" && bundle.history ? <HistoryPanel data={bundle.history} /> : null}
        {tab === "operasyon" && bundle.opsTab ? (
          <OpsPanel groupId={summary.id} data={bundle.opsTab} />
        ) : null}
      </div>
    </div>
  );
}

function OverviewPanel({ data }: { data: NonNullable<Group360Bundle["overview"]> }) {
  return (
    <>
      <PanelCard>
        <PanelCardTitle>Hızlı özet</PanelCardTitle>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <MetaItem label="Boş koltuk" value={String(data.capacity.available)} />
          <MetaItem label="Aktif ders serisi" value={String(data.seriesCount)} />
          <MetaItem label="Ödev sayısı" value={String(data.assignmentCount)} />
        </div>
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Yaklaşan dersler</PanelCardTitle>
        <div className="mt-3">
          {data.upcomingLessons.map((lesson, index) => (
            <PanelTaskRow
              key={lesson.id}
              title={lesson.title}
              meta={`${DATE.format(lesson.startsAt)} · ${lesson.teacherName}`}
              right={lesson.status}
              last={index === data.upcomingLessons.length - 1}
            />
          ))}
          {!data.upcomingLessons.length ? (
            <p className="text-[13.5px] text-dc-ink-muted">Yaklaşan planlı ders yok.</p>
          ) : null}
        </div>
      </PanelCard>

      {data.issues.length ? (
        <PanelCard>
          <PanelCardTitle>Operasyon sorunları</PanelCardTitle>
          <div className="mt-3 space-y-2">
            {data.issues.map((issue) => (
              <div key={issue.code} className="rounded-[10px] border border-dc-line-soft p-3">
                <p className="text-[13px] font-bold text-dc-ink">{issue.title}</p>
                <p className="mt-1 text-[12.5px] text-dc-ink-muted">{issue.description}</p>
              </div>
            ))}
          </div>
        </PanelCard>
      ) : null}
    </>
  );
}

function StudentsPanel({
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
    Array<{ id: string; name: string; email: string; activeGroups: Array<{ id: string; name: string }> }>
  >([]);
  const [bulkAction, setBulkAction] = useState<"TRANSFER" | "REMOVE" | "NOTIFY">("TRANSFER");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyBody, setNotifyBody] = useState("");
  const [preview, setPreview] = useState<TransferPreviewSummary | null>(null);
  const [removePreview, setRemovePreview] = useState<{
    canExecute: boolean;
    items: Array<{ studentId: string; studentName: string; blockers: string[] }>;
  } | null>(null);
  const [notifyPreview, setNotifyPreview] = useState<{
    canExecute: boolean;
    matchedStudents: number;
    recipientCount: number;
    title: string;
    body: string;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const allSelected = members.length > 0 && selected.length === members.length;

  async function run(key: string, action: () => Promise<void>, success: string) {
    setBusy(key);
    setMessage("");
    try {
      await action();
      setMessage(success);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(null);
    }
  }

  async function searchStudents() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    const response = await fetch(`/api/panel/groups/${groupId}/students?${params.toString()}`);
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
        setRemovePreview(result as typeof removePreview extends infer T ? NonNullable<T> : never);
      } else {
        const result = await postMembers(groupId, {
          action: "NOTIFY",
          mode: "PREVIEW",
          studentIds: selected,
          title: notifyTitle || undefined,
          body: notifyBody || undefined,
        });
        setNotifyPreview(result as typeof notifyPreview extends infer T ? NonNullable<T> : never);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Önizleme alınamadı.");
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
        <PanelCard>
          <PanelCardTitle>Öğrenci ekle</PanelCardTitle>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="panel-input"
              placeholder="Öğrenci ara"
              aria-label="Öğrenci ara"
            />
            <button
              type="button"
              className="panel-quick-action"
              disabled={busy === "search"}
              onClick={() => void run("search", () => searchStudents(), "Arama güncellendi.")}
            >
              {busy === "search" ? "Aranıyor" : "Ara"}
            </button>
          </div>
          {candidates.length ? (
            <div className="mt-3 space-y-2">
              {candidates.map((student) => (
                <div key={student.id} className="rounded-[10px] border border-dc-line-soft p-3">
                  <p className="text-[13px] font-bold text-dc-ink">{student.name}</p>
                  <p className="text-[12px] text-dc-ink-muted">{student.email}</p>
                  <button
                    type="button"
                    className="panel-quick-action mt-2"
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
        </PanelCard>
      ) : null}

      <PanelCard>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PanelCardTitle>Öğrenciler</PanelCardTitle>
          <label className="flex items-center gap-2 text-[12.5px] font-semibold text-dc-ink-muted">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(event) =>
                setSelected(event.target.checked ? members.map((item) => item.studentId) : [])
              }
            />
            Tümünü seç
          </label>
        </div>

        <PanelTable
          columns={["", "Öğrenci", "Paket", "Katılım", "Risk", "Son aktivite", "Eklenme"]}
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
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, member.studentId]
                          : current.filter((id) => id !== member.studentId),
                      )
                    }
                    aria-label={`${member.name} seç`}
                  />
                </PanelTableCell>
                <PanelTableCell>
                  <Link
                    href={`/panel/yonetim/ogrenciler/${member.studentId}`}
                    className="font-bold text-dc-ink hover:underline"
                  >
                    {member.name}
                  </Link>
                  <p className="text-[11px] text-dc-ink-muted">{member.email}</p>
                </PanelTableCell>
                <PanelTableCell>
                  {member.packages.length ? member.packages.join(" · ") : "—"}
                </PanelTableCell>
                <PanelTableCell>
                  {member.attendanceRate != null ? `%${member.attendanceRate}` : "—"}
                </PanelTableCell>
                <PanelTableCell tone={riskTone(member.risk)}>
                  {GROUP_360_MEMBER_RISK_LABELS[member.risk]}
                </PanelTableCell>
                <PanelTableCell>
                  {member.lastActivityAt ? DAY.format(member.lastActivityAt) : "Kayıt yok"}
                </PanelTableCell>
                <PanelTableCell>{DAY.format(member.enrolledAt)}</PanelTableCell>
              </PanelTableRow>
            );
          })}
        </PanelTable>
        {!members.length ? (
          <p className="mt-3 text-[13.5px] text-dc-ink-muted">Aktif öğrenci yok.</p>
        ) : null}
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Toplu öğrenci işlemi</PanelCardTitle>
        <p className="mt-1 text-[12.5px] text-dc-ink-muted">
          Preview → confirm → execute. Öğretmen ataması bu akışta yok.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-[12px] font-semibold text-dc-ink-faint">
            Aksiyon
            <select
              value={bulkAction}
              onChange={(event) => {
                setBulkAction(event.target.value as typeof bulkAction);
                setPreview(null);
                setRemovePreview(null);
                setNotifyPreview(null);
              }}
              className="panel-input mt-1 py-2 text-xs"
            >
              <option value="TRANSFER">Transfer</option>
              <option value="REMOVE">Gruptan çıkar</option>
              <option value="NOTIFY">Bildirim</option>
            </select>
          </label>
          {bulkAction === "TRANSFER" ? (
            <label className="text-[12px] font-semibold text-dc-ink-faint">
              Hedef grup
              <select
                value={targetGroupId}
                onChange={(event) => setTargetGroupId(event.target.value)}
                className="panel-input mt-1 py-2 text-xs"
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
                className="panel-input"
                placeholder="Bildirim başlığı"
              />
              <input
                value={notifyBody}
                onChange={(event) => setNotifyBody(event.target.value)}
                className="panel-input"
                placeholder="Bildirim metni"
              />
            </>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="panel-quick-action"
            disabled={busy === "preview" || !selected.length}
            onClick={() => void previewBulk()}
          >
            {busy === "preview" ? "Önizleniyor" : "1. Önizle"}
          </button>
          <button
            type="button"
            className="panel-quick-action panel-quick-action-primary"
            disabled={busy === "execute" || !canExecute}
            onClick={() => void executeBulk()}
          >
            {busy === "execute" ? "Uygulanıyor" : "2. Onayla ve uygula"}
          </button>
        </div>

        {preview ? (
          <div className="mt-4 rounded-[10px] border border-dc-line-soft p-3 text-[12.5px]">
            <p className="font-bold text-dc-ink">
              Transfer önizleme · {preview.targetGroupName} · koltuk{" "}
              {preview.capacity.available}/{preview.capacity.capacity}
            </p>
            <p className="mt-1 text-dc-ink-muted">
              {preview.canExecute
                ? "Tüm kontroller geçti."
                : "Engeller var; execute kapalı."}
            </p>
            <ul className="mt-2 space-y-2">
              {preview.items.map((item) => (
                <li key={item.studentId}>
                  <span className="font-semibold">{item.studentName}</span>
                  {item.blockers.length
                    ? ` — ${item.blockers.map((blocker) => blocker.message).join("; ")}`
                    : " — hazır"}
                  {item.affectedTargetLessons.length ? (
                    <span className="block text-dc-ink-muted">
                      Hedef dersler:{" "}
                      {item.affectedTargetLessons
                        .slice(0, 3)
                        .map((lesson) => `${lesson.title} (${DAY.format(new Date(lesson.startsAt))})`)
                        .join(", ")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {removePreview ? (
          <div className="mt-4 rounded-[10px] border border-dc-line-soft p-3 text-[12.5px]">
            <p className="font-bold text-dc-ink">Çıkarma önizleme</p>
            <ul className="mt-2 space-y-1">
              {removePreview.items.map((item) => (
                <li key={item.studentId}>
                  {item.studentName}
                  {item.blockers.length ? ` — ${item.blockers.join("; ")}` : " — hazır"}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {notifyPreview ? (
          <div className="mt-4 rounded-[10px] border border-dc-line-soft p-3 text-[12.5px]">
            <p className="font-bold text-dc-ink">
              Bildirim · {notifyPreview.matchedStudents} öğrenci · {notifyPreview.recipientCount}{" "}
              alıcı
            </p>
            <p className="mt-1">{notifyPreview.title}</p>
            <p className="text-dc-ink-muted">{notifyPreview.body}</p>
          </div>
        ) : null}
      </PanelCard>

      {message ? (
        <p className="rounded-xl bg-[var(--brand-olive-soft)] px-3 py-2 text-xs font-bold text-[var(--brand-olive)]">
          {message}
        </p>
      ) : null}
    </>
  );
}

function ProgramPanel({ data }: { data: NonNullable<Group360Bundle["program"]> }) {
  return (
    <>
      <PanelCard>
        <PanelCardTitle>Haftalık / yaklaşan program</PanelCardTitle>
        <div className="mt-3">
          {data.weekly.map((lesson, index) => (
            <PanelTaskRow
              key={lesson.id}
              title={lesson.title}
              meta={`${DATE.format(lesson.startsAt)} · ${lesson.teacherName} · ${lesson.durationMinutes} dk${
                lesson.seriesId ? " · seri" : ""
              }`}
              last={index === data.weekly.length - 1}
            />
          ))}
          {!data.weekly.length ? (
            <p className="text-[13.5px] text-dc-ink-muted">Planlı ders yok.</p>
          ) : null}
        </div>
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Ders serileri</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.series.map((item) => (
            <div key={item.id} className="rounded-[10px] border border-dc-line-soft p-3">
              <p className="text-[13px] font-bold text-dc-ink">{item.title}</p>
              <p className="mt-1 text-[12px] text-dc-ink-muted">
                {item.teacherName} · {item.isActive ? "Aktif" : "Pasif"} · {item.upcomingCount}{" "}
                yaklaşan
              </p>
            </div>
          ))}
          {!data.series.length ? (
            <p className="text-[13.5px] text-dc-ink-muted">Ders serisi yok.</p>
          ) : null}
        </div>
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Çakışmalar</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.conflicts.map((conflict, index) => (
            <div
              key={`${conflict.lessonId}-${conflict.otherLessonId}-${conflict.kind}-${index}`}
              className="rounded-[10px] border border-dc-line-soft p-3"
            >
              <p className="text-[13px] font-bold text-dc-ink">
                {SCHEDULE_CONFLICT_KIND_LABELS[conflict.kind]}
              </p>
              <p className="mt-1 text-[12.5px] text-dc-ink-muted">
                {conflict.lessonTitle || "Ders"} ↔ {conflict.otherLessonTitle} ·{" "}
                {DATE.format(conflict.startsAt)}
                {conflict.studentName ? ` · ${conflict.studentName}` : ""}
              </p>
            </div>
          ))}
          {!data.conflicts.length ? (
            <p className="text-[13.5px] text-dc-ink-muted">Açık çakışma yok.</p>
          ) : null}
        </div>
      </PanelCard>
    </>
  );
}

function HistoryPanel({ data }: { data: NonNullable<Group360Bundle["history"]> }) {
  return (
    <>
      <PanelCard>
        <PanelCardTitle>Katılım oranı</PanelCardTitle>
        <p className="mt-2 text-[22px] font-extrabold text-dc-ink">
          {data.attendanceRate != null ? `%${data.attendanceRate}` : "—"}
        </p>
      </PanelCard>
      <PanelCard>
        <PanelCardTitle>Tamamlanan dersler</PanelCardTitle>
        <div className="mt-3">
          {data.completed.map((lesson, index) => (
            <PanelTaskRow
              key={lesson.id}
              title={lesson.title}
              meta={DATE.format(lesson.startsAt)}
              right={
                lesson.attendanceTotal
                  ? `${lesson.attendancePresent}/${lesson.attendanceTotal}`
                  : "yoklama yok"
              }
              done
              last={index === data.completed.length - 1}
            />
          ))}
          {!data.completed.length ? (
            <p className="text-[13.5px] text-dc-ink-muted">Tamamlanan ders yok.</p>
          ) : null}
        </div>
      </PanelCard>
      <PanelCard>
        <PanelCardTitle>İptaller</PanelCardTitle>
        <div className="mt-3">
          {data.cancelled.map((lesson, index) => (
            <PanelTaskRow
              key={lesson.id}
              title={lesson.title}
              meta={DATE.format(lesson.startsAt)}
              right="İptal"
              last={index === data.cancelled.length - 1}
            />
          ))}
          {!data.cancelled.length ? (
            <p className="text-[13.5px] text-dc-ink-muted">İptal kaydı yok.</p>
          ) : null}
        </div>
      </PanelCard>
    </>
  );
}

function OpsPanel({
  groupId,
  data,
}: {
  groupId: string;
  data: NonNullable<Group360Bundle["opsTab"]>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function run(key: string, action: () => Promise<void>, success: string) {
    setBusy(key);
    setMessage("");
    try {
      await action();
      setMessage(success);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PanelCard>
        <PanelCardTitle>Operasyon sorunları</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.issues.map((issue) => (
            <div key={issue.code} className="rounded-[10px] border border-dc-line-soft p-3">
              <p className="text-[13px] font-bold text-dc-ink">{issue.title}</p>
              <p className="mt-1 text-[12.5px] text-dc-ink-muted">{issue.description}</p>
            </div>
          ))}
          {!data.issues.length ? (
            <p className="text-[13.5px] text-dc-ink-muted">Açık sorun yok.</p>
          ) : null}
        </div>
      </PanelCard>

      {data.unresolvedConflicts.length ? (
        <PanelCard>
          <PanelCardTitle>Çözülmemiş çakışmalar</PanelCardTitle>
          <div className="mt-3 space-y-2">
            {data.unresolvedConflicts.map((conflict, index) => (
              <p
                key={`${conflict.otherLessonId}-${index}`}
                className="text-[12.5px] text-dc-ink-muted"
              >
                {SCHEDULE_CONFLICT_KIND_LABELS[conflict.kind]} · {conflict.otherLessonTitle}
              </p>
            ))}
          </div>
        </PanelCard>
      ) : null}

      <PanelCard>
        <PanelCardTitle>Grup ayarları</PanelCardTitle>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-2"
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
            className="panel-input"
            aria-label="Grup adı"
          />
          <input
            name="subject"
            required
            defaultValue={data.meta.subject}
            className="panel-input"
            aria-label="Eğitim / sınav türü"
          />
          <input
            name="level"
            defaultValue={data.meta.level}
            className="panel-input"
            aria-label="Seviye"
            placeholder="Seviye"
          />
          <button
            disabled={busy === "meta"}
            className="panel-quick-action panel-quick-action-primary justify-center"
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
            className="panel-input min-w-[220px]"
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
            className="panel-quick-action panel-quick-action-primary"
          >
            {busy === "teacher" ? "Kaydediliyor" : "Öğretmeni değiştir"}
          </button>
        </form>

        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault();
            const nextState = !data.meta.isActive;
            if (!nextState && !window.confirm("Bu grup arşivlensin mi?")) return;
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
          <button disabled={busy === "active"} className="panel-quick-action">
            {busy === "active"
              ? "İşleniyor"
              : data.meta.isActive
                ? "Grubu arşivle"
                : "Grubu tekrar aç"}
          </button>
        </form>
      </PanelCard>

      {message ? (
        <p className="rounded-xl bg-[var(--brand-olive-soft)] px-3 py-2 text-xs font-bold text-[var(--brand-olive)]">
          {message}
        </p>
      ) : null}
    </>
  );
}
