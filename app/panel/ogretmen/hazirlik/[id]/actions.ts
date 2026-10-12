"use server";
import { revalidatePath } from "next/cache";
import { requireTeacherStaffPermission } from "@/lib/auth/guards";
import { enforceMutation } from "@/lib/security/mutation-guard";
import { coachRecordSchema, coachGoalSchema, recordCoachSession, setCoachGoal } from "@/lib/panel/coach-preparation-server";
import { runEducationMutation } from "@/lib/panel/education-write";

export async function recordCoachingSession(formData: FormData) {
  const session = await requireTeacherStaffPermission("ok:coaching:write");
  await enforceMutation({ action: "coaching.session.record", userId: session.userId, requireSameOrigin: true, rateLimit: { max: 60, windowMs: 60_000 } });
  const values = Object.fromEntries(formData);
  const nextDate = values.nextAt ? new Date(String(values.nextAt)) : null;
  if (nextDate && Number.isNaN(nextDate.getTime())) return;
  const parsed = coachRecordSchema.safeParse({ studentId: values.studentId, focus: values.focus, sharedNote: values.sharedNote, privateNote: values.privateNote, nextAt: nextDate?.toISOString() });
  if (!parsed.success) return;
  await runEducationMutation({ key: null, digest: "", actorId: session.userId, action: "coaching.session.record", kind: "coaching", targetKind: "student", execute: async (db) => Response.json(await recordCoachSession(parsed.data, session.userId, db)) });
  revalidatePath(`/panel/ogretmen/hazirlik/${parsed.data.studentId}`);
}
export async function setStudentGoal(formData: FormData) {
  const session = await requireTeacherStaffPermission("ok:coaching:write");
  await enforceMutation({ action: "coaching.goal.set", userId: session.userId, requireSameOrigin: true, rateLimit: { max: 60, windowMs: 60_000 } });
  const values = Object.fromEntries(formData);
  if (!String(values.targetValue ?? "").trim()) return;
  const parsed = coachGoalSchema.safeParse({ studentId: values.studentId, kind: values.kind, subjectName: values.subjectName, targetValue: Number(String(values.targetValue).replace(",", ".")), nearTermNote: values.nearTermNote });
  if (!parsed.success) return;
  await runEducationMutation({ key: null, digest: "", actorId: session.userId, action: "coaching.goal.set", kind: "coaching", targetKind: "student", execute: async (db) => Response.json(await setCoachGoal(parsed.data, session.userId, db)) });
  revalidatePath(`/panel/ogretmen/hazirlik/${parsed.data.studentId}`);
}
