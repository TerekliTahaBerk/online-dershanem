"use client";
import { useSearchParams } from "next/navigation";

export function ExportButton({ entity, label = "Excel" }: { entity: string; label?: string }) {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const href = `/api/panel/export/${entity}${q ? `?q=${encodeURIComponent(q)}` : ""}`;
  return (
    <a href={href} className="od-btn od-btn-ghost od-btn-sm" download>
      ⬇ {label}
    </a>
  );
}
