/** Web seçicisindeki pilot grup ayrıntısı (öğretmen · öğrenci · veli sayısı). Saf; web ve mobil projeksiyonu kullanır. */
export function pilotGroupDetail(group: { teacher: { fullName: string | null; email: string }; enrollments: { student: { parents: { parentId: string }[] } }[] }) {
  return `${group.teacher.fullName || group.teacher.email} · ${group.enrollments.length} öğrenci · ${new Set(group.enrollments.flatMap((item) => item.student.parents.map((link) => link.parentId))).size} veli`;
}
