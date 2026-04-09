import type { LeadSubmissionInput, PurchaseSubmissionInput } from "@/lib/form-types";

async function submitJson<TPayload>(url: string, payload: TPayload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Form gönderimi başarısız.");
  }
}

export function submitLeadSubmission(payload: LeadSubmissionInput) {
  return submitJson("/api/leads", payload);
}

export function submitPurchaseSubmission(payload: PurchaseSubmissionInput) {
  return submitJson("/api/purchases", payload);
}
