/**
 * Phase 2 / Session 11 — Compensation rule create/edit form.
 */
import {
  createCompensationRuleAction,
  updateCompensationRuleAction,
} from "@/app/panel/admin/ogretmen-hakedisleri/_actions";

export type CompensationRuleFormOptions = {
  teachers: Array<{ id: string; fullName: string }>;
  courses: Array<{ id: string; title: string }>;
  classrooms: Array<{ id: string; name: string }>;
};

export type CompensationRuleFormDefaults = {
  id?: string;
  teacherId?: string;
  courseId?: string | null;
  classroomId?: string | null;
  hourlyRateKurus?: number;
  isActive?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  note?: string | null;
};

function dateInputValue(d?: Date | null): string {
  if (!d) return "";
  const iso = new Date(d).toISOString();
  return iso.slice(0, 10);
}

export function CompensationRuleForm({
  options,
  defaults,
}: {
  options: CompensationRuleFormOptions;
  defaults?: CompensationRuleFormDefaults;
}) {
  const isEdit = !!defaults?.id;
  const action = isEdit
    ? updateCompensationRuleAction.bind(null, defaults!.id!)
    : createCompensationRuleAction;
  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!isEdit ? (
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Öğretmen *</span>
            <select
              name="teacherId"
              required
              defaultValue={defaults?.teacherId ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">— Seçilmedi —</option>
              {options.teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Saatlik Ücret (₺) *</span>
          <input
            name="hourlyRate"
            required
            inputMode="decimal"
            defaultValue={
              defaults?.hourlyRateKurus
                ? (defaults.hourlyRateKurus / 100).toFixed(2)
                : ""
            }
            placeholder="350.00"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Ders (opsiyonel)</span>
          <select
            name="courseId"
            defaultValue={defaults?.courseId ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Tümü</option>
            {options.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Sınıf (opsiyonel)</span>
          <select
            name="classroomId"
            defaultValue={defaults?.classroomId ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Tümü</option>
            {options.classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Başlangıç</span>
          <input
            type="date"
            name="startsAt"
            defaultValue={dateInputValue(defaults?.startsAt)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Bitiş</span>
          <input
            type="date"
            name="endsAt"
            defaultValue={dateInputValue(defaults?.endsAt)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Not</span>
          <textarea
            name="note"
            rows={2}
            defaultValue={defaults?.note ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            value="1"
            defaultChecked={defaults?.isActive ?? true}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span>Aktif</span>
        </label>
      </div>
      <div className="pt-2">
        <button
          type="submit"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          {isEdit ? "Güncelle" : "Kural Oluştur"}
        </button>
      </div>
    </form>
  );
}
