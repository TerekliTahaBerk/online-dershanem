import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { getStudentGoals } from "@/lib/panel/goals";
import { getStudentCoaching } from "@/lib/panel/coaching";

/**
 * Öğrenci Hedefler verisi — JSON karşılığı.
 *
 * `app/panel/ogrenci/hedefler/page.tsx` ile AYNI iki fonksiyonu çağırır
 * (`getStudentGoals`, `getStudentCoaching`) — hesap ikinci kez YAZILMADI.
 * ÜRÜN KAPSAMI web'deki gibi Online Koçum (OK) — `requireApiRole` (yalnız
 * OD) DEĞİL, `requireApiProductRole("OK", ...)` kullanılır.
 */
export async function GET() {
  const auth = await requireApiProductRole("OK", "STUDENT");
  if (!auth.ok) return auth.response;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: auth.session.userId },
    select: { id: true, targetGoal: true, targetRank: true, classLevel: true },
  });
  if (!profile) {
    return NextResponse.json({ profile: null, coachName: null, examLine: "", targetRank: null, goals: [] });
  }

  const [goals, coaching] = await Promise.all([
    getStudentGoals(profile.id),
    getStudentCoaching(profile.id),
  ]);

  const examLine = [profile.targetGoal, profile.classLevel].filter(Boolean).join(" · ");

  return NextResponse.json({
    profile: { id: profile.id },
    coachName: coaching?.coachName ?? null,
    examLine,
    targetRank: profile.targetRank,
    goals,
  });
}
