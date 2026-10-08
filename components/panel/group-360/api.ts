/** Grup 360 istemci adalarının ortak fetch yardımcıları (tarayıcıda çalışır). */

export async function patchGroup(groupId: string, body: unknown) {
  const response = await fetch(`/api/panel/groups/${groupId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "İşlem tamamlanamadı.");
  return result;
}

export async function postMembers(groupId: string, body: unknown) {
  const response = await fetch(`/api/panel/groups/${groupId}/members`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "İşlem tamamlanamadı.");
  return result;
}
