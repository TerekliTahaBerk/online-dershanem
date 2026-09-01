"use client";

export function SuggestionReviewButtons({ suggestionId }: { suggestionId: string }) {
  async function review(decision: "ACCEPTED" | "REJECTED") {
    await fetch(`/api/panel/kocum/suggestions/${suggestionId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, applyTasks: decision === "ACCEPTED" }),
    });
    window.location.reload();
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button
        type="button"
        className="panel-quick-action panel-quick-action-primary"
        onClick={() => void review("ACCEPTED")}
      >
        Onayla ve ekle
      </button>
      <button type="button" className="panel-quick-action" onClick={() => void review("REJECTED")}>
        Reddet
      </button>
    </div>
  );
}
