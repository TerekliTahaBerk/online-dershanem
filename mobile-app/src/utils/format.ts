/** Para formatlama (kuruş → TL). */
export function fmtMoney(cents: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100));
}

export function fmtPercent(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "percent",
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function fmtNumber(value: number, fractionDigits = 1): string {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
