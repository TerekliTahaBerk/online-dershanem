"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ParentOption = { id: string; name: string };
type StudentOption = { id: string; name: string };

export function StudentParentLinkForm({
  studentId,
  students,
  parents,
}: {
  studentId?: string;
  students?: StudentOption[];
  parents: ParentOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setBusy(true);
        setError("");
        const response = await fetch("/api/panel/relationships", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            parentId: data.get("parentId"),
            studentId: studentId || data.get("studentId"),
            relationship: data.get("relationship"),
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(result.error || "Veli bağlantısı kurulamadı.");
          setBusy(false);
          return;
        }
        setBusy(false);
        router.refresh();
      }}
    >
      {!studentId ? (
        <div className="min-w-[220px] flex-1">
          <label className="sr-only" htmlFor="studentId">
            Öğrenci hesabı
          </label>
          <select id="studentId" name="studentId" required defaultValue="" className="panel-input py-2 text-xs">
            <option value="">Öğrenci seçin</option>
            {(students || []).map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="min-w-[220px] flex-1">
        <label className="sr-only" htmlFor="parentId">
          Veli hesabı
        </label>
        <select id="parentId" name="parentId" required defaultValue="" className="panel-input py-2 text-xs">
          <option value="">Veli seçin</option>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[180px] flex-1">
        <label className="sr-only" htmlFor="relationship">
          Yakınlık
        </label>
        <input
          id="relationship"
          name="relationship"
          className="panel-input py-2 text-xs"
          placeholder="Yakınlık (anne, baba...)"
        />
      </div>
      <button
        type="submit"
        disabled={busy || parents.length === 0 || (!studentId && (students || []).length === 0)}
        className="rounded-[10px] bg-dc-brand px-3.5 py-2 text-[12.5px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Bağlanıyor..." : "Veli bağla"}
      </button>
      {error ? <p className="w-full text-[12px] text-[#C2493D]">{error}</p> : null}
    </form>
  );
}
