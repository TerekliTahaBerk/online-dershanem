import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncStudentFromLeadSubmission } from "@/lib/student-sync";
import { sendLeadSubmissionNotification } from "@/lib/email";
import { leadSubmissionSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = leadSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz form verisi." }, { status: 400 });
    }

    const { formType: _formType, notes: _notes, ...leadData } = parsed.data;
    const submission = await prisma.leadSubmission.create({
      data: {
        ...leadData,
        submittedAt: new Date(parsed.data.submittedAt)
      }
    });

    await sendLeadSubmissionNotification({
      fullName: submission.fullName,
      phone: submission.phone,
      classLevel: submission.classLevel,
      examType: submission.examType,
      targetGoal: submission.targetGoal,
      currentNet: submission.currentNet,
      parentPhone: submission.parentPhone,
      source: submission.source,
      submittedAt: submission.submittedAt,
    });

    void syncStudentFromLeadSubmission(submission.id);

    return NextResponse.json({ id: submission.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lead kaydı sırasında hata oluştu." }, { status: 500 });
  }
}
