import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/**
 * Tüm E2E erişilebilirlik taramalarının TEK etiket listesi.
 *
 * Etiketler spec dosyalarına tek tek kopyalanınca WCAG sürümü yükseltmesi
 * bazı dosyalarda unutuluyordu; liste burada bir kez tanımlanır.
 */
export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

type AxeViolations = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"];

export function accessibilityScan(page: Page): AxeBuilder {
  return new AxeBuilder({ page }).withTags(WCAG_TAGS);
}

/** İhlalleri kural + etki + ilk hedefler olarak okunur tek metne indirger. */
export function describeViolations(violations: AxeViolations): string {
  return violations
    .map((violation) => {
      const targets = violation.nodes
        .slice(0, 5)
        .map((node) => `    - ${node.target.join(" ")} :: ${node.failureSummary?.split("\n").slice(1).join(" ").trim() ?? ""}`)
        .join("\n");
      return `  [${violation.impact}] ${violation.id} (${violation.nodes.length} düğüm) — ${violation.help}\n${targets}`;
    })
    .join("\n");
}
