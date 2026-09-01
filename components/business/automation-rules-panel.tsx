import {
  APPROVED_EMAIL_TEMPLATES,
  APPROVED_EMAIL_TEMPLATE_LABELS,
  AUTOMATION_ACTION_LABELS,
  AUTOMATION_TRIGGER_LABELS,
  AUTOMATION_TRIGGERS,
  LEGACY_ACTIONS,
  PART12_ACTIONS,
  SEVERITY_VALUES,
} from "@/lib/automation/definitions";
import {
  createAutomationRule,
  dryRunAutomationRuleAction,
  toggleAutomationRule,
} from "@/app/panel/yonetim/isletme/actions";

const dt = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  dateStyle: "short",
  timeStyle: "short",
});

type Unit = { id: string; name: string };

type Execution = {
  id: string;
  result: string;
  matched: boolean;
  dryRun: boolean;
  errorCode: string | null;
  durationMs: number;
  createdAt: Date;
  details: unknown;
};

type Rule = {
  id: string;
  name: string;
  triggerType: string;
  isActive: boolean;
  lastRunAt: Date | null;
  runCount: number;
  conditions: unknown;
  actions: unknown;
  executions: Execution[];
};

function UnitField({ units }: { units: Unit[] }) {
  if (units.length === 1) return <input type="hidden" name="businessUnitId" value={units[0].id} />;
  return (
    <label className="text-xs font-bold text-[var(--site-muted)]">
      İş birimi
      <select name="businessUnitId" required defaultValue="" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
        <option value="" disabled>
          Birim seçin
        </option>
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function actionSummary(actions: unknown): string {
  if (!Array.isArray(actions)) return "—";
  return actions
    .map((item) => {
      const type = item && typeof item === "object" && "type" in item ? String((item as { type: string }).type) : "?";
      return AUTOMATION_ACTION_LABELS[type as keyof typeof AUTOMATION_ACTION_LABELS] || type;
    })
    .join(", ");
}

export function AutomationRulesPanel({
  units,
  rules,
  canWrite,
  dryRunNotice,
}: {
  units: Unit[];
  rules: Rule[];
  canWrite: boolean;
  dryRunNotice?: { result: string; matched: boolean; ruleId: string } | null;
}) {
  const errorCount = (rule: Rule) => rule.executions.filter((item) => item.result === "FAILED").length;

  return (
    <div className="space-y-4">
      {dryRunNotice ? (
        <p className="rounded-xl border border-[var(--brand-olive)]/30 bg-[var(--brand-olive)]/5 px-4 py-3 text-sm">
          Dry-run sonucu: <strong>{dryRunNotice.result}</strong>
          {dryRunNotice.matched ? " · koşul eşleşti" : " · koşul eşleşmedi"} · kural {dryRunNotice.ruleId.slice(0, 8)}…
        </p>
      ) : null}

      {canWrite ? (
        <form action={createAutomationRule} className="panel-surface grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          <h2 className="font-extrabold sm:col-span-2 xl:col-span-3">Yeni otomasyon kuralı</h2>
          <UnitField units={units} />
          <label className="text-xs font-bold text-[var(--site-muted)]">
            Kural adı
            <input aria-label="Kural adı" name="name" required minLength={2} maxLength={160} placeholder="Örn. Instagram sıcak aday görevi" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-[var(--site-muted)]">
            Tetikleyici
            <select aria-label="Tetikleyici" name="triggerType" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
              {AUTOMATION_TRIGGERS.map((trigger) => (
                <option key={trigger} value={trigger}>
                  {AUTOMATION_TRIGGER_LABELS[trigger]}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="rounded-xl border p-3 sm:col-span-2 xl:col-span-3">
            <legend className="px-1 text-xs font-bold text-[var(--site-muted)]">Koşullar (AND)</legend>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <label className="text-xs">
                Kaynak
                <input name="source" placeholder="instagram" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
              </label>
              <label className="text-xs">
                Ürün
                <select name="product" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
                  <option value="">Her ürün</option>
                  <option value="OD">OD</option>
                  <option value="ODK">ODK</option>
                </select>
              </label>
              <label className="text-xs">
                Önem
                <select name="severity" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
                  <option value="">Her seviye</option>
                  {SEVERITY_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                Sahip boş
                <select name="ownerEmpty" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
                  <option value="">Fark etmez</option>
                  <option value="true">Evet</option>
                </select>
              </label>
              <label className="text-xs">
                Sıcaklık (eski)
                <select name="temperature" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
                  <option value="">Her sıcaklık</option>
                  <option value="COLD">COLD</option>
                  <option value="WARM">WARM</option>
                  <option value="HOT">HOT</option>
                </select>
              </label>
            </div>
          </fieldset>

          <label className="text-xs font-bold text-[var(--site-muted)]">
            Aksiyon
            <select aria-label="Aksiyon" name="actionType" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
              <optgroup label="Part 12">
                {PART12_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {AUTOMATION_ACTION_LABELS[action]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Instagram (eski)">
                {LEGACY_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {AUTOMATION_ACTION_LABELS[action]}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label className="text-xs font-bold text-[var(--site-muted)]">
            Etiket / görev başlığı
            <input aria-label="Etiket" name="tag" placeholder="add_tag için" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            <input aria-label="Görev başlığı" name="taskTitle" placeholder="create_task için" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-[var(--site-muted)]">
            Onaylı e-posta şablonu
            <select name="templateKey" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
              {APPROVED_EMAIL_TEMPLATES.map((key) => (
                <option key={key} value={key}>
                  {APPROVED_EMAIL_TEMPLATE_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-[var(--site-muted)] sm:col-span-2">
            Bildirim metni
            <input name="notificationTitle" placeholder="Başlık" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            <input name="notificationBody" placeholder="İçerik" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2 xl:col-span-3">
            <input type="checkbox" name="isActive" value="true" defaultChecked />
            Kaydı aktif oluştur
          </label>
          <button className="rounded-xl bg-[var(--brand-olive)] p-2 text-sm font-bold text-white sm:col-span-2 xl:col-span-3">
            Kural ekle
          </button>
        </form>
      ) : null}

      {rules.length ? (
        <div className="space-y-3">
          {rules.map((rule) => (
            <article key={rule.id} className="panel-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong>{rule.name}</strong>
                  <p className="text-xs text-[var(--site-muted)]">
                    {AUTOMATION_TRIGGER_LABELS[rule.triggerType as keyof typeof AUTOMATION_TRIGGER_LABELS] || rule.triggerType}
                    {" · "}
                    {actionSummary(rule.actions)}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--site-muted)]">
                    Son çalıştırma: {rule.lastRunAt ? dt.format(rule.lastRunAt) : "Henüz yok"} · Çalıştırma: {rule.runCount} ·
                    Hata (son 5): {errorCount(rule)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${rule.isActive ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
                    {rule.isActive ? "Aktif" : "Pasif"}
                  </span>
                  {canWrite ? (
                    <>
                      <form action={toggleAutomationRule}>
                        <input type="hidden" name="id" value={rule.id} />
                        <input type="hidden" name="isActive" value={rule.isActive ? "false" : "true"} />
                        <button className="rounded-xl border px-3 py-1 text-[10px] font-bold">
                          {rule.isActive ? "Pasifleştir" : "Aktifleştir"}
                        </button>
                      </form>
                      <form action={dryRunAutomationRuleAction} className="flex flex-wrap gap-1">
                        <input type="hidden" name="id" value={rule.id} />
                        <input type="hidden" name="triggerType" value={rule.triggerType} />
                        <input type="hidden" name="entityType" value="lead" />
                        <input type="hidden" name="entityId" value="sample-entity" />
                        <input type="hidden" name="source" value="instagram" />
                        <input type="hidden" name="product" value="ODK" />
                        <input type="hidden" name="severity" value="high" />
                        <input type="hidden" name="ownerEmpty" value="true" />
                        <button className="rounded-xl border px-3 py-1 text-[10px] font-bold">Dry-run</button>
                      </form>
                    </>
                  ) : null}
                </div>
              </div>
              {rule.executions.map((execution) => (
                <p key={execution.id} className="mt-2 border-t pt-2 text-[10px]">
                  {execution.dryRun ? "DRY · " : ""}
                  {execution.result}
                  {execution.matched ? " · eşleşti" : " · eşleşmedi"} · {execution.durationMs} ms · {dt.format(execution.createdAt)}
                  {execution.errorCode ? ` · ${execution.errorCode}` : ""}
                </p>
              ))}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--site-line)] px-5 py-10 text-center text-sm text-[var(--site-muted)]">
          Otomasyon kuralı yok.
        </div>
      )}
    </div>
  );
}
