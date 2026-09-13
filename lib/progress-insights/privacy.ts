import type { ProgressInsightBundle } from "@/lib/progress-insights/types";
import { buildNarrativeForAudience } from "@/lib/progress-insights/narrative";

/**
 * Veli sakin paneli: risk skoru, müdahale ve teşhis dili strip edilir.
 * Akademik + davranışsal veriler kalır; anlatım `parent_calm` ile yeniden yazılır.
 */
export function stripForParentCalm(
  bundle: ProgressInsightBundle,
): ProgressInsightBundle {
  const cleaned: ProgressInsightBundle = {
    ...bundle,
    riskHint: undefined,
    narrative: [],
  };
  return {
    ...cleaned,
    narrative: buildNarrativeForAudience(cleaned, "parent_calm"),
  };
}

/** Parent bundle'ta risk alanının olmadığını doğrular (test yardımcı). */
export function assertNoRiskLeak(bundle: ProgressInsightBundle): boolean {
  if (bundle.riskHint) return false;
  const joined = bundle.narrative.join(" ").toLocaleLowerCase("tr-TR");
  if (joined.includes("risk skoru")) return false;
  if (joined.includes("müdahale vakası")) return false;
  if (/\brisk\b/i.test(joined) && joined.includes("skor")) return false;
  return true;
}
