import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { checkInLabels } from "@/lib/student-check-in";
import { hasProductAccess } from "@/lib/auth/products";
import { HELP_ACTIONS, MOBILE_STAFF_CONTRACT_VERSION } from "@/lib/mobile-contracts/staff";
import { loadTeacherHelpInbox } from "@/lib/panel/teacher-help-server";
import { displayName } from "@/lib/mobile/staff-views";
import { requireStaffApi, staffFeatureDisabled, staffJson } from "@/lib/panel/staff-api";

/**
 * Yardım kutusu — `studentCheckIn`; web `app/panel/ogretmen/yardim` ile AYNI
 * yükleyici (`teacherHelpScope`: yalnız `shareWithTeacher = true`).
 *
 * Kapı: mevcut YANIT ucu `requireApiOdRole("TEACHER")` ister; okuma ucu da
 * aynı OD öğretmen ürün kapısını + `od:lesson:teach` kullanır (yanıttan geniş
 * değil). Not: web menüsünde öğe Yön çalışma alanında görünür; yalnız Yön
 * erişimi olan koç (enforce) bu kutuyu mobilde göremez — web ile aynı yanıt
 * kısıtı (m7-staff-permission-review S-3). Enerji / güven yanıtları gönderilmez.
 */
export async function GET() {
  const auth = await requireStaffApi("OD", "od:lesson:teach");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().studentCheckIn) return staffFeatureDisabled("Yardım kutusu henüz açık değil.");
  const [items, canRespond] = await Promise.all([loadTeacherHelpInbox(auth.session.userId), hasProductAccess(auth.session.userId, auth.session.role, "OD")]);
  return staffJson({
    contractVersion: MOBILE_STAFF_CONTRACT_VERSION,
    canRespond,
    actions: HELP_ACTIONS.map((value) => ({ value, label: checkInLabels.action[value] })),
    items: items.map((item) => ({
      id: item.id,
      version: item.version,
      studentName: displayName(item.student.user),
      groupName: item.group?.name ?? "Yön Koçluk",
      barrierLabel: checkInLabels.barrier[item.checkIn.barrier],
      status: item.status as "OPEN" | "RESPONDED",
      dueAt: item.dueAt.toISOString(),
      responseLabel: item.responses[0]?.action ? checkInLabels.action[item.responses[0].action] : null,
    })),
  });
}
