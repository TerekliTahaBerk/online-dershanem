/**
 * Phase 3 / Session 1 — Student onboarding card.
 *
 * Renders the derived onboarding checklist + quick actions for the admin
 * working on a single student. Lives above the 360 tab bar on
 * `/panel/admin/ogrenciler/[id]`.
 *
 * Server component. Imports Prisma via the helper but does not run new DB
 * queries beyond what the parent page already fetched — caller passes
 * pre-loaded data.
 */
import { Card, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import {
  deriveStudentOnboardingChecklist,
  summarizeOnboardingChecklist,
  deriveUserAccountState,
  getUserAccountStateLabel,
  getUserAccountStateTone,
  type StudentOnboardingChecklistInput,
} from "@/lib/panel/account-onboarding";
import { StudentAccountActions } from "./student-account-actions";

type Props = {
  studentId: string;
  input: StudentOnboardingChecklistInput;
  hasAccount: boolean;
};

export function StudentOnboardingCard({ studentId, input, hasAccount }: Props) {
  const items = deriveStudentOnboardingChecklist(input);
  const summary = summarizeOnboardingChecklist(items);
  const accountState = deriveUserAccountState(input.user);
  const accountTone = getUserAccountStateTone(accountState);
  const accountLabel = getUserAccountStateLabel(accountState);

  // Map our checklist severity tone to Badge tones.
  const toneFor = (item: ReturnType<typeof deriveStudentOnboardingChecklist>[number]) => {
    if (item.done) return "ok" as const;
    return item.severity === "required" ? "warn" as const : "neutral" as const;
  };

  return (
    <Card>
      <CardBody>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>Onboarding durumu</h3>
            <div style={{ marginTop: 4, fontSize: 13, color: "var(--od-muted)" }}>
              {summary.requiredDone}/{summary.requiredTotal} zorunlu, {summary.done}/{summary.total} toplam adım tamamlandı
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Badge tone={summary.isComplete ? "ok" : "warn"}>
              {summary.isComplete ? "Onboarding tamam" : "Eksik adım var"}
            </Badge>
            <Badge tone={accountTone === "good" ? "ok" : accountTone === "bad" ? "bad" : accountTone === "warn" ? "warn" : "neutral"}>
              Hesap: {accountLabel}
            </Badge>
          </div>
        </div>

        <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "grid", gap: 8 }}>
          {items.map((item) => (
            <li
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                alignItems: "center",
                gap: 12,
                padding: "8px 12px",
                background: "var(--od-surface-alt)",
                borderRadius: 6,
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: item.done ? "var(--od-ok-bg, #d1fae5)" : "var(--od-warn-bg, #fef3c7)",
                  color: item.done ? "var(--od-ok-text, #065f46)" : "var(--od-warn-text, #92400e)",
                  fontSize: 14,
                }}
              >
                {item.done ? "✓" : "•"}
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</div>
                {item.hint && !item.done ? (
                  <div style={{ fontSize: 12, color: "var(--od-muted)", marginTop: 2 }}>{item.hint}</div>
                ) : null}
              </div>
              <Badge tone={toneFor(item)}>
                {item.severity === "required" ? "Zorunlu" : "Önerilen"}
              </Badge>
            </li>
          ))}
        </ul>

        <StudentAccountActions
          studentId={studentId}
          hasAccount={hasAccount}
          accountState={accountState}
        />
      </CardBody>
    </Card>
  );
}
