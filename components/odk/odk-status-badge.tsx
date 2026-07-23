import { statusToneClasses, type OdkStatusTone } from "@/lib/odk/presentation";

export function OdkStatusBadge({ label, tone = "neutral", pulse = false }: { label: string; tone?: OdkStatusTone; pulse?: boolean }) {
  return (
    <span className={`inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusToneClasses[tone]}`}>
      {pulse ? <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse" aria-hidden="true" /> : null}
      {label}
    </span>
  );
}
