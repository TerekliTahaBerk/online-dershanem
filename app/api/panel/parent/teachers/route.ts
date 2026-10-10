import { MOBILE_PARENT_CONTRACT_VERSION } from "@/lib/mobile-contracts/parent";
import { listParentVisibleTeachers } from "@/lib/panel/student-teacher-server";
import { staffName } from "@/lib/mobile/parent-views";
import { parentJson, requireParentChild } from "@/lib/panel/parent-api";

/**
 * Veli · Öğretmenler — `listParentVisibleTeachers` (web ile aynı). Yalnız
 * branş, ad ve biyografi; e-posta, telefon, iç not, atama yönetimi yok.
 * Kimlik olarak öğretmen kullanıcı kimliği değil atama kimliği döner.
 */
export async function GET(request: Request) {
  const scope = await requireParentChild(request);
  if (!scope.ok) return scope.response;
  const available = scope.child.products.includes("OD");
  const teachers = available ? await listParentVisibleTeachers(scope.child.id) : [];
  return parentJson({
    contractVersion: MOBILE_PARENT_CONTRACT_VERSION,
    studentId: scope.child.id,
    available,
    teachers: teachers.map((teacher) => ({ id: teacher.assignmentId, subject: teacher.subject, name: staffName(teacher.teacherName), bio: teacher.bio?.trim() || null })),
  });
}
