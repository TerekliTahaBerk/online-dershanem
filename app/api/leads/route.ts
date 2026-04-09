import { prisma } from "@/lib/prisma";
import { leadSubmissionSchema, resolveSubmittedAt } from "@/lib/forms";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = leadSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          ok: false,
          errors: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const lead = await prisma.leadSubmission.create({
      data: {
        ...parsed.data,
        submittedAt: resolveSubmittedAt(parsed.data.submittedAt)
      }
    });

    return Response.json({
      ok: true,
      id: lead.id
    });
  } catch {
    return Response.json(
      {
        ok: false,
        message: "Lead kaydı oluşturulamadı."
      },
      { status: 500 }
    );
  }
}
