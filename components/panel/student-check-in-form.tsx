"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkInLabels } from "@/lib/student-check-in";

type History = {
  id: string;
  groupName: string;
  energy: keyof typeof checkInLabels.energy;
  confidence: keyof typeof checkInLabels.confidence;
  barrier: keyof typeof checkInLabels.barrier;
  shared: boolean;
  createdAt: string;
  request: null | {
    id: string;
    status: "OPEN" | "RESPONDED" | "CLOSED";
    version: number;
    helpful: boolean | null;
    action: keyof typeof checkInLabels.action | null;
  };
};

export function StudentCheckInForm({
  groups,
  history,
  remaining: initialRemaining,
}: {
  groups: { id: string; name: string; subject: string }[];
  history: History[];
  remaining: number;
}) {
  const router = useRouter();
  const [groupId, setGroupId] = useState(groups[0]?.id || "");
  const [energy, setEnergy] =
    useState<keyof typeof checkInLabels.energy>("STEADY");
  const [confidence, setConfidence] =
    useState<keyof typeof checkInLabels.confidence>("BUILDING");
  const [barrier, setBarrier] =
    useState<keyof typeof checkInLabels.barrier>("NONE");
  const [share, setShare] = useState(false);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [items, setItems] = useState(history);
  const [remaining, setRemaining] = useState(initialRemaining);
  async function submit() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/panel/student-check-ins", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...(groupId.startsWith("coach:") ? { coachAssignmentId: groupId.slice(6) } : { groupId }),
        energy,
        confidence,
        barrier,
        shareWithTeacher: share || help,
        helpRequested: help,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setBusy(false);
      return setMessage(data.error || "Check-in kaydedilemedi.");
    }
    setItems((current) => [data.checkIn as History, ...current]);
    setRemaining(data.remaining);
    setMessage("Check-in'ini kaydettik, teşekkürler!");
    setBusy(false);
    router.refresh();
  }
  async function feedback(id: string, version: number, helpful: boolean) {
    if (busy) return;
    setBusy(true);
    const response = await fetch(
      `/api/panel/student-help-requests/${id}/feedback`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedVersion: version, helpful }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setBusy(false);
      return setMessage(data.error || "Geri bildirim kaydedilemedi.");
    }
    setItems((current) =>
      current.map((item) =>
        item.request?.id === id
          ? {
              ...item,
              request: {
                ...item.request,
                status: data.status,
                version: version + 1,
                helpful,
              },
            }
          : item,
      ),
    );
    setBusy(false);
    router.refresh();
  }
  const options = <T extends string>(
    values: Record<T, string>,
    selected: T,
    setSelected: (value: T) => void,
  ) => (
    <div className="grid gap-2 sm:grid-cols-3">
      {Object.entries(values).map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={selected === value}
          onClick={() => setSelected(value as T)}
          className={`rounded-2xl border p-3 text-left text-xs font-bold ${selected === value ? "border-(--brand-olive) bg-(--panel-nav-active)" : "border-(--site-line) bg-white"}`}
        >
          {label as string}
        </button>
      ))}
    </div>
  );
  return (
    <div className="space-y-6">
      <section className="rounded-[10px] border border-pn-border bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">60 saniyelik check-in</h2>
          <span className="rounded-full bg-(--panel-nav-active) px-3 py-1 text-xs font-bold">
            Bu hafta {remaining} hak
          </span>
        </div>
        <p className="mt-2 text-sm text-(--site-body)">
          Bu bir sınav değil; doğru ya da yanlış cevap yok. Sadece nasıl
          hissettiğini anlamana yardımcı olur.
        </p>
        <div className="mt-5 space-y-5">
          <label className="block text-xs font-extrabold">
            Hangi ders ya da koçluk için?
            <select
              aria-label="Check-in grubu"
              className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-2"
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} · {group.subject}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="mb-2 text-xs font-extrabold">
              Enerjin nasıl?
            </legend>
            {options(checkInLabels.energy, energy, setEnergy)}
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-xs font-extrabold">
              Çalışmana ne kadar güveniyorsun?
            </legend>
            {options(checkInLabels.confidence, confidence, setConfidence)}
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-xs font-extrabold">
              Seni en çok ne zorluyor?
            </legend>
            {options(checkInLabels.barrier, barrier, setBarrier)}
          </fieldset>
          <label className="flex items-start gap-3 rounded-2xl border border-(--site-line) p-3 text-sm">
            <input
              type="checkbox"
              checked={share || help}
              disabled={help}
              onChange={(event) => setShare(event.target.checked)}
              className="mt-1"
            />
            <span>
              <b>Öğretmenim görsün</b>
              <span className="block text-xs text-(--site-muted)">
                Kapalıysa yalnızca sen görürsün. Ailene hiçbir durumda
                gösterilmez.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm">
            <input
              type="checkbox"
              checked={help}
              onChange={(event) => {
                setHelp(event.target.checked);
                if (event.target.checked) setShare(true);
              }}
              className="mt-1"
            />
            <span>
              <b>Öğretmenimden yardım istiyorum</b>
              <span className="block text-xs text-amber-900">
                Öğretmenine hemen haber veririz; 24 saat içinde sana küçük bir
                destek adımıyla dönmeye çalışır.
              </span>
            </span>
          </label>
          <div className="rounded-2xl bg-rose-50 p-3 text-xs leading-5 text-rose-900">
            <b>Burası acil durumlar için değil.</b> Kendine veya başkasına zarar verme
            riski varsa 112’yi ara ve güvendiğin bir yetişkine hemen söyle.
          </div>
          {message ? (
            <p role="status" className="text-sm font-bold">
              {message}
            </p>
          ) : null}
          <button
            type="button"
            disabled={busy || remaining < 1 || !groupId}
            onClick={submit}
            className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-dc-ink text-white hover:bg-black min-h-10 px-3.5 text-[13.5px] w-full sm:w-auto"
          >
            {busy ? "Kaydediliyor…" : "Check-in'i kaydet"}
          </button>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-extrabold">Geçmişim</h2>
        <div className="mt-3 grid gap-3">
          {items.length ? (
            items.map((item) => (
              <article key={item.id} className="rounded-[10px] border border-pn-border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b>{item.groupName}</b>
                  <span className="text-xs text-(--site-muted)">
                    {new Date(item.createdAt).toLocaleDateString("tr-TR")} ·{" "}
                    {item.shared ? "Öğretmenimle paylaştım" : "Yalnızca bende"}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  {checkInLabels.energy[item.energy]} ·{" "}
                  {checkInLabels.confidence[item.confidence]} ·{" "}
                  {checkInLabels.barrier[item.barrier]}
                </p>
                {item.request ? (
                  <div className="mt-3 rounded-2xl bg-(--panel-nav-active) p-3 text-sm">
                    <b>
                      {item.request.status === "OPEN"
                        ? "Öğretmeninin yanıtı yolda"
                        : item.request.status === "CLOSED"
                          ? "Destek tamamlandı"
                          : "Öğretmeninin önerdiği adım"}
                    </b>
                    {item.request.action ? (
                      <p className="mt-1">
                        {checkInLabels.action[item.request.action]}
                      </p>
                    ) : null}
                    {item.request.status === "RESPONDED" &&
                    item.request.helpful === null ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          disabled={busy}
                          onClick={() =>
                            feedback(
                              item.request!.id,
                              item.request!.version,
                              true,
                            )
                          }
                          className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-dc-ink text-white hover:bg-black min-h-10 px-3.5 text-xs"
                        >
                          İşime yaradı
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            feedback(
                              item.request!.id,
                              item.request!.version,
                              false,
                            )
                          }
                          className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 border border-pn-border-strong bg-white text-pn-text hover:bg-pn-hover min-h-10 px-3.5 text-xs"
                        >
                          Henüz değil
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <p className="text-sm text-(--site-muted)">
              Henüz check-in yapmadın. İlkini yapmaya ne dersin?
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
