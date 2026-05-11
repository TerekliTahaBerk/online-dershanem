/**
 * Smart filter parser — kullanıcı doğal dilde yazdığında ("riskli ve bu hafta")
 * tekrar eden filter chip'lerine çevirir.
 *
 * Hafif regex tabanlı; dile özel (TR) sözlük.
 *
 * Tasarım: pure function, side-effect yok. UI tarafında DataTable toolbar'ında
 * input → parser → chip listesi → filter map.
 */

export type SmartFilterToken =
  | { kind: "status"; value: string; label: string }
  | { kind: "risk"; value: "low" | "medium" | "high"; label: string }
  | { kind: "dateRange"; from: Date; to: Date; label: string }
  | { kind: "type"; value: string; label: string };

const RE_RISK_HIGH = /\b(riskli|kritik|yüksek risk|high risk)\b/i;
const RE_RISK_MED = /\b(orta risk|medium risk)\b/i;
const RE_RISK_LOW = /\b(düşük risk|sağlıklı|low risk)\b/i;
const RE_ACTIVE = /\b(aktif|active)\b/i;
const RE_INACTIVE = /\b(pasif|inaktif|inactive)\b/i;
const RE_TODAY = /\b(bugün|today)\b/i;
const RE_YESTERDAY = /\b(dün|yesterday)\b/i;
const RE_THIS_WEEK = /\b(bu hafta|this week)\b/i;
const RE_LAST_WEEK = /\b(geçen hafta|last week)\b/i;
const RE_THIS_MONTH = /\b(bu ay|this month)\b/i;
const RE_LAST_MONTH = /\b(geçen ay|last month)\b/i;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

export function parseSmartFilter(input: string): SmartFilterToken[] {
  if (!input.trim()) return [];
  const tokens: SmartFilterToken[] = [];
  const now = new Date();

  // Risk
  if (RE_RISK_HIGH.test(input)) {
    tokens.push({ kind: "risk", value: "high", label: "Riskli" });
  } else if (RE_RISK_MED.test(input)) {
    tokens.push({ kind: "risk", value: "medium", label: "Orta risk" });
  } else if (RE_RISK_LOW.test(input)) {
    tokens.push({ kind: "risk", value: "low", label: "Düşük risk" });
  }

  // Status
  if (RE_ACTIVE.test(input)) {
    tokens.push({ kind: "status", value: "ACTIVE", label: "Aktif" });
  } else if (RE_INACTIVE.test(input)) {
    tokens.push({ kind: "status", value: "INACTIVE", label: "Pasif" });
  }

  // Date ranges
  if (RE_TODAY.test(input)) {
    tokens.push({ kind: "dateRange", from: startOfDay(now), to: endOfDay(now), label: "Bugün" });
  } else if (RE_YESTERDAY.test(input)) {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    tokens.push({ kind: "dateRange", from: startOfDay(y), to: endOfDay(y), label: "Dün" });
  } else if (RE_THIS_WEEK.test(input)) {
    const day = now.getDay() || 7; // Pazartesi başlangıç (1)
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day - 1));
    tokens.push({ kind: "dateRange", from: startOfDay(monday), to: endOfDay(now), label: "Bu hafta" });
  } else if (RE_LAST_WEEK.test(input)) {
    const day = now.getDay() || 7;
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - day);
    const lastMonday = new Date(lastSunday);
    lastMonday.setDate(lastSunday.getDate() - 6);
    tokens.push({ kind: "dateRange", from: startOfDay(lastMonday), to: endOfDay(lastSunday), label: "Geçen hafta" });
  } else if (RE_THIS_MONTH.test(input)) {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    tokens.push({ kind: "dateRange", from: startOfDay(first), to: endOfDay(now), label: "Bu ay" });
  } else if (RE_LAST_MONTH.test(input)) {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    tokens.push({ kind: "dateRange", from: startOfDay(first), to: endOfDay(last), label: "Geçen ay" });
  }

  return tokens;
}

/** Token'ları okunabilir özet string'e çevirir. */
export function summarizeTokens(tokens: SmartFilterToken[]): string {
  if (tokens.length === 0) return "Filtre yok";
  return tokens.map((t) => t.label).join(" • ");
}
