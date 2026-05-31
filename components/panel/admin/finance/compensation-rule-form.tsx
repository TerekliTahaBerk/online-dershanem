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
    <form action={action} className="od-finance-card">
      <div className="od-finance-form-grid">
        {!isEdit ? (
          <label className="full">
            <span>Öğretmen *</span>
            <select
              name="teacherId"
              required
              defaultValue={defaults?.teacherId ?? ""}
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
        <label>
          <span>Saatlik Ücret (₺) *</span>
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
          />
        </label>
        <label>
          <span>Ders (opsiyonel)</span>
          <select name="courseId" defaultValue={defaults?.courseId ?? ""}>
            <option value="">Tümü</option>
            {options.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Sınıf (opsiyonel)</span>
          <select
            name="classroomId"
            defaultValue={defaults?.classroomId ?? ""}
          >
            <option value="">Tümü</option>
            {options.classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Başlangıç</span>
          <input
            type="date"
            name="startsAt"
            defaultValue={dateInputValue(defaults?.startsAt)}
          />
        </label>
        <label>
          <span>Bitiş</span>
          <input
            type="date"
            name="endsAt"
            defaultValue={dateInputValue(defaults?.endsAt)}
          />
        </label>
        <label className="full">
          <span>Not</span>
          <textarea name="note" rows={2} defaultValue={defaults?.note ?? ""} />
        </label>
        <label className="full checkbox-row">
          <input
            type="checkbox"
            name="isActive"
            value="1"
            defaultChecked={defaults?.isActive ?? true}
          />
          <span style={{ margin: 0 }}>Aktif</span>
        </label>
      </div>
      <div style={{ marginTop: 14 }}>
        <button type="submit" className="od-btn dark sm">
          {isEdit ? "Güncelle" : "Kural Oluştur"}
        </button>
      </div>
    </form>
  );
}
