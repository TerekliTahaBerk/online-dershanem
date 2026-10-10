"use client";

/** Öğrencinin haftalık plan tercih alanlarını davranış değiştirmeden sunar. */
import type { PreferenceFieldsProps } from "./types";
import { days } from "./constants";

export function PreferenceFields({
  preference,
  setPreference,
}: PreferenceFieldsProps) {
  return (
    <>
      <div>
        <span className="block text-[12.5px] font-medium text-pn-text-secondary">Çalışmak istediğim günler</span>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {days.map((day) => (
            <button
              key={day.id}
              type="button"
              aria-pressed={preference.availableDays.includes(day.id)}
              onClick={() =>
                setPreference((current) => ({
                  ...current,
                  availableDays: current.availableDays.includes(day.id)
                    ? current.availableDays.filter((id) => id !== day.id)
                    : [...current.availableDays, day.id].sort(),
                }))
              }
              className={`rounded-xl px-2 py-2 text-xs font-bold ${
                preference.availableDays.includes(day.id)
                  ? "bg-(--brand-olive) text-white"
                  : "bg-(--site-bg-warm)"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>
      <label className="mt-4 block">
        <span className="block text-[12.5px] font-medium text-pn-text-secondary">Bir günde ayırabileceğim süre</span>
        <select
          className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-2"
          value={preference.minutesPerDay}
          onChange={(event) =>
            setPreference({
              ...preference,
              minutesPerDay: Number(event.target.value),
            })
          }
        >
          {[20, 30, 45, 60, 90].map((value) => (
            <option key={value} value={value}>
              {value} dakika
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <label>
          <span className="block text-[12.5px] font-medium text-pn-text-secondary">Yaklaşan sınav türü</span>
          <select
            className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-2"
            value={preference.examLabel || ""}
            onChange={(event) =>
              setPreference({
                ...preference,
                examLabel: event.target.value || null,
              })
            }
          >
            <option value="">Yok</option>
            {["LGS", "TYT", "AYT", "YDT", "OKUL SINAVI"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="block text-[12.5px] font-medium text-pn-text-secondary">Tarih</span>
          <input
            type="date"
            className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-2"
            disabled={!preference.examLabel}
            value={preference.nextExamAt?.slice(0, 10) || ""}
            onChange={(event) =>
              setPreference({
                ...preference,
                nextExamAt: event.target.value || null,
              })
            }
          />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="block text-[12.5px] font-medium text-pn-text-secondary">
          Bu planın yoğunluğu sana nasıl geliyor?
        </span>
        <select
          className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-2"
          value={preference.overwhelmPulse || ""}
          onChange={(event) =>
            setPreference({
              ...preference,
              overwhelmPulse: event.target.value
                ? Number(event.target.value)
                : null,
            })
          }
        >
          <option value="">Yanıtlamak istemiyorum</option>
          <option value="1">Çok rahat</option>
          <option value="2">Rahat</option>
          <option value="3">Dengeli</option>
          <option value="4">Biraz fazla</option>
          <option value="5">Fazla</option>
        </select>
      </label>
      <label className="mt-4 flex items-start gap-3 rounded-xl bg-(--site-bg-warm) p-3 text-xs">
        <input
          type="checkbox"
          checked={preference.planningEnabled}
          onChange={(event) =>
            setPreference({
              ...preference,
              planningEnabled: event.target.checked,
            })
          }
        />
        <span>
          <strong className="block">Haftalık plan önerisi açık</strong>
          <span className="mt-1 block text-(--site-muted)">
            İstediğin zaman kapatabilirsin; şimdiye kadarki kayıtların silinmez.
          </span>
        </span>
      </label>
    </>
  );
}
